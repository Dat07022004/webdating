import { User } from '../models/user.model.js';
import { UserBlocked } from '../models/userBlocked.model.js';
import { Report } from '../models/report.model.js';
import { Connection } from '../models/connection.model.js';

const createError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

export const reportUser = async ({ clerkId, reportedId, reason, description }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
        throw createError(404, 'User not found');
    }

    const report = new Report({
        reporterId: currentUser._id,
        reportedId,
        reason,
        description: description || 'No description provided'
    });

    await report.save();

    return { success: true, message: 'Report submitted successfully' };
};

export const blockUser = async ({ clerkId, blockedId }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
        throw createError(404, 'User not found');
    }

    // 1. Add to UserBlocked
    await UserBlocked.findOneAndUpdate(
        { blockerId: currentUser._id, blockedId },
        { blockerId: currentUser._id, blockedId },
        { upsert: true }
    );

    // 2. Remove from matches (Update connection status to 'blocked')
    await Connection.updateMany(
        {
            $or: [
                { senderId: currentUser._id, receiverId: blockedId },
                { senderId: blockedId, receiverId: currentUser._id }
            ]
        },
        { status: 'blocked' }
    );

    return { success: true, message: 'User blocked successfully' };
};

export const unblockUser = async ({ clerkId, blockedId }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
        throw createError(404, 'User not found');
    }

    // 1. Remove from UserBlocked
    await UserBlocked.findOneAndDelete({ blockerId: currentUser._id, blockedId });

    // 2. Potentially restore connection status? 
    // The requirement says "Người bị gỡ block sẽ xuất hiện lại trên discover". 
    // Usually, we don't restore connections, but we could set it to 'rejected' or just delete it 
    // so they can find each other again in Discover. 
    // Let's delete the blocked connection so it doesn't count as an existing connection anymore.
    await Connection.deleteMany({
        $or: [
            { senderId: currentUser._id, receiverId: blockedId },
            { senderId: blockedId, receiverId: currentUser._id }
        ],
        status: 'blocked'
    });

    return { success: true, message: 'User unblocked successfully' };
};

export const getBlockedUsers = async ({ clerkId }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
        throw createError(404, 'User not found');
    }

    const blockedRecords = await UserBlocked.find({ blockerId: currentUser._id })
        .populate('blockedId', 'profile.personalInfo.name profile.avatarUrl username');

    const blockedUsers = blockedRecords.map(record => ({
        id: record.blockedId._id,
        name: record.blockedId.profile?.personalInfo?.name || record.blockedId.username || 'Unknown',
        image: record.blockedId.profile?.avatarUrl || ''
    }));

    return { success: true, users: blockedUsers };
};
