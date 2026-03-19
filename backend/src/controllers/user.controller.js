import { ENV } from '../config/env.js';
import { saveUserOnboarding, uploadUserPhotosToCloudinary } from '../services/user.service.js';

const resolveAuthContext = (req) => {
    try {
        const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
        return auth || null;
    } catch (error) {
        if (ENV.NODE_ENV !== 'production') {
            console.warn('Auth resolution failed in development, using fallback clerkId when provided:', error?.message || error);
            return null;
        }

        throw error;
    }
};

export const onboardUser = async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const fallbackClerkId = ENV.NODE_ENV === 'production' ? undefined : req.body?.clerkId;
        const clerkId = auth?.userId || fallbackClerkId;

        if (!clerkId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        await saveUserOnboarding({ clerkId, auth, body: req.body });
        return res.status(200).json({ message: 'Onboarding data saved' });
    } catch (error) {
        console.error('Onboarding save failed:', error);
        return res.status(500).json({ message: error?.message || 'Failed to save onboarding data' });
    }
};

export const uploadUserPhotos = async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const fallbackClerkId = ENV.NODE_ENV === 'production' ? undefined : req.body?.clerkId;
        const clerkId = auth?.userId || fallbackClerkId;

        if (!clerkId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const photos = await uploadUserPhotosToCloudinary({ files: req.files || [], clerkId });
        return res.status(200).json({ photos });
    } catch (error) {
        console.error('Photo upload failed:', error);
        return res.status(500).json({ message: error?.message || 'Photo upload failed' });
    }
};
