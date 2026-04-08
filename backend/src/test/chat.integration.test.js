import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

const mockGetConversations = jest.fn();
const mockGetMessages = jest.fn();
const mockCreateConversation = jest.fn();
const mockMarkConversationAsSeen = jest.fn();

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

jest.unstable_mockModule('../controllers/chat.controller.js', () => ({
    getConversations: mockGetConversations,
    getMessages: mockGetMessages,
    createConversation: mockCreateConversation,
    markConversationAsSeen: mockMarkConversationAsSeen
}));

const { default: chatRoutes } = await import('../routes/chat.routes.js');

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/chat', chatRoutes);
    return app;
};

describe('chat routes integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns conversations list', async () => {
        const app = createApp();
        mockGetConversations.mockResolvedValue({ conversations: [{ _id: 'c1' }] });

        const res = await request(app)
            .get('/api/chat/conversations')
            .set('x-clerk-id', 'clerk_1');

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
        expect(mockGetConversations).toHaveBeenCalledWith({ clerkId: 'clerk_1' });
    });

    it('returns messages for conversation', async () => {
        const app = createApp();
        mockGetMessages.mockResolvedValue({ messages: [{ _id: 'm1' }] });

        const res = await request(app)
            .get('/api/chat/conversations/conv_1/messages?page=1&limit=20')
            .set('x-clerk-id', 'clerk_2');

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
        expect(mockGetMessages).toHaveBeenCalledWith({
            clerkId: 'clerk_2',
            conversationId: 'conv_1',
            page: '1',
            limit: '20'
        });
    });

    it('creates conversation', async () => {
        const app = createApp();
        mockCreateConversation.mockResolvedValue({ conversation: { _id: 'conv_new' } });

        const res = await request(app)
            .post('/api/chat/conversations')
            .set('x-clerk-id', 'clerk_3')
            .send({ targetUserId: 'u123' });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data._id).toBe('conv_new');
        expect(mockCreateConversation).toHaveBeenCalledWith({ clerkId: 'clerk_3', targetUserId: 'u123' });
    });

    it('marks conversation as seen', async () => {
        const app = createApp();
        mockMarkConversationAsSeen.mockResolvedValue({ success: true, message: 'Conversation marked as seen' });

        const res = await request(app)
            .patch('/api/chat/conversations/conv_5/seen')
            .set('x-clerk-id', 'clerk_5');

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(mockMarkConversationAsSeen).toHaveBeenCalledWith({ clerkId: 'clerk_5', conversationId: 'conv_5' });
    });

    it('maps statusCode errors via sendError helper', async () => {
        const app = createApp();
        const error = new Error('Access denied');
        error.statusCode = 403;
        mockGetMessages.mockRejectedValue(error);

        const res = await request(app)
            .get('/api/chat/conversations/conv_9/messages')
            .set('x-clerk-id', 'clerk_9');

        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Access denied');
    });
});
