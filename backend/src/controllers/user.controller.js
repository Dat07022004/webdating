import { User } from '../models/user.model.js';
import { Connection } from '../models/connection.model.js';
import { MatchSuggestion } from '../models/matchSuggestion.model.js';
import { Notification } from '../models/notification.model.js';
import { UserBlocked } from '../models/userBlocked.model.js';
import { getIO } from '../socket/index.js';
import { getSocketIds } from '../socket/onlineUsers.js';
import {
    getUserProfile,
    saveUserOnboarding,
    updateUserProfile,
    uploadUserPhotosToCloudinary
} from '../services/user.service.js';

const createError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

export const onboardUser = async ({ clerkId, auth, body }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    await saveUserOnboarding({ clerkId, auth, body });
    return { message: 'Onboarding data saved' };
};

export const uploadUserPhotos = async ({ clerkId, files }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    const photos = await uploadUserPhotosToCloudinary({ files: files || [], clerkId });
    return { photos };
};

export const getMyProfile = async ({ clerkId, email }) => {
    if (!clerkId && !email) {
        throw createError(401, 'Unauthorized');
    }

    const profile = await getUserProfile({ clerkId, email });
    if (!profile) {
        throw createError(404, 'Profile not found');
    }

    return { profile };
};

export const updateMyProfile = async ({ clerkId, email, body }) => {
    if (!clerkId && !email) {
        throw createError(401, 'Unauthorized');
    }

    const profile = await updateUserProfile({ clerkId, email, body: body || {} });
    if (!profile) {
        throw createError(404, 'Profile not found');
    }

    return { profile, message: 'Profile updated' };
};

export const getDiscoverUsers = async ({ clerkId }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
        throw createError(404, 'User not found');
    }

    const existingConnections = await Connection.find({
        $or: [
            { senderId: currentUser._id },
            { receiverId: currentUser._id }
        ]
    });

    const blockedRecords = await UserBlocked.find({
        $or: [
            { blockerId: currentUser._id },
            { blockedId: currentUser._id }
        ]
    });

    const excludedIdSet = new Set([currentUser._id.toString()]);
    existingConnections.forEach((conn) => {
        if (conn.senderId) {
            excludedIdSet.add(conn.senderId.toString());
        }
        if (conn.receiverId) {
            excludedIdSet.add(conn.receiverId.toString());
        }
    });

    blockedRecords.forEach((record) => {
        if (record.blockerId) {
            excludedIdSet.add(record.blockerId.toString());
        }
        if (record.blockedId) {
            excludedIdSet.add(record.blockedId.toString());
        }
    });
    const excludedIds = Array.from(excludedIdSet);

    const suggestions = await MatchSuggestion.find({ userId: currentUser._id }).populate(
       'candidateUserId',
       '_id profile username status'
    );

    let candidates = suggestions
        .filter(s => s.candidateUserId && !excludedIdSet.has(s.candidateUserId._id.toString()))
        .map(s => s.candidateUserId);

    if (candidates.length === 0) {
        candidates = await User.find({
            _id: { $nin: excludedIds }
        }).limit(20).select('_id profile username status');
        
        if (candidates.length > 0) {
             const suggestionDocs = candidates.map(c => ({
                 userId: currentUser._id,
                 candidateUserId: c._id,
                 score: 0.8
             }));
             try {
                 await MatchSuggestion.insertMany(suggestionDocs);
             } catch (insertError) {
                 console.warn('Failed to insert MatchSuggestion records:', insertError.message);
             }
        }
    }

    const mappedUsers = candidates
        .filter(user => user && user._id)
        .map(user => ({
            id: user._id.toString(),
            name: user.profile?.personalInfo?.name || user.username || 'Unknown',
            age: user.profile?.personalInfo?.age || 21,
            location: user.profile?.personalInfo?.locationText || 'Unknown location',
            bio: user.profile?.bio || 'No bio yet.',
            image: user.profile?.avatarUrl || user.profile?.photos?.find(p => p.isPrimary)?.url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop',
            interests: user.profile?.interests || [],
            verified: true,
            distance: 'Just now'
        }));

    return { users: mappedUsers };
};

