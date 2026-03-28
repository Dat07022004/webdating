import crypto from 'crypto';
import { ENV } from '../config/env.js';
import { PaymentTransaction } from '../models/paymentTransaction.model.js';
import { User } from '../models/user.model.js';

const PLAN_CATALOG = {
    gold: { amount: 149900, durationDays: 30, label: 'Gold' },
    platinum: { amount: 299900, durationDays: 30, label: 'Platinum' }
};

const PENDING_TRANSACTION_TTL_MS = 10 * 60 * 1000;

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

const normalizeBaseUrl = (value) => (value || '').replace(/\/$/, '');

const buildSignature = (rawSignature, secretKey) => {
    return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
};

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const buildCallbackSignature = (payload) => {
    const rawSignature = [
        `accessKey=${ENV.MOMO_ACCESS_KEY}`,
        `amount=${payload.amount ?? ''}`,
        `extraData=${payload.extraData ?? ''}`,
        `message=${payload.message ?? ''}`,
        `orderId=${payload.orderId ?? ''}`,
        `orderInfo=${payload.orderInfo ?? ''}`,
        `orderType=${payload.orderType ?? ''}`,
        `partnerCode=${payload.partnerCode ?? ''}`,
        `payType=${payload.payType ?? ''}`,
        `requestId=${payload.requestId ?? ''}`,
        `responseTime=${payload.responseTime ?? ''}`,
        `resultCode=${payload.resultCode ?? ''}`,
        `transId=${payload.transId ?? ''}`
    ].join('&');

    return buildSignature(rawSignature, ENV.MOMO_SECRET_KEY || '');
};

const processMomoCallback = async (payload) => {
    if (!payload?.signature || !payload?.orderId) {
        return { ok: false, status: 400, message: 'Invalid callback payload' };
    }

    const expectedSignature = buildCallbackSignature(payload);
    if (expectedSignature !== payload.signature) {
        return { ok: false, status: 400, message: 'Invalid signature' };
    }

    const transaction = await PaymentTransaction.findOne({ orderId: payload.orderId });
    if (!transaction) {
        return { ok: false, status: 404, message: 'Transaction not found' };
    }

    if (transaction.status === 'success') {
        return { ok: true, status: 200, payload: { status: 'success', message: 'Already processed' } };
    }

    const resultCode = Number(payload.resultCode);
    const status = resultCode === 0 ? 'success' : 'failed';
    transaction.status = status;
    transaction.transactionId = payload.transId ? String(payload.transId) : '';
    await transaction.save();

    if (status === 'success') {
        const planConfig = PLAN_CATALOG[transaction.plan];
        if (planConfig) {
            const newExpiry = addDays(new Date(), planConfig.durationDays);
            await User.updateOne(
                { _id: transaction.userId },
                { $set: { 'premiumPlan.type': transaction.plan, 'premiumPlan.expiresAt': newExpiry } }
            );
        }
    }

    return { ok: true, status: 200, payload: { status } };
};

