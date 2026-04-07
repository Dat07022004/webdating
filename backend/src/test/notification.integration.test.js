import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

const mockGetNotifications = jest.fn();
const mockMarkAsRead = jest.fn();
const mockMarkAllAsRead = jest.fn();
const mockGetUnreadCounts = jest.fn();

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

jest.unstable_mockModule('../controllers/notification.controller.js', () => ({
    getNotifications: mockGetNotifications,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    getUnreadCounts: mockGetUnreadCounts
}));

const { default: notificationRoutes } = await import('../routes/notification.routes.js');

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/notifications', notificationRoutes);
    return app;
};

describe('notification routes integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns notification list', async () => {
        const app = createApp();
        mockGetNotifications.mockResolvedValue({ notifications: [{ _id: 'n1' }] });

        const res = await request(app)
            .get('/api/notifications')
            .set('x-clerk-id', 'clerk_1');

        expect(res.statusCode).toBe(200);
        expect(res.body.notifications).toHaveLength(1);
        expect(mockGetNotifications).toHaveBeenCalledWith({ clerkId: 'clerk_1' });
    });

    it('returns unread counters', async () => {
        const app = createApp();
        mockGetUnreadCounts.mockResolvedValue({ notificationCount: 2, messageCount: 4 });

        const res = await request(app)
            .get('/api/notifications/unread-counts')
            .set('x-clerk-id', 'clerk_2');

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ notificationCount: 2, messageCount: 4 });
        expect(mockGetUnreadCounts).toHaveBeenCalledWith({ clerkId: 'clerk_2' });
    });

    it('marks one notification as read', async () => {
        const app = createApp();
        mockMarkAsRead.mockResolvedValue({ notification: { _id: 'n2', read: true } });

        const res = await request(app)
            .patch('/api/notifications/n2/read')
            .set('x-clerk-id', 'clerk_3');

        expect(res.statusCode).toBe(200);
        expect(res.body.notification.read).toBe(true);
        expect(mockMarkAsRead).toHaveBeenCalledWith({ clerkId: 'clerk_3', id: 'n2' });
    });

    it('marks all as read', async () => {
        const app = createApp();
        mockMarkAllAsRead.mockResolvedValue({ message: 'All notifications marked as read' });

        const res = await request(app)
            .patch('/api/notifications/read-all')
            .set('x-clerk-id', 'clerk_4');

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('All notifications marked as read');
        expect(mockMarkAllAsRead).toHaveBeenCalledWith({ clerkId: 'clerk_4' });
    });

    it('maps service errors via sendError', async () => {
        const app = createApp();
        const error = new Error('Unauthorized');
        error.statusCode = 401;
        mockGetNotifications.mockRejectedValue(error);

        const res = await request(app)
            .get('/api/notifications')
            .set('x-clerk-id', '');

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toMatch(/Unauthorized/);
    });
});
