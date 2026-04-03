import { Notification } from '../models/notification.model.js';
import { User } from '../models/user.model.js';
import { Message } from '../models/message.model.js';

const createError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

export const getNotifications = async ({ clerkId }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    const user = await User.findOne({ clerkId }).select('_id');
    if (!user) {
        throw createError(404, 'User not found');
    }

    const notifications = await Notification.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(50);

    return { notifications };
};

export const markAsRead = async ({ clerkId, id }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    const user = await User.findOne({ clerkId }).select('_id');
    if (!user) {
        throw createError(404, 'User not found');
    }
    
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

export const markAllAsRead = async ({ clerkId }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    const user = await User.findOne({ clerkId }).select('_id');
    if (!user) {
        throw createError(404, 'User not found');
    }

    await Notification.updateMany(
        { userId: user._id, read: false },
        { read: true }
    );

    return { message: 'All notifications marked as read' };
};

export const getUnreadCounts = async ({ clerkId }) => {
    if (!clerkId) {
        throw createError(401, 'Unauthorized');
    }

    const user = await User.findOne({ clerkId }).select('_id');
    if (!user) {
        throw createError(404, 'User not found');
    }

    const notificationCount = await Notification.countDocuments({ 
        userId: user._id, 
        read: false 
    });

    const unreadConvs = await Message.distinct('conversationId', {
        receiverId: user._id,
        seen: false
    });

    return { 
        notificationCount, 
        messageCount: unreadConvs.length 
    };
};
