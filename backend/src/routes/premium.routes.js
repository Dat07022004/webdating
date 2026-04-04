import express from 'express';
import { requireAuth } from '@clerk/express';
import { ENV } from '../config/env.js';
import { createMoMoPayment, getPremiumStatus, momoIPN, momoReturn } from '../controllers/premium.controller.js';

const router = express.requireAuth ? express.Router().use(requireAuth()) : express.Router();

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

const sendError = (res, error, fallbackMessage) => {
	const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
	const message = error?.message || fallbackMessage;
	return res.status(statusCode).json({ message });
};

router.post('/create-payment', requireAuth(), async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
		const fallbackClerkId = ENV.NODE_ENV === 'production' ? undefined : req.body?.clerkId;
		const clerkId = auth?.userId || fallbackClerkId;
		const result = await createMoMoPayment({ clerkId, plan: req.body?.plan });
		return res.status(200).json(result);
	} catch (error) {
		console.error('MoMo payment creation failed:', error);
		return sendError(res, error, 'Failed to create payment');
	}
});

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

router.get('/status', requireAuth(), async (req, res) => {
	try {
		const auth = resolveAuthContext(req);
		const fallbackClerkId = ENV.NODE_ENV === 'production' ? undefined : req.query?.clerkId;
		const clerkId = auth?.userId || fallbackClerkId;
		const result = await getPremiumStatus({ clerkId });
		return res.status(200).json(result);
	} catch (error) {
		console.error('Premium status fetch failed:', error);
		return sendError(res, error, 'Failed to fetch premium status');
	}
});

export default router;
