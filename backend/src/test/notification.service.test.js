import { jest } from '@jest/globals';

const mockNotificationModel = {
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn()
};

const mockUserModel = {
    findOne: jest.fn()
};

const mockMessageModel = {
    distinct: jest.fn()
};

jest.unstable_mockModule('../models/notification.model.js', () => ({
    Notification: mockNotificationModel
}));

jest.unstable_mockModule('../models/user.model.js', () => ({
    User: mockUserModel
}));

jest.unstable_mockModule('../models/message.model.js', () => ({
    Message: mockMessageModel
}));

const {
    getNotificationsByClerkId,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadCountsByClerkId
} = await import('../services/notification.service.js');

const expectRejectStatus = async (promise, statusCode, message) => {
    await expect(promise).rejects.toMatchObject({ statusCode, message });
};

describe('notification.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns latest notifications for user', async () => {
        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: 'u1' })
        });

        const mockLimit = jest.fn().mockResolvedValue([{ _id: 'n1' }, { _id: 'n2' }]);
        const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
        mockNotificationModel.find.mockReturnValue({ sort: mockSort });

        const result = await getNotificationsByClerkId({ clerkId: 'clerk_1' });

        expect(result.notifications).toHaveLength(2);
        expect(mockNotificationModel.find).toHaveBeenCalledWith({ userId: 'u1' });
        expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(mockLimit).toHaveBeenCalledWith(50);
    });

    it('rejects unauthorized access', async () => {
        await expectRejectStatus(
            getNotificationsByClerkId({ clerkId: '' }),
            401,
            'Unauthorized'
        );
    });

    it('marks single notification as read', async () => {
        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: 'u2' })
        });
        mockNotificationModel.findOneAndUpdate.mockResolvedValue({ _id: 'n10', read: true });

        const result = await markNotificationAsRead({ clerkId: 'clerk_2', id: 'n10' });

        expect(mockNotificationModel.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: 'n10', userId: 'u2' },
            { read: true },
            { new: true }
        );
        expect(result.notification.read).toBe(true);
    });

    it('throws 404 when marking missing notification', async () => {
        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: 'u3' })
        });
        mockNotificationModel.findOneAndUpdate.mockResolvedValue(null);

        await expectRejectStatus(
            markNotificationAsRead({ clerkId: 'clerk_3', id: 'missing' }),
            404,
            'Notification not found'
        );
    });

    it('marks all notifications as read', async () => {
        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: 'u4' })
        });
        mockNotificationModel.updateMany.mockResolvedValue({ modifiedCount: 5 });

        const result = await markAllNotificationsAsRead({ clerkId: 'clerk_4' });

        expect(mockNotificationModel.updateMany).toHaveBeenCalledWith(
            { userId: 'u4', read: false },
            { read: true }
        );
        expect(result.message).toBe('All notifications marked as read');
    });

    it('returns unread counts for notifications and messages', async () => {
        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: 'u5' })
        });
        mockNotificationModel.countDocuments.mockResolvedValue(7);
        mockMessageModel.distinct.mockResolvedValue(['c1', 'c2', 'c3']);

        const result = await getUnreadCountsByClerkId({ clerkId: 'clerk_5' });

        expect(mockNotificationModel.countDocuments).toHaveBeenCalledWith({ userId: 'u5', read: false });
        expect(mockMessageModel.distinct).toHaveBeenCalledWith('conversationId', { receiverId: 'u5', seen: false });
        expect(result).toEqual({ notificationCount: 7, messageCount: 3 });
    });
});
