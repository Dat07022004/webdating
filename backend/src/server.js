import express from 'express';
import path from 'path';
import { clerkMiddleware } from '@clerk/express'
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import { serve } from 'inngest/express';
import { User } from './models/user.model.js';

import { functions, inngest } from './config/inngest.js';

const app = express();

const _dirname = path.resolve();

// Keep Inngest route before JSON body parsing middleware.
app.use("/api/inngest",serve({client: inngest, functions}));

app.use(express.json());
app.use(clerkMiddleware()) // adds auth access on req via req.auth()

app.post('/api/users/onboarding', async (req, res) => {
    try {
        const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
        const fallbackClerkId = ENV.NODE_ENV === 'production' ? undefined : req.body?.clerkId;
        const clerkId = auth?.userId || fallbackClerkId;
        if (!clerkId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const {
            email,
            firstName,
            lastName,
            imageUrl,
            birthday,
            gender,
            lookingFor,
            location,
            interests,
            bio
        } = req.body || {};

        const birthdayDate = birthday ? new Date(birthday) : null;
        const hasValidBirthday = !!birthdayDate && !Number.isNaN(birthdayDate.getTime());
        const age = hasValidBirthday
            ? Math.max(0, new Date().getFullYear() - birthdayDate.getFullYear())
            : undefined;

        const safeEmail = email || auth?.sessionClaims?.email;
        const displayName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
        const usernameBase = (safeEmail?.split('@')[0] || `user_${clerkId.slice(-6)}`).toLowerCase();
        const sanitizedUsername = usernameBase.replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';
        const persistedEmail = safeEmail || `user_${clerkId.slice(-6)}@placeholder.local`;

        const updateDoc = {
            email: persistedEmail,
            ...(imageUrl ? { 'profile.avatarUrl': imageUrl } : {}),
            ...(bio !== undefined ? { 'profile.bio': bio } : {}),
            ...(displayName ? { 'profile.personalInfo.name': displayName } : {}),
            ...(age !== undefined ? { 'profile.personalInfo.age': age } : {}),
            ...(hasValidBirthday ? { 'profile.personalInfo.birthday': birthdayDate } : {}),
            ...(gender ? { 'profile.personalInfo.gender': gender } : {}),
            ...(location ? { 'profile.personalInfo.locationText': location } : {}),
            ...(Array.isArray(interests) ? { 'profile.interests': interests } : {}),
            ...(lookingFor ? { 'preferences.preferredGenders': [lookingFor] } : {})
        };

        try {
            await User.findOneAndUpdate(
                { clerkId },
                {
                    $setOnInsert: {
                        clerkId,
                        username: `${sanitizedUsername}_${clerkId.slice(-6).toLowerCase()}`,
                        passwordHash: `clerk_${clerkId}`
                    },
                    $set: updateDoc
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        } catch (error) {
            // Handle existing users created earlier without matching clerkId.
            if (error?.code === 11000 && safeEmail) {
                await User.updateOne(
                    { email: safeEmail },
                    {
                        $set: {
                            clerkId,
                            ...updateDoc
                        }
                    }
                );
            } else {
                throw error;
            }
        }

        return res.status(200).json({ message: 'Onboarding data saved' });
    } catch (error) {
        console.error('Onboarding save failed:', error);
        return res.status(500).json({ message: error?.message || 'Failed to save onboarding data' });
    }
});

app.get("/api/health", (req, res) =>{
    res.status(200).json({ messsage: "OK" });
} );

if(ENV.NODE_ENV === 'production'){
    app.use(express.static(path.join(_dirname, "../frontend/dist"))); 

    app.get("/{*any}", (req, res) => {
        res.sendFile(path.join(_dirname, "../frontend", "dist", "index.html"));
    })
}
const startServer = async () => {
    await connectDB();
    app.listen(ENV.PORT, () => {
        console.log(`Server is running on port ${ENV.PORT}`);
    });
}
startServer();
