import express from 'express';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead,
  getUnreadCounts
} from '../controllers/notification.controller.js';
import { requireActiveUser } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireActiveUser);

const sendError = (res, error, fallbackMessage) => {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    const message = error?.message || fallbackMessage;
    return res.status(statusCode).json({ message });
};

router.get('/', async (req, res) => {
    try {
        const clerkId = req.user?.clerkId;
        const result = await getNotifications({ clerkId });
        return res.status(200).json(result);
    } catch (error) {
        console.error('getNotifications error:', error);
        return sendError(res, error, 'Failed to fetch notifications');
    }
});

router.get('/unread-counts', async (req, res) => {
    try {
        const clerkId = req.user?.clerkId;
        const result = await getUnreadCounts({ clerkId });
        return res.status(200).json(result);
    } catch (error) {
        console.error('getUnreadCounts error:', error);
        return sendError(res, error, 'Failed to fetch unread counts');
    }
});

router.patch('/:id/read', async (req, res) => {
    try {
        const clerkId = req.user?.clerkId;
        const { id } = req.params;
        const result = await markAsRead({ clerkId, id });
        return res.status(200).json(result);
    } catch (error) {
        console.error('markAsRead error:', error);
        return sendError(res, error, 'Failed to mark notification as read');
    }
});

router.patch('/read-all', async (req, res) => {
    try {
        const clerkId = req.user?.clerkId;
        const result = await markAllAsRead({ clerkId });
        return res.status(200).json(result);
    } catch (error) {
        console.error('markAllAsRead error:', error);
        return sendError(res, error, 'Failed to mark all as read');
    }
});

export default router;