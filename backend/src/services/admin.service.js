import { createClerkClient } from '@clerk/express';
import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import { User } from '../models/user.model.js';
import { UserBanned } from '../models/userBanned.model.js';
import { Connection } from '../models/connection.model.js';

const clerkClient = createClerkClient({
    secretKey: ENV.CLERK_SECRET_KEY,
    publishableKey: ENV.CLERK_PUBLISHABLE_KEY,
});

const createError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const assertObjectId = (value, fieldName) => {
    if (!value || !mongoose.isValidObjectId(value)) {
        throw createError(400, `Invalid ${fieldName}`);
    }
};

const normalizeExpiresAt = (expiresAt) => {
    if (!expiresAt) {
        return null;
    }

    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
        throw createError(400, 'Invalid expiresAt value');
    }

    return parsed;
};

export const getAllUsersWithBanStatus = async () => {
    const users = await User.find().select('_id clerkId email username role profile status createdAt');
    const bannedUsers = await UserBanned.find().select('userId reason expiresAt bannedBy createdAt updatedAt');

    const bannedMap = new Map();
    bannedUsers.forEach((bannedUser) => {
        bannedMap.set(bannedUser.userId.toString(), bannedUser);
    });

    return users.map((user) => {
        const userObj = user.toObject();
        const banInfo = bannedMap.get(user._id.toString()) || null;
        userObj.bannedInfo = banInfo;
        userObj.isBanned = Boolean(banInfo);
        return userObj;
    });
};

export const banUserById = async ({ userId, adminId, reason, expiresAt }) => {
    assertObjectId(userId, 'userId');
    assertObjectId(adminId, 'adminId');

    const targetUser = await User.findById(userId);
    if (!targetUser) {
        throw createError(404, 'User not found');
    }

    if (targetUser.role === 'admin') {
        throw createError(403, 'Cannot ban another admin');
    }

    const existingBan = await UserBanned.findOne({ userId });
    if (existingBan) {
        throw createError(400, 'User is already banned');
    }

    const newBan = new UserBanned({
        userId,
        bannedBy: adminId,
        reason: reason || 'Violation of terms',
        expiresAt: normalizeExpiresAt(expiresAt)
    });

    await newBan.save();

    return {
        message: `Successfully banned ${targetUser.username}`,
        banInfo: newBan
    };
};

export const deleteUserById = async ({ userId }) => {
    assertObjectId(userId, 'userId');

    const targetUser = await User.findById(userId);
    if (!targetUser) {
        throw createError(404, 'User not found');
    }

    if (targetUser.role === 'admin') {
        throw createError(403, 'Cannot delete an admin from dashboard');
    }

    if (targetUser.clerkId && !targetUser.clerkId.includes('fake_')) {
        try {
            await clerkClient.users.deleteUser(targetUser.clerkId);
        } catch (clerkError) {
            console.error('Clerk deletion failed (might be already deleted or invalid mock id):', clerkError?.message || clerkError);
        }
    }

    await Connection.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] });
    await UserBanned.deleteOne({ userId });
    await User.findByIdAndDelete(userId);

    return { message: 'User completely deleted' };
};

export const changeUserRoleById = async ({ userId, adminId, role }) => {
    assertObjectId(userId, 'userId');
    assertObjectId(adminId, 'adminId');

    if (!['admin', 'manager', 'user'].includes(role)) {
        throw createError(400, 'Invalid role');
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
        throw createError(404, 'User not found');
    }

    if (targetUser._id.toString() === adminId.toString()) {
        throw createError(403, 'Cannot change your own role here');
    }

    targetUser.role = role;
    await targetUser.save();

    return {
        message: `Role changed to ${role}`,
        user: targetUser
    };
};

export const isUserActivelyBanned = async (userId) => {
    if (!userId || !mongoose.isValidObjectId(userId)) {
        return null;
    }

    return UserBanned.findOne({
        userId,
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    });
};
