import {
    getAllUsersWithBanStatus,
    banUserById,
    deleteUserById,
    changeUserRoleById
} from '../services/admin.service.js';

export const getAllUsers = async () => {
    const users = await getAllUsersWithBanStatus();
    return { users };
};

export const banUser = async ({ userId, body, adminId }) => {
    return banUserById({
        userId,
        adminId,
        reason: body?.reason,
        expiresAt: body?.expiresAt
    });
};

export const deleteUser = async ({ userId }) => {
    return deleteUserById({ userId });
};

export const changeUserRole = async ({ userId, body, adminId }) => {
    return changeUserRoleById({
        userId,
        adminId,
        role: body?.role
    });
};
