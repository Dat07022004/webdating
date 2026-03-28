import express from 'express';
import { getConversations, getMessages, createConversation } from '../controllers/chat.controller.js';
import { requireAuth } from '@clerk/express'; // ensure user is authed

const router = express.requireAuth ? express.Router().use(requireAuth()) : express.Router();

router.get('/conversations', requireAuth(), getConversations);
router.get('/conversations/:conversationId/messages', requireAuth(), getMessages);
router.post('/conversations', requireAuth(), createConversation);

export default router;
