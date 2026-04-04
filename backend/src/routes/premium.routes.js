import express from 'express';
import { requireActiveUser } from '../middleware/auth.middleware.js';
import { createMoMoPayment, getPremiumStatus, momoIPN, momoReturn } from '../controllers/premium.controller.js';

const router = express.Router();

router.post('/create-payment', requireActiveUser, createMoMoPayment);
router.post('/momo-ipn', momoIPN);
router.post('/momo-return', momoReturn);
router.get('/status', requireActiveUser, getPremiumStatus);

export default router;
