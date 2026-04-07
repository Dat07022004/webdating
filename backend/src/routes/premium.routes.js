import express from 'express';
import { createMoMoPayment, getPremiumStatus, momoIPN, momoReturn } from '../controllers/premium.controller.js';

const router = express.Router();

const sendError = (res, error, fallbackMessage) => {
	const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
	const message = error?.message || fallbackMessage;
	return res.status(statusCode).json({ message });
};

const resolveAuthContext = (req) => {
	const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
	return auth || null;
};

const resolveClerkId = (req, auth) => req.user?.clerkId || auth?.userId;

router.post('/create-payment', async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
		const clerkId = resolveClerkId(req, auth);
		if (!clerkId) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const result = await createMoMoPayment({ clerkId, plan: req.body?.plan });
		return res.status(200).json(result);
	} catch (error) {
		console.error('MoMo payment creation failed:', error);
		return sendError(res, error, 'Failed to create payment');
	}
});

// MoMo callback endpoints must be public for provider callbacks.
router.post('/momo-ipn', async (req, res) => {
	try {
		const result = await momoIPN({ payload: req.body || {} });
		return res.status(200).json(result);
	} catch (error) {
		console.error('MoMo IPN handling failed:', error);
		return sendError(res, error, 'Failed to process IPN');
	}
});

router.post('/momo-return', async (req, res) => {
	try {
		const payload = Object.keys(req.body || {}).length ? req.body : req.query || {};
		const result = await momoReturn({ payload });
		return res.status(200).json(result);
	} catch (error) {
		console.error('MoMo return handling failed:', error);
		return sendError(res, error, 'Failed to process return');
	}
});

router.get('/status', async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
		const clerkId = resolveClerkId(req, auth);
		if (!clerkId) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const result = await getPremiumStatus({ clerkId });
		return res.status(200).json(result);
	} catch (error) {
		console.error('Premium status fetch failed:', error);
		return sendError(res, error, 'Failed to fetch premium status');
	}
});

export default router;
