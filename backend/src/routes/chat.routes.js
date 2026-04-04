import express from 'express';
import { getConversations, getMessages, createConversation, markConversationAsSeen } from '../controllers/chat.controller.js';
import { requireAuth } from '@clerk/express'; // ensure user is authed

const router = express.requireAuth ? express.Router().use(requireAuth()) : express.Router();

const resolveAuthContext = (req) => {
    const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
    return auth || null;
};

const sendError = (res, error, fallbackMessage) => {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    const message = error?.message || fallbackMessage;
    return res.status(statusCode).json({ success: false, message });
};

router.get('/conversations', requireAuth(), async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const clerkId = auth?.userId;
        const result = await getConversations({ clerkId });
        return res.status(200).json({ success: true, data: result.conversations });
    } catch (error) {
        console.error('getConversations error:', error);
        return sendError(res, error, 'Server error');
    }
});

router.get('/conversations/:conversationId/messages', requireAuth(), async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const clerkId = auth?.userId;
        const { conversationId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const result = await getMessages({ clerkId, conversationId, page, limit });
        return res.status(200).json({ success: true, data: result.messages });
    } catch (error) {
        console.error('getMessages error:', error);
        return sendError(res, error, 'Server error');
    }
});

router.post('/conversations', requireAuth(), async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const clerkId = auth?.userId;
        const { targetUserId } = req.body || {};
        const result = await createConversation({ clerkId, targetUserId });
        return res.status(200).json({ success: true, data: result.conversation });
    } catch (error) {
        console.error('createConversation error:', error);
        return sendError(res, error, 'Server error');
    }
});

router.patch('/conversations/:conversationId/seen', requireAuth(), async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const clerkId = auth?.userId;
        const { conversationId } = req.params;
        const result = await markConversationAsSeen({ clerkId, conversationId });
        return res.status(200).json(result);
    } catch (error) {
        console.error('markConversationAsSeen error:', error);
        return sendError(res, error, 'Server error');
    }
});

export default router;
