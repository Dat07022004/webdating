import express from 'express';
import { getConversations, getMessages, createConversation, markConversationAsSeen } from '../controllers/chat.controller.js';
import { requireAuth } from '@clerk/express'; // ensure user is authed
import { ENV } from '../config/env.js';

const authMiddleware = ENV.NODE_ENV === 'production' ? requireAuth() : (_req, _res, next) => next();
const router = express.Router().use(authMiddleware);

const resolveAuthContext = (req) => {
    const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
    return auth || null;
};

const resolveClerkId = (req, auth) => req.user?.clerkId || auth?.userId || (ENV.NODE_ENV === 'production' ? undefined : req.headers?.['x-clerk-id'] || req.query?.clerkId || req.body?.clerkId);

const sendError = (res, error, fallbackMessage) => {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    const message = error?.message || fallbackMessage;
    return res.status(statusCode).json({ success: false, message });
};

router.get('/conversations', async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const clerkId = resolveClerkId(req, auth);
        const result = await getConversations({ clerkId });
        return res.status(200).json({ success: true, data: result.conversations });
    } catch (error) {
        console.error('getConversations error:', error);
        return sendError(res, error, 'Server error');
    }
});

router.get('/conversations/:conversationId/messages', async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const clerkId = resolveClerkId(req, auth);
        const { conversationId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const result = await getMessages({ clerkId, conversationId, page, limit });
        return res.status(200).json({ success: true, data: result.messages });
    } catch (error) {
        console.error('getMessages error:', error);
        return sendError(res, error, 'Server error');
    }
});

router.post('/conversations', async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const clerkId = resolveClerkId(req, auth);
        const { targetUserId } = req.body || {};
        const result = await createConversation({ clerkId, targetUserId });
        return res.status(200).json({ success: true, data: result.conversation });
    } catch (error) {
        console.error('createConversation error:', error);
        return sendError(res, error, 'Server error');
    }
});

router.patch('/conversations/:conversationId/seen', async (req, res) => {
    try {
        const auth = resolveAuthContext(req);
        const clerkId = resolveClerkId(req, auth);
        const { conversationId } = req.params;
        const result = await markConversationAsSeen({ clerkId, conversationId });
        return res.status(200).json(result);
    } catch (error) {
        console.error('markConversationAsSeen error:', error);
        return sendError(res, error, 'Server error');
    }
});

export default router;
