import express from 'express';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead,
  getUnreadCounts
} from '../controllers/notification.controller.js';
import { requireAuth } from '@clerk/express';
import { ENV } from '../config/env.js';

const router = express.requireAuth ? express.Router().use(requireAuth()) : express.Router();

const resolveAuthContext = (req) => {
    try {
        const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
        return auth || null;
    } catch (error) {
        if (ENV.NODE_ENV !== 'production') {
            console.warn('Auth resolution failed in development:', error?.message);
            return null;
        }
        throw error;
    }
};

const sendError = (res, error, fallbackMessage) => {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    const message = error?.message || fallbackMessage;
    return res.status(statusCode).json({ message });
};

router.get('/', requireAuth(), async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const clerkId = auth?.userId;
        const result = await getNotifications({ clerkId });
        return res.status(200).json(result);
    } catch (error) {
        console.error('getNotifications error:', error);
        return sendError(res, error, 'Failed to fetch notifications');
    }
});

router.get('/unread-counts', requireAuth(), async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const clerkId = auth?.userId;
        const result = await getUnreadCounts({ clerkId });
        return res.status(200).json(result);
    } catch (error) {
        console.error('getUnreadCounts error:', error);
        return sendError(res, error, 'Failed to fetch unread counts');
    }
});

router.patch('/:id/read', requireAuth(), async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const clerkId = auth?.userId;
        const { id } = req.params;
        const result = await markAsRead({ clerkId, id });
        return res.status(200).json(result);
    } catch (error) {
        console.error('markAsRead error:', error);
        return sendError(res, error, 'Failed to mark notification as read');
    }
});

router.patch('/read-all', requireAuth(), async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const clerkId = auth?.userId;
        const result = await markAllAsRead({ clerkId });
        return res.status(200).json(result);
    } catch (error) {
        console.error('markAllAsRead error:', error);
        return sendError(res, error, 'Failed to mark all as read');
    }
});

export default router;
