import { Router } from 'express';
import multer from 'multer';
import { ENV } from '../config/env.js';
import { getMyProfile, onboardUser, updateMyProfile, uploadUserPhotos, getDiscoverUsers, handleUserAction, getConnections } from '../controllers/user.controller.js';
import { requireActiveUser } from '../middleware/auth.middleware.js';

const router = Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		files: 6,
		fileSize: 8 * 1024 * 1024
	}
});

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

const resolveClerkId = (req, auth) => req.user?.clerkId || auth?.userId || (ENV.NODE_ENV === 'production' ? undefined : req.headers?.['x-clerk-id'] || req.body?.clerkId || req.query?.clerkId);

const sendError = (res, error, fallbackMessage) => {
	const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
	const message = error?.message || fallbackMessage;
	return res.status(statusCode).json({ message });
};

router.post('/onboarding', async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
			const clerkId = resolveClerkId(req, auth);
		const result = await onboardUser({ clerkId, auth, body: req.body });
		return res.status(200).json(result);
	} catch (error) {
		console.error('Onboarding save failed:', error);
		return sendError(res, error, 'Failed to save onboarding data');
	}
});

router.post('/photos/upload', upload.array('photos', 6), async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
			const clerkId = resolveClerkId(req, auth);
		const result = await uploadUserPhotos({ clerkId, files: req.files || [] });
		return res.status(200).json(result);
	} catch (error) {
		console.error('Photo upload failed:', error);
		return sendError(res, error, 'Photo upload failed');
	}
});

router.use('/me', requireActiveUser);
router.use('/discover', requireActiveUser);
router.use('/action', requireActiveUser);
router.use('/connections', requireActiveUser);

router.get('/me', async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
			const clerkId = resolveClerkId(req, auth);
			const email = req.user?.email || auth?.sessionClaims?.email || req.query?.email;
		const result = await getMyProfile({ clerkId, email });
		return res.status(200).json(result);
	} catch (error) {
		console.error('Profile fetch failed:', error);
		return sendError(res, error, 'Failed to load profile');
	}
});

router.put('/me', async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
			const clerkId = resolveClerkId(req, auth);
			const email = req.user?.email || auth?.sessionClaims?.email || req.body?.email;
		const result = await updateMyProfile({ clerkId, email, body: req.body || {} });
		return res.status(200).json(result);
	} catch (error) {
		console.error('Profile update failed:', error);
		return sendError(res, error, 'Failed to update profile');
	}
});

router.get('/discover', async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
			const clerkId = resolveClerkId(req, auth);
		const result = await getDiscoverUsers({ clerkId });
		return res.status(200).json(result);
	} catch (error) {
		console.error('Discover user fetch failed:', error?.message, error?.stack);
		const fallbackMessage = ENV.NODE_ENV === 'production'
			? 'Failed to fetch discover users'
			: error?.message || 'Failed to fetch discover users';
		return sendError(res, error, fallbackMessage);
	}
});

router.post('/action', async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
			const clerkId = resolveClerkId(req, auth);
		const { targetUserId, action } = req.body || {};
		const result = await handleUserAction({ clerkId, targetUserId, action });
		return res.status(200).json(result);
	} catch (error) {
		console.error('handleUserAction failed:', error);
		return sendError(res, error, 'Server error');
	}
});

router.get('/connections', async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
			const clerkId = resolveClerkId(req, auth);
		const result = await getConnections({ clerkId });
		return res.status(200).json(result);
	} catch (error) {
		console.error('getConnections failed:', error);
		return sendError(res, error, 'Server error');
	}
});

export default router;
