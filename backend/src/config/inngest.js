import {Inngest} from 'inngest';
import { connectDB } from './db.js';
import { User } from '../models/user.model.js';

export const inngest = new Inngest({id:"dating-app"});

const normalizeEmail = (value) => (value || '').trim().toLowerCase();

const buildDisplayName = (firstName, lastName) =>
    `${firstName || ''} ${lastName || ''}`.trim() || 'User';

const buildUsername = (email, clerkId) => {
    const usernameBase = (email.split('@')[0] || `user_${clerkId.slice(-6)}`).toLowerCase();
    const sanitizedUsername = usernameBase.replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';
    return `${sanitizedUsername}_${clerkId.slice(-6).toLowerCase()}`;
};

const buildSyncUpdatePayload = ({ clerkId, email, imageUrl, displayName }) => ({
    clerkId,
    email,
    username: buildUsername(email, clerkId),
    'profile.avatarUrl': imageUrl || '',
    'profile.personalInfo.name': displayName
});

const syncUser = inngest.createFunction(
    {id:"sync-user"},
    {event:"clerk/user.created"}, 
    async ({event}) => {
        await connectDB();
        console.log('[sync-user] received', {
            eventId: event.id,
            clerkUserId: event.data?.id,
            primaryEmail: event.data?.email_addresses?.[0]?.email_address || null
        });

        const {id, email_addresses, first_name, last_name, image_url} = event.data;
        const email = normalizeEmail(email_addresses[0]?.email_address);
        if (!email) {
            throw new Error(`Missing email for Clerk user ${id}`);
        }

        const displayName = buildDisplayName(first_name, last_name);
        const updatePayload = buildSyncUpdatePayload({
            clerkId: id,
            email,
            imageUrl: image_url,
            displayName
        });

        // If this email existed with an old clerkId, relink it to the current Clerk user.
        const conflictByEmail = await User.findOne({ email, clerkId: { $exists: true, $ne: id } });
        if (conflictByEmail) {
            const relinkResult = await User.updateOne({ email }, { $set: updatePayload });
            console.log('[sync-user] relinked by email', {
                email,
                fromClerkId: conflictByEmail.clerkId,
                toClerkId: id,
                matchedCount: relinkResult.matchedCount,
                modifiedCount: relinkResult.modifiedCount
            });
            return;
        }

        // Atomic path: upsert by clerkId. This avoids race conditions across duplicate event runs.
        try {
            const upsertResult = await User.updateOne(
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
            console.log('[sync-user] upsert by clerkId result', {
                clerkId: id,
                email,
                matchedCount: upsertResult.matchedCount,
                modifiedCount: upsertResult.modifiedCount,
                upsertedCount: upsertResult.upsertedCount,
                upsertedId: upsertResult.upsertedId || null
            });
        } catch (error) {
            // If email already existed from old/local data, link that row instead of failing.
            if (error?.code === 11000 || /E11000/i.test(error?.message || '')) {
                const fallback = await User.updateOne({ email }, { $set: updatePayload });

                if (fallback.matchedCount) {
                    console.log('[sync-user] duplicate recovered by email', {
                        clerkId: id,
                        email,
                        matchedCount: fallback.matchedCount,
                        modifiedCount: fallback.modifiedCount
                    });
                    return;
                }

                throw new Error(`Duplicate key but no safe fallback match for clerkId=${id}, email=${email}`);
            }

            // If passwordHash required causes validation error on upsert in some environments,
            // retry by forcing a create on the found email record path.
            if (error?.name === 'ValidationError') {
                const fallback = await User.updateOne({ email }, { $set: updatePayload });
                if (fallback.matchedCount) {
                    console.log('[sync-user] validation fallback by email', {
                        clerkId: id,
                        email,
                        matchedCount: fallback.matchedCount,
                        modifiedCount: fallback.modifiedCount
                    });
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