export const createMoMoPayment = async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const fallbackClerkId = ENV.NODE_ENV === 'production' ? undefined : req.body?.clerkId;
        const clerkId = auth?.userId || fallbackClerkId;

        if (!clerkId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const plan = String(req.body?.plan || '').toLowerCase();
        const planConfig = PLAN_CATALOG[plan];
        if (!planConfig) {
            return res.status(400).json({ message: 'Invalid plan' });
        }

        if (!ENV.MOMO_PARTNER_CODE || !ENV.MOMO_ACCESS_KEY || !ENV.MOMO_SECRET_KEY) {
            return res.status(500).json({ message: 'MoMo keys are not configured' });
        }

        const user = await User.findOne({ clerkId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const recentPending = await PaymentTransaction.findOne({
            userId: user._id,
            plan,
            status: 'pending',
            createdAt: { $gte: new Date(Date.now() - PENDING_TRANSACTION_TTL_MS) }
        }).sort({ createdAt: -1 });

        if (recentPending?.payUrl) {
            return res.status(200).json({ payUrl: recentPending.payUrl, orderId: recentPending.orderId, reused: true });
        }

        const orderId = `momo_${Date.now()}_${user._id.toString()}`;
        const requestId = orderId;
        const amount = planConfig.amount;
        const orderInfo = `Premium ${planConfig.label} plan`;
        const requestType = 'captureWallet';
        const extraData = '';

        const frontendBaseUrl = normalizeBaseUrl(process.env.FRONTEND_URL || 'http://localhost:5173');
        const apiBaseUrl = normalizeBaseUrl(process.env.API_BASE_URL || 'http://localhost:3000');
        const redirectUrl = `${frontendBaseUrl}/payment?plan=${plan}`;
        const ipnUrl = `${apiBaseUrl}/api/premium/momo-ipn`;

        const rawSignature = [
            `accessKey=${ENV.MOMO_ACCESS_KEY}`,
            `amount=${amount}`,
            `extraData=${extraData}`,
            `ipnUrl=${ipnUrl}`,
            `orderId=${orderId}`,
            `orderInfo=${orderInfo}`,
            `partnerCode=${ENV.MOMO_PARTNER_CODE}`,
            `redirectUrl=${redirectUrl}`,
            `requestId=${requestId}`,
            `requestType=${requestType}`
        ].join('&');

        const signature = buildSignature(rawSignature, ENV.MOMO_SECRET_KEY);

        const requestBody = {
            partnerCode: ENV.MOMO_PARTNER_CODE,
            accessKey: ENV.MOMO_ACCESS_KEY,
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl,
            ipnUrl,
            requestType,
            extraData,
            lang: 'vi',
            signature
        };

        const momoEndpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
        const response = await fetch(momoEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const momoResponse = await response.json();
        if (!response.ok || momoResponse?.resultCode !== 0) {
            const message = momoResponse?.message || momoResponse?.errorMessage || 'Failed to create MoMo payment';
            return res.status(502).json({ message });
        }

        await PaymentTransaction.create({
            userId: user._id,
            orderId,
            amount,
            plan,
            status: 'pending',
            transactionId: '',
            payUrl: momoResponse.payUrl || ''
        });

        return res.status(200).json({ payUrl: momoResponse.payUrl, orderId });
    } catch (error) {
        console.error('MoMo payment creation failed:', error);
        return res.status(500).json({ message: error?.message || 'Failed to create payment' });
    }
};

export const momoIPN = async (req, res) => {
    try {
        const payload = req.body || {};
        const result = await processMomoCallback(payload);
        if (!result.ok) {
            return res.status(result.status).json({ message: result.message });
        }

        return res.status(200).json({ resultCode: 0, message: 'IPN processed' });
    } catch (error) {
        console.error('MoMo IPN handling failed:', error);
        return res.status(500).json({ message: error?.message || 'Failed to process IPN' });
    }
};

export const momoReturn = async (req, res) => {
    try {
        const payload = Object.keys(req.body || {}).length ? req.body : req.query || {};
        const result = await processMomoCallback(payload);
        if (!result.ok) {
            return res.status(result.status).json({ message: result.message });
        }

        return res.status(200).json(result.payload || { status: 'success' });
    } catch (error) {
        console.error('MoMo return handling failed:', error);
        return res.status(500).json({ message: error?.message || 'Failed to process return' });
    }
};

export const getPremiumStatus = async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const fallbackClerkId = ENV.NODE_ENV === 'production' ? undefined : req.query?.clerkId;
        const clerkId = auth?.userId || fallbackClerkId;

        if (!clerkId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findOne({ clerkId }).select('premiumPlan');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const expiresAt = user.premiumPlan?.expiresAt || null;
        const isActive = Boolean(user.premiumPlan?.type && user.premiumPlan.type !== 'none' && expiresAt && expiresAt > new Date());

        return res.status(200).json({
            plan: user.premiumPlan?.type || 'none',
            expiresAt,
            isActive
        });
    } catch (error) {
        console.error('Premium status fetch failed:', error);
        return res.status(500).json({ message: error?.message || 'Failed to fetch premium status' });
    }
};
