import { jest } from '@jest/globals';

const mockDeleteUserFromClerk = jest.fn();

const mockUserModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn()
};

const saveBanMock = jest.fn();
const mockUserBannedModel = jest.fn().mockImplementation(function UserBannedDoc(data) {
    Object.assign(this, data);
    this.save = saveBanMock;
});
mockUserBannedModel.find = jest.fn();
mockUserBannedModel.findOne = jest.fn();
mockUserBannedModel.deleteOne = jest.fn();

const mockConnectionModel = {
    deleteMany: jest.fn()
};

jest.unstable_mockModule('@clerk/express', () => ({
    createClerkClient: () => ({
        users: {
            deleteUser: mockDeleteUserFromClerk
        }
    })
}));

jest.unstable_mockModule('../models/user.model.js', () => ({
    User: mockUserModel
}));

jest.unstable_mockModule('../models/userBanned.model.js', () => ({
    UserBanned: mockUserBannedModel
}));

jest.unstable_mockModule('../models/connection.model.js', () => ({
    Connection: mockConnectionModel
}));

const {
    getAllUsersWithBanStatus,
    banUserById,
    deleteUserById,
    changeUserRoleById
} = await import('../services/admin.service.js');

const createId = (value) => ({ toString: () => value });

const expectRejectStatus = async (promise, statusCode, message) => {
    await expect(promise).rejects.toMatchObject({ statusCode, message });
};

describe('admin.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('maps banned users in getAllUsersWithBanStatus', async () => {
        mockUserModel.find.mockReturnValue({
            select: jest.fn().mockResolvedValue([
                {
                    _id: createId('u1'),
                    toObject: () => ({ _id: 'u1', username: 'alice' })
                },
                {
                    _id: createId('u2'),
                    toObject: () => ({ _id: 'u2', username: 'bob' })
                }
            ])
        });

        mockUserBannedModel.find.mockReturnValue({
            select: jest.fn().mockResolvedValue([
                { userId: createId('u2'), reason: 'spam' }
            ])
        });

        const users = await getAllUsersWithBanStatus();

        expect(users).toHaveLength(2);
        expect(users[0].isBanned).toBe(false);
        expect(users[1].isBanned).toBe(true);
        expect(users[1].bannedInfo.reason).toBe('spam');
    });

    it('bans a user with valid payload', async () => {
        mockUserModel.findById.mockResolvedValue({ _id: createId('u2'), username: 'bob', role: 'user' });
        mockUserBannedModel.findOne.mockResolvedValue(null);
        saveBanMock.mockResolvedValue();

        const result = await banUserById({
            userId: '507f1f77bcf86cd799439011',
            adminId: '507f1f77bcf86cd799439012',
            reason: 'abuse',
            expiresAt: null
        });

        expect(mockUserBannedModel).toHaveBeenCalledWith(expect.objectContaining({ reason: 'abuse' }));
        expect(result.message).toBe('Successfully banned bob');
    });

    it('rejects banning an admin target', async () => {
        mockUserModel.findById.mockResolvedValue({ _id: createId('u3'), username: 'root', role: 'admin' });

        await expectRejectStatus(
            banUserById({
                userId: '507f1f77bcf86cd799439021',
                adminId: '507f1f77bcf86cd799439022',
                reason: 'test'
            }),
            403,
            'Cannot ban another admin'
        );
    });

    it('deletes user and cascade data even when clerk deletion fails', async () => {
        mockUserModel.findById.mockResolvedValue({ _id: createId('u4'), role: 'user', clerkId: 'clerk_live_1' });
        mockDeleteUserFromClerk.mockRejectedValue(new Error('clerk down'));
        mockConnectionModel.deleteMany.mockResolvedValue({ deletedCount: 2 });
        mockUserBannedModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
        mockUserModel.findByIdAndDelete.mockResolvedValue({});

        const result = await deleteUserById({ userId: '507f1f77bcf86cd799439031' });

        expect(mockDeleteUserFromClerk).toHaveBeenCalledWith('clerk_live_1');
        expect(mockConnectionModel.deleteMany).toHaveBeenCalled();
        expect(mockUserBannedModel.deleteOne).toHaveBeenCalledWith({ userId: '507f1f77bcf86cd799439031' });
        expect(mockUserModel.findByIdAndDelete).toHaveBeenCalledWith('507f1f77bcf86cd799439031');
        expect(result.message).toBe('User completely deleted');
    });

    it('rejects invalid role changes', async () => {
        await expectRejectStatus(
            changeUserRoleById({
                userId: '507f1f77bcf86cd799439041',
                adminId: '507f1f77bcf86cd799439042',
                role: 'superadmin'
            }),
            400,
            'Invalid role'
        );
    });

    it('updates role when valid and not self-change', async () => {
        const saveUserMock = jest.fn().mockResolvedValue();
        mockUserModel.findById.mockResolvedValue({
            _id: createId('507f1f77bcf86cd799439051'),
            role: 'user',
            save: saveUserMock
        });

        const result = await changeUserRoleById({
            userId: '507f1f77bcf86cd799439051',
            adminId: '507f1f77bcf86cd799439052',
            role: 'manager'
        });

        expect(saveUserMock).toHaveBeenCalled();
        expect(result.message).toBe('Role changed to manager');
    });
});
