import { ENV } from '../config/env.js';
import { saveUserOnboarding } from '../services/user.service.js';

export const onboardUser = async (req, res) => {
    const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
    const fallbackClerkId = ENV.NODE_ENV === 'production' ? undefined : req.body?.clerkId;
    const clerkId = auth?.userId || fallbackClerkId;

    if (!clerkId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        await saveUserOnboarding({ clerkId, auth, body: req.body });
        return res.status(200).json({ message: 'Onboarding data saved' });
    } catch (error) {
        console.error('Onboarding save failed:', error);
        return res.status(500).json({ message: error?.message || 'Failed to save onboarding data' });
    }
};
