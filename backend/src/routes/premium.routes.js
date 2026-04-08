import express from 'express';
import { createMoMoPayment, getPremiumStatus, momoIPN, momoReturn } from '../controllers/premium.controller.js';
import { requireActiveUser } from '../middleware/auth.middleware.js';

const router = express.Router();

const sendError = (res, error, fallbackMessage) => {
	const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
	const message = error?.message || fallbackMessage;
	return res.status(statusCode).json({ message });
};

router.post('/create-payment', requireActiveUser, async (req, res) => {
	try {
		const clerkId = req.user?.clerkId;
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

router.get('/status', requireActiveUser, async (req, res) => {
	try {
		const clerkId = req.user?.clerkId;
		const result = await getPremiumStatus({ clerkId });
		return res.status(200).json(result);
	} catch (error) {
		console.error('Premium status fetch failed:', error);
		return sendError(res, error, 'Failed to fetch premium status');
	}
});

export default router;
