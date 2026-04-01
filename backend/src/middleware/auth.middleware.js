import { User } from '../models/user.model.js';
import { ENV } from '../config/env.js';
import { isUserActivelyBanned } from '../services/admin.service.js';

export const resolveAuthContext = (req) => {
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

export const requireAdmin = async (req, res, next) => {
    try {
        const auth = resolveAuthContext(req);
        // Allow fallback primarily for dev testing
        const fallbackClerkId = ENV.NODE_ENV === 'production' ? undefined : req.body?.clerkId || req.query?.clerkId;
        const clerkId = auth?.userId || fallbackClerkId;

        if (!clerkId) {
            return res.status(401).json({ message: 'Unauthorized: No valid session' });
        }

        const user = await User.findOne({ clerkId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const activeBan = await isUserActivelyBanned(user._id);
        if (activeBan) {
            return res.status(403).json({ message: 'Forbidden: Account is banned' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Requires admin role' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('requireAdmin error:', error);
        res.status(500).json({ message: 'Server error checking admin role' });
    }
};
