import { User } from '../models/user.model.js';
import { isUserActivelyBanned } from '../services/admin.service.js';
import { resolveAuthContext, resolveClerkId } from './auth.helpers.js';


const resolveActiveUserByClerkId = async (clerkId) => {
    const user = await User.findOne({ clerkId });
    if (!user) {
        return { error: { status: 404, message: 'User not found' } };
    }

    const activeBan = await isUserActivelyBanned(user._id);
    if (activeBan) {
        return { error: { status: 403, message: 'Forbidden: Account is banned' } };
    }

    return { user };
};

export const requireActiveUser = async (req, res, next) => {
    try {
        const auth = resolveAuthContext(req);

        // Allow fallback primarily for dev testing
        const clerkId = resolveClerkId(req, auth);

        if (!clerkId) {
            return res.status(401).json({ message: 'Unauthorized: No valid session' });
        }

        const result = await resolveActiveUserByClerkId(clerkId);
        if (result.error) {
            return res.status(result.error.status).json({ message: result.error.message });
        }

        req.user = result.user;
        next();
    } catch (error) {
        console.error('requireActiveUser error:', error);
        res.status(500).json({ message: 'Server error checking user account status' });
    }
};

export const requireAdmin = async (req, res, next) => {
    try {
        const auth = resolveAuthContext(req);
        // Allow fallback primarily for dev testing
        const clerkId = resolveClerkId(req, auth);

        if (!clerkId) {
            return res.status(401).json({ message: 'Unauthorized: No valid session' });
        }

        const result = await resolveActiveUserByClerkId(clerkId);
        if (result.error) {
            return res.status(result.error.status).json({ message: result.error.message });
        }

        const user = result.user;

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

export const requireManagerOrAdmin = async (req, res, next) => {
    try {
        const auth = resolveAuthContext(req);
        // Allow fallback primarily for dev testing
        const clerkId = resolveClerkId(req, auth);

        if (!clerkId) {
            return res.status(401).json({ message: 'Unauthorized: No valid session' });
        }

        const result = await resolveActiveUserByClerkId(clerkId);
        if (result.error) {
            return res.status(result.error.status).json({ message: result.error.message });
        }

        const user = result.user;

        if (!['manager', 'admin'].includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden: Requires manager or admin role' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('requireManagerOrAdmin error:', error);
        res.status(500).json({ message: 'Server error checking manager role' });
    }
};