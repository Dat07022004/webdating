import { ENV } from '../config/env.js';

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

export const resolveClerkId = (req, auth) => {
    const fallbackClerkId = ENV.NODE_ENV === 'production'
        ? undefined
        : req.headers?.['x-clerk-id'] || req.body?.clerkId || req.query?.clerkId;

    return req.user?.clerkId || auth?.userId || fallbackClerkId;
};
