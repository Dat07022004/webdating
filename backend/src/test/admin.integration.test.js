import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

const mockFindOneUser = jest.fn();
const mockIsUserActivelyBanned = jest.fn();

const mockGetAllUsers = jest.fn();
const mockBanUser = jest.fn();
const mockDeleteUser = jest.fn();
const mockChangeUserRole = jest.fn();

jest.unstable_mockModule('../models/user.model.js', () => ({
    User: {
        findOne: mockFindOneUser
    }
}));

jest.unstable_mockModule('../services/admin.service.js', () => ({
    isUserActivelyBanned: mockIsUserActivelyBanned
}));

jest.unstable_mockModule('../controllers/admin.controller.js', () => ({
    getAllUsers: mockGetAllUsers,
    banUser: mockBanUser,
    deleteUser: mockDeleteUser,
    changeUserRole: mockChangeUserRole
}));

const { default: adminRoutes } = await import('../routes/admin.route.js');

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
        const clerkId = req.headers['x-clerk-id'];
        req.auth = () => (clerkId ? { userId: clerkId } : null);
        next();
    });
    app.use('/api/admin', adminRoutes);
    return app;
};

describe('admin routes integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 when auth session is missing', async () => {
        const app = createApp();

        const res = await request(app).get('/api/admin/users');

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toMatch(/Unauthorized/);
    });

    it('returns 404 when user cannot be resolved', async () => {
        const app = createApp();
        mockFindOneUser.mockResolvedValue(null);

        const res = await request(app)
            .get('/api/admin/users')
            .set('x-clerk-id', 'clerk_missing');

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('User not found');
    });

    it('returns 403 when account is actively banned', async () => {
        const app = createApp();
        mockFindOneUser.mockResolvedValue({ _id: '507f1f77bcf86cd799439061', role: 'admin' });
        mockIsUserActivelyBanned.mockResolvedValue({ userId: '507f1f77bcf86cd799439061' });

        const res = await request(app)
            .get('/api/admin/users')
            .set('x-clerk-id', 'clerk_admin');

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toBe('Forbidden: Account is banned');
    });

    it('returns 403 when role is not admin', async () => {
        const app = createApp();
        mockFindOneUser.mockResolvedValue({ _id: '507f1f77bcf86cd799439062', role: 'user' });
        mockIsUserActivelyBanned.mockResolvedValue(null);

        const res = await request(app)
            .get('/api/admin/users')
            .set('x-clerk-id', 'clerk_user');

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toBe('Forbidden: Requires admin role');
    });

    it('returns data when requester is admin and not banned', async () => {
        const app = createApp();
        mockFindOneUser.mockResolvedValue({ _id: '507f1f77bcf86cd799439063', role: 'admin' });
        mockIsUserActivelyBanned.mockResolvedValue(null);
        mockGetAllUsers.mockResolvedValue({ users: [{ _id: 'u1', username: 'alice' }] });

        const res = await request(app)
            .get('/api/admin/users')
            .set('x-clerk-id', 'clerk_admin_ok');

        expect(res.statusCode).toBe(200);
        expect(res.body.users).toHaveLength(1);
        expect(mockGetAllUsers).toHaveBeenCalledTimes(1);
    });
});
