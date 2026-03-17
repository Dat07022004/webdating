import express from 'express';
import path from 'path';
import { clerkMiddleware } from '@clerk/express'
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import { serve } from 'inngest/express';
import userRoutes from './routes/user.routes.js';
import healthRoutes from './routes/health.routes.js';

import { functions, inngest } from './config/inngest.js';
import appointmentRoutes from './routes/appointment.routes.js';

const app = express();

const _dirname = path.resolve();
<<<<<<< HEAD
// Helper utilities for onboarding processing
const normalizeEmail = (value) => (value || '').trim().toLowerCase();

const buildDisplayName = (firstName, lastName) =>
    `${firstName || ''} ${lastName || ''}`.trim() || 'User';

const buildUsername = (email, clerkId) => {
    const usernameBase = (email.split('@')[0] || `user_${clerkId.slice(-6)}`).toLowerCase();
    const sanitizedUsername = usernameBase.replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';
    return `${sanitizedUsername}_${clerkId.slice(-6).toLowerCase()}`;
};

const buildOnboardingUpdateDoc = ({
    persistedEmail,
    imageUrl,
    bio,
    displayName,
    age,
    hasValidBirthday,
    birthdayDate,
    gender,
    location,
    interests,
    lookingFor
}) => ({
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
});

// Keep Inngest route before JSON body parsing middleware.
app.use("/api/inngest",serve({client: inngest, functions}));

app.use(express.json());
app.use(clerkMiddleware()) // adds auth object under the req => req.auth
app.use('/api/appointments', appointmentRoutes);

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

        const safeEmail = normalizeEmail(auth?.sessionClaims?.email || email);
        const displayName = buildDisplayName(firstName, lastName);
        const username = buildUsername(safeEmail, clerkId);
        const persistedEmail = safeEmail || `user_${clerkId.slice(-6)}@placeholder.local`;

        const updateDoc = buildOnboardingUpdateDoc({
            persistedEmail,
            imageUrl,
            bio,
            displayName,
            age,
            hasValidBirthday,
            birthdayDate,
            gender,
            location,
            interests,
            lookingFor
        });

        // 1) Update existing record by clerkId first.
        const byClerkId = await User.updateOne(
            { clerkId },
            { $set: updateDoc }
        );
        if (byClerkId.matchedCount > 0) {
            return res.status(200).json({ message: 'Onboarding data saved' });
        }

        // 2) Fallback for rows created before Clerk linkage.
        if (safeEmail) {
            const byEmail = await User.updateOne(
                { email: safeEmail },
                {
                    $set: {
                        clerkId,
                        ...updateDoc
                    }
                }
            );

            if (byEmail.matchedCount > 0) {
                return res.status(200).json({ message: 'Onboarding data saved' });
            }
        }

        // 3) Create if no record exists yet.
        try {
            await User.create({
                clerkId,
                email: persistedEmail,
                username,
                passwordHash: `clerk_${clerkId}`,
                ...(imageUrl ? { profile: { avatarUrl: imageUrl, personalInfo: { name: displayName } } } : {
                    profile: { personalInfo: { name: displayName } }
                })
            });

            await User.updateOne({ clerkId }, { $set: updateDoc });
        } catch (error) {
            if (error?.code === 11000) {
                await User.updateOne({ clerkId }, { $set: updateDoc });
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
    app.use('/api/users', userRoutes);
    app.use('/api', healthRoutes);

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
