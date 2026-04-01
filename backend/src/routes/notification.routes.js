import express from 'express';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead,
  getUnreadCounts
} from '../controllers/notification.controller.js';
import { requireAuth } from '@clerk/express';

const router = express.requireAuth ? express.Router().use(requireAuth()) : express.Router();

router.get('/', requireAuth(), getNotifications);
router.get('/unread-counts', requireAuth(), getUnreadCounts);
router.patch('/:id/read', requireAuth(), markAsRead);
router.patch('/read-all', requireAuth(), markAllAsRead);

export default router;
