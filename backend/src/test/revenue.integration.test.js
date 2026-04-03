import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

const mockFindOneUser = jest.fn();
const mockIsUserActivelyBanned = jest.fn();

const mockFetchRevenueOverview = jest.fn();
const mockFetchRevenueTransactions = jest.fn();

jest.unstable_mockModule('../models/user.model.js', () => ({
    User: {
        findOne: mockFindOneUser
    }
}));

jest.unstable_mockModule('../services/admin.service.js', () => ({
    isUserActivelyBanned: mockIsUserActivelyBanned
}));

jest.unstable_mockModule('../controllers/revenue.controller.js', () => ({
    fetchRevenueOverview: mockFetchRevenueOverview,
    fetchRevenueTransactions: mockFetchRevenueTransactions
}));

const { default: revenueRoutes } = await import('../routes/revenue.routes.js');

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
        const clerkId = req.headers['x-clerk-id'];
        req.auth = () => (clerkId ? { userId: clerkId } : null);
        next();
    });
    app.use('/api/revenue', revenueRoutes);
    return app;
};

describe('revenue routes integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 when auth session is missing', async () => {
        const app = createApp();

        const res = await request(app).get('/api/revenue/overview');

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toMatch(/Unauthorized/);
    });

    it('returns 403 when role is not manager/admin', async () => {
        const app = createApp();
        mockFindOneUser.mockResolvedValue({ _id: '507f1f77bcf86cd799439071', role: 'user' });
        mockIsUserActivelyBanned.mockResolvedValue(null);

        const res = await request(app)
            .get('/api/revenue/overview')
            .set('x-clerk-id', 'clerk_user');

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toBe('Forbidden: Requires manager or admin role');
    });

    it('allows manager to access overview', async () => {
        const app = createApp();
        mockFindOneUser.mockResolvedValue({ _id: '507f1f77bcf86cd799439072', role: 'manager' });
        mockIsUserActivelyBanned.mockResolvedValue(null);
        mockFetchRevenueOverview.mockResolvedValue({ summary: { totalRevenue: 1000 } });

        const res = await request(app)
            .get('/api/revenue/overview?from=2026-01-01&to=2026-01-31')
            .set('x-clerk-id', 'clerk_manager');

        expect(res.statusCode).toBe(200);
        expect(res.body.summary.totalRevenue).toBe(1000);
        expect(mockFetchRevenueOverview).toHaveBeenCalledWith({
            query: expect.objectContaining({ from: '2026-01-01', to: '2026-01-31' })
        });
    });

    it('allows admin to access transactions', async () => {
        const app = createApp();
        mockFindOneUser.mockResolvedValue({ _id: '507f1f77bcf86cd799439073', role: 'admin' });
        mockIsUserActivelyBanned.mockResolvedValue(null);
        mockFetchRevenueTransactions.mockResolvedValue({
            pagination: { total: 1, totalPages: 1, page: 1, limit: 10 },
            transactions: [{ orderId: 'momo_1' }]
        });

        const res = await request(app)
            .get('/api/revenue/transactions?status=success&page=1')
            .set('x-clerk-id', 'clerk_admin');

        expect(res.statusCode).toBe(200);
        expect(res.body.transactions).toHaveLength(1);
        expect(mockFetchRevenueTransactions).toHaveBeenCalledWith({
            query: expect.objectContaining({ status: 'success', page: '1' })
        });
    });
});