export const handleUserAction = async ({ clerkId, targetUserId, action }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    if (!targetUserId || !['like', 'pass'].includes(action)) {
        throw createError(400, 'Invalid payload');
    }

    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
        throw createError(404, 'User not found');
    }

    const existingConnection = await Connection.findOne({
        $or: [
            { senderId: currentUser._id, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: currentUser._id }
        ]
    });

    if (existingConnection) {
        const isTargetTheSender = existingConnection.senderId.toString() === targetUserId;

        if (isTargetTheSender && existingConnection.status === 'pending' && action === 'like') {
            existingConnection.status = 'matched';
            await existingConnection.save();

            // Notify both users about the match
            try {
                const io = getIO();
                const targetUser = await User.findById(targetUserId).select('profile.personalInfo.name username profile.avatarUrl');
                const senderName = currentUser.profile?.personalInfo?.name || currentUser.username || 'Ai đó';
                const targetName = targetUser?.profile?.personalInfo?.name || targetUser?.username || 'Ai đó';

                await Notification.create([
                    {
                        userId: currentUser._id,
                        senderId: targetUserId,
                        type: 'match',
                        title: 'New Match!',
                        message: `Bạn và ${targetName} đã tương hợp! Bắt đầu trò chuyện ngay.`,
                        image: targetUser?.profile?.avatarUrl,
                        metadata: { connectionId: existingConnection._id }
                    },
                    {
                        userId: targetUserId,
                        senderId: currentUser._id,
                        type: 'match',
                        title: 'New Match!',
                        message: `Bạn and ${senderName} đã tương hợp! Bắt đầu trò chuyện ngay.`,
                        image: currentUser.profile?.avatarUrl,
                        metadata: { connectionId: existingConnection._id }
                    }
                ]);

                const senderSockets = getSocketIds(currentUser._id.toString());
                const receiverSockets = getSocketIds(targetUserId);
                
                [...senderSockets, ...receiverSockets].forEach(sid => io.to(sid).emit('new_notification', { type: 'match' }));

                senderSockets.forEach(sid => io.to(sid).emit('new_match', { matchWith: targetName, connectionId: existingConnection._id, userId: targetUserId }));
                receiverSockets.forEach(sid => io.to(sid).emit('new_match', { matchWith: senderName, connectionId: existingConnection._id, userId: currentUser._id.toString() }));
            } catch (socketError) {
                console.error('[Socket] Match notification failed:', socketError.message);
            }

            return { message: 'Matched', connectionId: existingConnection._id };
        }

        if (action === 'pass') {
             existingConnection.status = 'rejected';
             await existingConnection.save();
        }

        return { message: 'Action registered' };
    }

    const newConnection = new Connection({
        senderId: currentUser._id,
        receiverId: targetUserId,
        status: action === 'like' ? 'pending' : 'rejected'
    });
    await newConnection.save();

    // Notify target of anonymous like
    if (action === 'like') {
        try {
            await Notification.create({
                userId: targetUserId,
                senderId: currentUser._id,
                type: 'like',
                title: 'Someone Likes You!',
                message: 'Ai đó đã thích hồ sơ của bạn. Nâng cấp để xem là ai!',
                image: null
            });

            const io = getIO();
            const receiverSockets = getSocketIds(targetUserId);
            receiverSockets.forEach(sid => io.to(sid).emit('new_notification', { type: 'like' }));
        } catch (err) {
            console.error('[Notification] Like notification failed:', err.message);
        }
    }

    return { message: 'Action handled' };
};

export const getConnections = async ({ clerkId }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
        throw createError(404, 'User not found');
    }

    const connections = await Connection.find({
        $or: [
            { senderId: currentUser._id },
            { receiverId: currentUser._id }
        ],
        status: { $in: ['pending', 'matched'] }
    }).populate('senderId', 'profile username _id')
      .populate('receiverId', 'profile username _id');

    const matches = [];
    const likes = [];
    const sent = [];

    connections.forEach(conn => {
        const sender = conn.senderId;
        const receiver = conn.receiverId;

        // Skip orphaned connections where related users are missing to avoid runtime 500s.
        if (!sender?._id || !receiver?._id) {
            return;
        }

        const isSender = sender._id.toString() === currentUser._id.toString();
        const targetUser = isSender ? receiver : sender;

        const mappedUser = {
            id: targetUser?._id?.toString() || 'unknown',
            name: targetUser?.profile?.personalInfo?.name || targetUser?.username || 'Unknown',
            age: targetUser?.profile?.personalInfo?.age || 20,
            image: targetUser?.profile?.avatarUrl || targetUser?.profile?.photos?.find(p => p.isPrimary)?.url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&h=500&fit=crop',
            isOnline: false,
            lastActive: "Active today",
        };

        if (conn.status === 'matched') {
            matches.push(mappedUser);
        } else if (conn.status === 'pending') {
            if (isSender) {
                sent.push({ status: 'sent', user: mappedUser, sentAt: conn.createdAt });
            } else {
                likes.push({ ...mappedUser, likedAt: conn.createdAt });
            }
        }
    });

    return { matches, likes, sent };
};
