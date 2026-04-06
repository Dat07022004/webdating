import { ENV } from '../config/env.js';

export const requireActiveUser = (req, res, next) => {
  const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
  const fallbackClerkId = ENV.NODE_ENV === 'production'
    ? undefined
    : req.headers['x-clerk-id'] || req.query?.clerkId || req.body?.clerkId;

  const userId = auth?.userId || (typeof fallbackClerkId === 'string' ? fallbackClerkId : undefined);

  if (!auth?.userId && userId) {
    req.auth = () => ({ userId });
  }

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  return next();
};
