import { jest } from '@jest/globals';

const mockUserModel = {
    findOne: jest.fn()
};

const mockConversationModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn()
};

const mockMessageModel = {
    find: jest.fn(),
    updateMany: jest.fn()
};

jest.unstable_mockModule('../models/user.model.js', () => ({
    User: mockUserModel
}));

jest.unstable_mockModule('../models/conversation.model.js', () => ({
    Conversation: mockConversationModel
}));

jest.unstable_mockModule('../models/message.model.js', () => ({
    Message: mockMessageModel
}));

const {
    getConversationsByClerkId,
    getMessagesByConversation,
    createConversationForUsers,
    markConversationSeenByClerkId
} = await import('../services/chat.service.js');

const createId = (value) => ({
    value,
    toString: () => value,
    [Symbol.toPrimitive]: () => value
});

const expectRejectStatus = async (promise, statusCode, message) => {
    await expect(promise).rejects.toMatchObject({ statusCode, message });
};

describe('chat.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns conversations for authorized user', async () => {
        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: createId('u1') })
        });

        const mockSort = jest.fn().mockResolvedValue([{ _id: 'c1' }]);
        const mockPopulateLastMessage = jest.fn().mockReturnValue({ sort: mockSort });
        const mockPopulateParticipants = jest.fn().mockReturnValue({ populate: mockPopulateLastMessage });
        mockConversationModel.find.mockReturnValue({ populate: mockPopulateParticipants });

        const result = await getConversationsByClerkId({ clerkId: 'clerk_1' });

        expect(result.conversations).toHaveLength(1);
        expect(mockConversationModel.find).toHaveBeenCalledWith(
            expect.objectContaining({
                $and: expect.arrayContaining([
                    expect.objectContaining({ participants: expect.anything() })
                ])
            })
        );
    });

    it('rejects when clerkId is missing', async () => {
        await expectRejectStatus(
            getConversationsByClerkId({ clerkId: undefined }),
            401,
            'Unauthorized'
        );
    });

    it('rejects when user does not exist', async () => {
        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(null)
        });

        await expectRejectStatus(
            getConversationsByClerkId({ clerkId: 'clerk_2' }),
            404,
            'User not found'
        );
    });

    it('returns paginated messages in ascending order', async () => {
        const userId = createId('u2');
        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: userId })
        });

        mockConversationModel.findById.mockResolvedValue({
            participants: [createId('u2'), createId('u3')]
        });

        const mockLimit = jest.fn().mockResolvedValue([{ id: 2 }, { id: 1 }]);
        const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
        const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
        mockMessageModel.find.mockReturnValue({ sort: mockSort });

        const result = await getMessagesByConversation({
            clerkId: 'clerk_2',
            conversationId: 'conv_1',
            page: '2',
            limit: '2'
        });

        expect(mockSkip).toHaveBeenCalledWith(2);
        expect(mockLimit).toHaveBeenCalledWith(2);
        expect(result.messages).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('rejects access to conversation for non-participant', async () => {
        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: createId('u4') })
        });

        mockConversationModel.findById.mockResolvedValue({
            participants: [createId('u7')]
        });

        await expectRejectStatus(
            getMessagesByConversation({ clerkId: 'clerk_4', conversationId: 'conv_4' }),
            403,
            'Access denied'
        );
    });

    it('creates conversation when none exists', async () => {
        const populateExisting = jest.fn();
        populateExisting.mockResolvedValue(null);
        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: createId('u10') })
        });

        mockConversationModel.findOne.mockReturnValue({
            populate: populateExisting
        });

        const populateCreated = jest.fn().mockResolvedValue({ _id: 'conv_new' });
        mockConversationModel.create.mockResolvedValue({ populate: populateCreated });

        const result = await createConversationForUsers({
            clerkId: 'clerk_10',
            targetUserId: '507f1f77bcf86cd799439011'
        });

        expect(mockConversationModel.create).toHaveBeenCalled();
        expect(result.conversation._id).toBe('conv_new');
    });

    it('marks unseen messages as seen', async () => {
        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: createId('u11') })
        });
        mockMessageModel.updateMany.mockResolvedValue({ modifiedCount: 3 });

        const result = await markConversationSeenByClerkId({
            clerkId: 'clerk_11',
            conversationId: 'conv_11'
        });

        expect(mockMessageModel.updateMany).toHaveBeenCalledWith(
            { conversationId: 'conv_11', receiverId: expect.anything(), seen: false },
            { $set: { seen: true, seenAt: expect.any(Date) } }
        );
        expect(result.success).toBe(true);
    });
});
