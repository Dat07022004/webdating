import crypto from 'crypto';
import { jest } from '@jest/globals';
import { ENV } from '../config/env.js';

const mockPaymentTransactionModel = {
    findOne: jest.fn(),
    create: jest.fn()
};

const mockUserModel = {
    findOne: jest.fn(),
    updateOne: jest.fn()
};

jest.unstable_mockModule('../models/paymentTransaction.model.js', () => ({
    PaymentTransaction: mockPaymentTransactionModel
}));

jest.unstable_mockModule('../models/user.model.js', () => ({
    User: mockUserModel
}));

const {
    createMoMoPaymentRequest,
    processMomoIpnPayload,
    processMomoReturnPayload,
    getPremiumStatusByClerkId
} = await import('../services/premium.service.js');

const makeFindOneChain = (value) => ({
    sort: jest.fn().mockResolvedValue(value)
});

const buildSignatureForTest = (payload) => {
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

    return crypto
        .createHmac('sha256', ENV.MOMO_SECRET_KEY || '')
        .update(rawSignature)
        .digest('hex');
};

const expectRejectStatus = async (promise, statusCode, message) => {
    await expect(promise).rejects.toMatchObject({ statusCode, message });
};

describe('premium.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    afterEach(() => {
        delete global.fetch;
    });

    it('rejects create payment when plan is invalid', async () => {
        await expectRejectStatus(
            createMoMoPaymentRequest({ clerkId: 'clerk_1', plan: 'vip' }),
            400,
            'Invalid plan'
        );
    });

    it('reuses recent pending transaction payUrl', async () => {
        mockUserModel.findOne.mockResolvedValue({ _id: { toString: () => 'u1' } });
        mockPaymentTransactionModel.findOne.mockReturnValue(
            makeFindOneChain({ payUrl: 'https://existing-pay', orderId: 'order_old' })
        );

        const result = await createMoMoPaymentRequest({ clerkId: 'clerk_1', plan: 'gold' });

        expect(result).toEqual({ payUrl: 'https://existing-pay', orderId: 'order_old', reused: true });
        expect(mockPaymentTransactionModel.create).not.toHaveBeenCalled();
    });

    it('creates new momo payment when no pending transaction exists', async () => {
        process.env.FRONTEND_URL = 'http://localhost:5173';
        process.env.API_BASE_URL = 'http://localhost:3000';
        process.env.MOMO_ENDPOINT = 'https://mock-momo/create';

        mockUserModel.findOne.mockResolvedValue({ _id: { toString: () => 'u2' } });
        mockPaymentTransactionModel.findOne.mockReturnValue(makeFindOneChain(null));

        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ resultCode: 0, payUrl: 'https://pay-new' })
        });

        const result = await createMoMoPaymentRequest({ clerkId: 'clerk_2', plan: 'platinum' });

        expect(global.fetch).toHaveBeenCalledWith(
            'https://mock-momo/create',
            expect.objectContaining({ method: 'POST' })
        );
        expect(mockPaymentTransactionModel.create).toHaveBeenCalledWith(
            expect.objectContaining({ plan: 'platinum', payUrl: 'https://pay-new', status: 'pending' })
        );
        expect(result.payUrl).toBe('https://pay-new');
        expect(result.orderId).toContain('momo_');
    });

    it('rejects IPN payload with invalid signature', async () => {
        await expectRejectStatus(
            processMomoIpnPayload({ payload: { orderId: 'o1', signature: 'bad' } }),
            400,
            'Invalid signature'
        );
    });

    it('returns already processed when transaction is already success', async () => {
        const payload = {
            amount: 149900,
            extraData: '',
            message: 'Success',
            orderId: 'o2',
            orderInfo: 'Premium Gold plan',
            orderType: 'momo_wallet',
            partnerCode: ENV.MOMO_PARTNER_CODE,
            payType: 'qr',
            requestId: 'o2',
            responseTime: '123',
            resultCode: '0',
            transId: 't2'
        };
        payload.signature = buildSignatureForTest(payload);

        mockPaymentTransactionModel.findOne.mockResolvedValue({ status: 'success' });

        const result = await processMomoReturnPayload({ payload });

        expect(result).toEqual({ status: 'success', message: 'Already processed' });
    });

    it('marks transaction success and updates premium plan on valid callback', async () => {
        const payload = {
            amount: 149900,
            extraData: '',
            message: 'Success',
            orderId: 'o3',
            orderInfo: 'Premium Gold plan',
            orderType: 'momo_wallet',
            partnerCode: ENV.MOMO_PARTNER_CODE,
            payType: 'qr',
            requestId: 'o3',
            responseTime: '456',
            resultCode: '0',
            transId: 't3'
        };
        payload.signature = buildSignatureForTest(payload);

        const save = jest.fn().mockResolvedValue();
        mockPaymentTransactionModel.findOne.mockResolvedValue({
            status: 'pending',
            plan: 'gold',
            userId: '507f1f77bcf86cd799439081',
            save
        });
        mockUserModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

        const result = await processMomoIpnPayload({ payload });

        expect(save).toHaveBeenCalled();
        expect(mockUserModel.updateOne).toHaveBeenCalledWith(
            { _id: '507f1f77bcf86cd799439081' },
            { $set: { 'premiumPlan.type': 'gold', 'premiumPlan.expiresAt': expect.any(Date) } }
        );
        expect(result).toEqual({ resultCode: 0, message: 'IPN processed' });
    });

    it('returns premium status with active flag', async () => {
        const future = new Date(Date.now() + 60 * 60 * 1000);
        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({ premiumPlan: { type: 'gold', expiresAt: future } })
        });

        const result = await getPremiumStatusByClerkId({ clerkId: 'clerk_9' });

        expect(result.plan).toBe('gold');
        expect(result.isActive).toBe(true);
    });
});
