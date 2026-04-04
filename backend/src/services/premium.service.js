import crypto from 'crypto';
import { ENV } from '../config/env.js';
import { PaymentTransaction } from '../models/paymentTransaction.model.js';
import { User } from '../models/user.model.js';

const PLAN_CATALOG = {
    gold: { amount: 149900, durationDays: 30, label: 'Gold' },
    platinum: { amount: 299900, durationDays: 30, label: 'Platinum' }
};

const PENDING_TRANSACTION_TTL_MS = 10 * 60 * 1000;

const createError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
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

export const createMoMoPaymentRequest = async ({ clerkId, plan }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    const normalizedPlan = String(plan || '').toLowerCase();
    const planConfig = PLAN_CATALOG[normalizedPlan];
    if (!planConfig) {
        throw createError(400, 'Invalid plan');
    }

    if (!ENV.MOMO_PARTNER_CODE || !ENV.MOMO_ACCESS_KEY || !ENV.MOMO_SECRET_KEY) {
        throw createError(500, 'MoMo keys are not configured');
    }

    const user = await User.findOne({ clerkId });
    if (!user) {
        throw createError(404, 'User not found');
    }

    const recentPending = await PaymentTransaction.findOne({
        userId: user._id,
        plan: normalizedPlan,
        status: 'pending',
        createdAt: { $gte: new Date(Date.now() - PENDING_TRANSACTION_TTL_MS) }
    }).sort({ createdAt: -1 });

    if (recentPending?.payUrl) {
        return { payUrl: recentPending.payUrl, orderId: recentPending.orderId, reused: true };
    }

    const orderId = `momo_${Date.now()}_${user._id.toString()}`;
    const requestId = orderId;
    const amount = planConfig.amount;
    const orderInfo = `Premium ${planConfig.label} plan`;
    const requestType = 'captureWallet';
    const extraData = '';

    const frontendBaseUrl = normalizeBaseUrl(process.env.FRONTEND_URL || 'http://localhost:5173');
    const apiBaseUrl = normalizeBaseUrl(process.env.API_BASE_URL || 'http://localhost:3000');
    const redirectUrl = `${frontendBaseUrl}/payment?plan=${normalizedPlan}`;
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
        throw createError(502, message);
    }

    await PaymentTransaction.create({
        userId: user._id,
        orderId,
        amount,
        plan: normalizedPlan,
        status: 'pending',
        transactionId: '',
        payUrl: momoResponse.payUrl || ''
    });

    return { payUrl: momoResponse.payUrl, orderId };
};

export const processMomoIpnPayload = async ({ payload }) => {
    const result = await processMomoCallback(payload || {});
    if (!result.ok) {
        throw createError(result.status, result.message);
    }

    return { resultCode: 0, message: 'IPN processed' };
};

export const processMomoReturnPayload = async ({ payload }) => {
    const result = await processMomoCallback(payload || {});
    if (!result.ok) {
        throw createError(result.status, result.message);
    }

    return result.payload || { status: 'success' };
};

export const getPremiumStatusByClerkId = async ({ clerkId }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    const user = await User.findOne({ clerkId }).select('premiumPlan');
    if (!user) {
        throw createError(404, 'User not found');
    }

    const expiresAt = user.premiumPlan?.expiresAt || null;
    const isActive = Boolean(user.premiumPlan?.type && user.premiumPlan.type !== 'none' && expiresAt && expiresAt > new Date());

    return {
        plan: user.premiumPlan?.type || 'none',
        expiresAt,
        isActive
    };
};
