import { Router } from 'express';
import { reportUser, blockUser, unblockUser, getBlockedUsers } from '../controllers/safety.controller.js';
import { requireActiveUser, resolveAuthContext } from '../middleware/auth.middleware.js';
import { ENV } from '../config/env.js';

const router = Router();

const resolveClerkId = (req, auth) => req.user?.clerkId || auth?.userId || (ENV.NODE_ENV === 'production' ? undefined : req.headers?.['x-clerk-id'] || req.body?.clerkId || req.query?.clerkId);

const sendError = (res, error, fallbackMessage) => {
	const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
	const message = error?.message || fallbackMessage;
	return res.status(statusCode).json({ message });
};

router.use(requireActiveUser);

router.post('/report', async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
		const clerkId = resolveClerkId(req, auth);
		const { reportedId, reason, description } = req.body || {};
		const result = await reportUser({ clerkId, reportedId, reason, description });
		return res.status(200).json(result);
	} catch (error) {
		console.error('reportUser failed:', error);
		return sendError(res, error, 'Failed to submit report');
	}
});

router.post('/block', async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
		const clerkId = resolveClerkId(req, auth);
		const { blockedId } = req.body || {};
		const result = await blockUser({ clerkId, blockedId });
		return res.status(200).json(result);
	} catch (error) {
		console.error('blockUser failed:', error);
		return sendError(res, error, 'Failed to block user');
	}
});

router.post('/unblock', async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
		const clerkId = resolveClerkId(req, auth);
		const { blockedId } = req.body || {};
		const result = await unblockUser({ clerkId, blockedId });
		return res.status(200).json(result);
	} catch (error) {
		console.error('unblockUser failed:', error);
		return sendError(res, error, 'Failed to unblock user');
	}
});

router.get('/blocked-list', async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
		const clerkId = resolveClerkId(req, auth);
		const result = await getBlockedUsers({ clerkId });
		return res.status(200).json(result);
	} catch (error) {
		console.error('getBlockedUsers failed:', error);
		return sendError(res, error, 'Failed to load blocked list');
	}
});

export default router;
