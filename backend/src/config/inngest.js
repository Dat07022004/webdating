import {Inngest} from 'inngest';
import { connectDB } from './db.js';
import { User } from '../models/user.model.js';

export const inngest = new Inngest({id:"dating-app"});

const syncUser = inngest.createFunction(
    {id:"sync-user"},
    {event:"clerk/user.created"}, 
    async ({event}) => {
        await connectDB();
        console.log('[sync-user] received event:', event.id);

        const {id, email_addresses, first_name, last_name, image_url} = event.data;
        const email = email_addresses[0]?.email_address?.trim().toLowerCase();
        if (!email) {
            throw new Error(`Missing email for Clerk user ${id}`);
        }

        const displayName = `${first_name || ''} ${last_name || ''}`.trim() || 'User';
        const usernameBase = (email.split('@')[0] || `user_${id.slice(-6)}`).toLowerCase();
        const sanitizedUsername = usernameBase.replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';

        const updatePayload = {
            clerkId: id,
            email,
            username: `${sanitizedUsername}_${id.slice(-6).toLowerCase()}`,
            'profile.avatarUrl': image_url || '',
            'profile.personalInfo.name': displayName
        };

        // Protect existing account linkage: never bind one email to a different Clerk user.
        const conflictByEmail = await User.findOne({ email, clerkId: { $exists: true, $ne: id } });
        if (conflictByEmail) {
            console.warn('[sync-user] email already linked to another clerkId:', email, conflictByEmail.clerkId, id);
            return;
        }

        // Atomic path: upsert by clerkId. This avoids race conditions across duplicate event runs.
        try {
            await User.updateOne(
                { clerkId: id },
                {
                    $set: updatePayload,
                    $setOnInsert: {
                        // Placeholder hash for Clerk-managed auth accounts.
                        passwordHash: `clerk_${id}`
                    }
                },
                { upsert: true }
            );
            console.log('[sync-user] upserted user by clerkId:', id);
        } catch (error) {
            // If email already existed from old/local data, link that row instead of failing.
            if (error?.code === 11000 || /E11000/i.test(error?.message || '')) {
                const fallback = await User.updateOne(
                    {
                        email,
                        $or: [
                            { clerkId: { $exists: false } },
                            { clerkId: null },
                            { clerkId: id }
                        ]
                    },
                    { $set: updatePayload }
                );

                if (fallback.matchedCount) {
                    console.log('[sync-user] duplicate recovered by linking existing email:', id);
                    return;
                }

                throw new Error(`Duplicate key but no safe fallback match for clerkId=${id}, email=${email}`);
            }

            // If passwordHash required causes validation error on upsert in some environments,
            // retry by forcing a create on the found email record path.
            if (error?.name === 'ValidationError') {
                const fallback = await User.updateOne({ email }, { $set: updatePayload });
                if (fallback.matchedCount) {
                    console.log('[sync-user] validation fallback updated by email:', id);
                    return;
                }
                return;
            }

            throw error;
        }
    }
);

const deleteUserFromDB = inngest.createFunction(
    { id: "delete-user-from-db" },
    { event: "clerk/user.deleted" },
    async ({ event }) => {
        await connectDB();

        const { id, email_addresses } = event.data;
        const emails = Array.isArray(email_addresses)
            ? email_addresses.map((item) => item?.email_address).filter(Boolean)
            : [];

        const filter = {
            $or: [
                { clerkId: id },
                ...(emails.length ? [{ email: { $in: emails } }] : [])
            ]
        };

        const result = await User.deleteMany(filter);
        console.log('[delete-user-from-db] deleted count:', result.deletedCount, 'for clerkId:', id, 'emails:', emails);
    }
);

export const functions = [syncUser, deleteUserFromDB];