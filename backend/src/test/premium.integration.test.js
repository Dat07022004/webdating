import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

const mockCreateMoMoPayment = jest.fn();
const mockGetPremiumStatus = jest.fn();
const mockMomoIPN = jest.fn();
const mockMomoReturn = jest.fn();

jest.unstable_mockModule('@clerk/express', () => ({
    requireAuth: () => (req, _res, next) => next()
}));

jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
    requireActiveUser: (req, res, next) => {
        const clerkId = req.headers['x-clerk-id'];
        if (!clerkId) {
            return res.status(401).json({ message: 'Unauthorized: No valid session' });
        }
        req.user = { clerkId, email: `${clerkId}@example.com` };
        next();
    }
}));

jest.unstable_mockModule('../controllers/premium.controller.js', () => ({
    createMoMoPayment: mockCreateMoMoPayment,
    getPremiumStatus: mockGetPremiumStatus,
    momoIPN: mockMomoIPN,
    momoReturn: mockMomoReturn
}));

const { default: premiumRoutes } = await import('../routes/premium.routes.js');

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/premium', premiumRoutes);
    return app;
};

describe('premium routes integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('creates payment URL', async () => {
        const app = createApp();
        mockCreateMoMoPayment.mockResolvedValue({ payUrl: 'https://pay', orderId: 'o1' });

        const res = await request(app)
            .post('/api/premium/create-payment')
            .set('x-clerk-id', 'clerk_1')
            .send({ plan: 'gold' });

        expect(res.statusCode).toBe(200);
        expect(res.body.payUrl).toBe('https://pay');
        expect(mockCreateMoMoPayment).toHaveBeenCalledWith({ clerkId: 'clerk_1', plan: 'gold' });
    });

    it('returns premium status', async () => {
        const app = createApp();
        mockGetPremiumStatus.mockResolvedValue({ plan: 'gold', isActive: true });

        const res = await request(app)
            .get('/api/premium/status')
            .set('x-clerk-id', 'clerk_2');

        expect(res.statusCode).toBe(200);
        expect(res.body.plan).toBe('gold');
        expect(mockGetPremiumStatus).toHaveBeenCalledWith({ clerkId: 'clerk_2' });
    });

    it('processes IPN payload', async () => {
        const app = createApp();
        mockMomoIPN.mockResolvedValue({ resultCode: 0, message: 'IPN processed' });

        const res = await request(app)
            .post('/api/premium/momo-ipn')
            .send({ orderId: 'o1' });

        expect(res.statusCode).toBe(200);
        expect(res.body.resultCode).toBe(0);
        expect(mockMomoIPN).toHaveBeenCalledWith({ payload: { orderId: 'o1' } });
    });

    it('processes return payload from query when body is empty', async () => {
        const app = createApp();
        mockMomoReturn.mockResolvedValue({ status: 'success' });

        const res = await request(app)
            .post('/api/premium/momo-return?orderId=o2&resultCode=0');

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(mockMomoReturn).toHaveBeenCalledWith({ payload: expect.objectContaining({ orderId: 'o2', resultCode: '0' }) });
    });

    it('maps statusCode errors through sendError', async () => {
        const app = createApp();
        const error = new Error('Invalid signature');
        error.statusCode = 400;
        mockMomoIPN.mockRejectedValue(error);

        const res = await request(app)
            .post('/api/premium/momo-ipn')
            .send({ orderId: 'bad' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('Invalid signature');
    });
});
