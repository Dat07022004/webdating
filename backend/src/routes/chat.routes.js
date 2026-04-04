import express from 'express';
import { getConversations, getMessages, createConversation } from '../controllers/chat.controller.js';
import { requireActiveUser } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/conversations', requireActiveUser, getConversations);
router.get('/conversations/:conversationId/messages', requireActiveUser, getMessages);
router.post('/conversations', requireActiveUser, createConversation);

export default router;
