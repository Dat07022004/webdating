import {Inngest} from 'inngest';
import { connectDB } from './db.js';
import { User } from '../models/user.model.js';

export const inngest = new Inngest({id:"dating-app"});

const syncUser = inngest.createFunction(
    {id:"sync-user"},
    {event:"clerk/user.created"}, 
    async ({event}) => {
        await connectDB();
        const {id, email_addresses, first_name, last_name, image_url} = event.data;
        const email = email_addresses[0]?.email_address;
        if (!email) {
            throw new Error(`Missing email for Clerk user ${id}`);
        }

        const displayName = `${first_name || ''} ${last_name || ''}`.trim() || 'User';
        const usernameBase = (email.split('@')[0] || `user_${id.slice(-6)}`).toLowerCase();
        const sanitizedUsername = usernameBase.replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';

        const newUser = {
            clerkId: id,
            email,
            username: `${sanitizedUsername}_${id.slice(-6).toLowerCase()}`,
            // Placeholder hash for Clerk-managed auth accounts.
            passwordHash: `clerk_${id}`,
            profile: {
                avatarUrl: image_url || '',
                personalInfo: {
                    name: displayName
                }
            }
        }

        try {
            await User.create(newUser);
        } catch (error) {
            // Duplicate event/user: update basic profile fields instead of failing the job.
            if (error?.code === 11000) {
                await User.updateOne(
                    { clerkId: id },
                    {
                        $set: {
                            email,
                            'profile.avatarUrl': image_url || '',
                            'profile.personalInfo.name': displayName
                        }
                    }
                );
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

        const { id } = event.data;

        await User.deleteOne({ clerkId: id });
    }
);

export const functions = [syncUser, deleteUserFromDB];