import { Notification } from '../models/notification.model.js';
import { User } from '../models/user.model.js';
import { Message } from '../models/message.model.js';

const createError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const resolveUserByClerkId = async (clerkId) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    const user = await User.findOne({ clerkId }).select('_id');
    if (!user) {
        throw createError(404, 'User not found');
    }

    return user;
};

export const getNotificationsByClerkId = async ({ clerkId }) => {
    const user = await resolveUserByClerkId(clerkId);

    const notifications = await Notification.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(50);

    return { notifications };
};

export const markNotificationAsRead = async ({ clerkId, id }) => {
    const user = await resolveUserByClerkId(clerkId);

    const notification = await Notification.findOneAndUpdate(
        { _id: id, userId: user._id },
        { read: true },
        { new: true }
    );

    if (!notification) {
        throw createError(404, 'Notification not found');
    }

    return { notification };
};

export const markAllNotificationsAsRead = async ({ clerkId }) => {
    const user = await resolveUserByClerkId(clerkId);

    await Notification.updateMany(
        { userId: user._id, read: false },
        { read: true }
    );

    return { message: 'All notifications marked as read' };
};

export const getUnreadCountsByClerkId = async ({ clerkId }) => {
    const user = await resolveUserByClerkId(clerkId);

    const notificationCount = await Notification.countDocuments({
        userId: user._id,
        read: false
    });

    const unreadConversations = await Message.distinct('conversationId', {
        receiverId: user._id,
        seen: false
    });

    return {
        notificationCount,
        messageCount: unreadConversations.length
    };
};
