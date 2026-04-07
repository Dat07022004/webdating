import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { UserBlocked } from '../models/userBlocked.model.js';
import { Report } from '../models/report.model.js';
import { Connection } from '../models/connection.model.js';

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

const resolveCurrentUser = async (clerkId) => {
    if (!clerkId) throw createError(401, 'Unauthorized');
    const user = await User.findOne({ clerkId });
    if (!user) throw createError(404, 'User not found');
    return user;
};

export const submitReport = async ({ clerkId, reportedId, reason, description }) => {
    assertObjectId(reportedId, 'reportedId');
    const currentUser = await resolveCurrentUser(clerkId);

    if (currentUser._id.toString() === reportedId) {
        throw createError(400, 'Cannot report yourself');
    }

    const targetExists = await User.exists({ _id: reportedId });
    if (!targetExists) throw createError(404, 'Reported user not found');

    const report = new Report({
        reporterId: currentUser._id,
        reportedId,
        reason,
        description: description || 'No description provided',
    });
    await report.save();

    return { success: true, message: 'Report submitted successfully' };
};

export const blockUserById = async ({ clerkId, blockedId }) => {
    assertObjectId(blockedId, 'blockedId');
    const currentUser = await resolveCurrentUser(clerkId);

    if (currentUser._id.toString() === blockedId) {
        throw createError(400, 'Cannot block yourself');
    }

    const targetExists = await User.exists({ _id: blockedId });
    if (!targetExists) throw createError(404, 'User to block not found');

    await UserBlocked.findOneAndUpdate(
        { blockerId: currentUser._id, blockedId },
        { blockerId: currentUser._id, blockedId },
        { upsert: true }
    );

    await Connection.updateMany(
        {
            $or: [
                { senderId: currentUser._id, receiverId: blockedId },
                { senderId: blockedId, receiverId: currentUser._id },
            ],
        },
        { status: 'blocked' }
    );

    return { success: true, message: 'User blocked successfully' };
};

export const unblockUserById = async ({ clerkId, blockedId }) => {
    assertObjectId(blockedId, 'blockedId');
    const currentUser = await resolveCurrentUser(clerkId);

    await UserBlocked.findOneAndDelete({ blockerId: currentUser._id, blockedId });

    await Connection.deleteMany({
        $or: [
            { senderId: currentUser._id, receiverId: blockedId },
            { senderId: blockedId, receiverId: currentUser._id },
        ],
        status: 'blocked',
    });

    return { success: true, message: 'User unblocked successfully' };
};

export const fetchBlockedUsers = async ({ clerkId }) => {
    const currentUser = await resolveCurrentUser(clerkId);

    const records = await UserBlocked.find({ blockerId: currentUser._id }).populate(
        'blockedId',
        'profile.personalInfo.name profile.avatarUrl username'
    );

    const users = records
        .filter((r) => r.blockedId != null)
        .map((r) => ({
            id: r.blockedId._id,
            name: r.blockedId.profile?.personalInfo?.name || r.blockedId.username || 'Unknown',
            image: r.blockedId.profile?.avatarUrl || '',
        }));

    return { success: true, users };
};
