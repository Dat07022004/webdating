import express from 'express';
import { createReview, getMyReviews } from '../controllers/review.controller.js';
import { ENV } from '../config/env.js';

const router = express.Router();

const resolveAuthContext = (req) => {
	try {
		const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
		return auth || null;
	} catch (error) {
		if (ENV.NODE_ENV !== 'production') {
			console.warn('Auth resolution failed in development:', error?.message);
			return null;
		}
		throw error;
	}
};

const resolveClerkId = (req, auth) => req.user?.clerkId || auth?.userId || (ENV.NODE_ENV === 'production' ? undefined : req.headers?.['x-clerk-id'] || req.query?.clerkId || req.body?.clerkId);

const sendError = (res, error, fallbackMessage) => {
	const statusCode = Number.isInteger(error?.statusCode)
		? error.statusCode
		: Number.isInteger(error?.status)
			? error.status
			: 500;
	const message = error?.message || fallbackMessage;
	return res.status(statusCode).json({ message });
};

router.get('/me', async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
		const clerkId = resolveClerkId(req, auth);
		const result = await getMyReviews({ clerkId });
		return res.status(200).json(result);
	} catch (error) {
		console.error('getMyReviews error:', error);
		return sendError(res, error, 'Failed to fetch my reviews');
	}
});

router.post('/', async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
		const clerkId = resolveClerkId(req, auth);
		const result = await createReview({ clerkId, payload: req.body });
		return res.status(201).json(result);
	} catch (error) {
		console.error('createReview error:', error);
		return sendError(res, error, 'Failed to create review');
	}
});

export default router;
