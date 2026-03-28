import express from 'express';
import { requireAuth } from '@clerk/express';
import { createMoMoPayment, getPremiumStatus, momoIPN, momoReturn } from '../controllers/premium.controller.js';

const router = express.requireAuth ? express.Router().use(requireAuth()) : express.Router();

router.post('/create-payment', requireAuth(), createMoMoPayment);
router.post('/momo-ipn', momoIPN);
router.post('/momo-return', momoReturn);
router.get('/status', requireAuth(), getPremiumStatus);

export default router;
