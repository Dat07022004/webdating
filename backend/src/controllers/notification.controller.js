import {
    getNotificationsByClerkId,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadCountsByClerkId
} from '../services/notification.service.js';

export const getNotifications = async ({ clerkId }) => {
    return getNotificationsByClerkId({ clerkId });
};

export const markAsRead = async ({ clerkId, id }) => {
    return markNotificationAsRead({ clerkId, id });
};

export const markAllAsRead = async ({ clerkId }) => {
    return markAllNotificationsAsRead({ clerkId });
};

export const getUnreadCounts = async ({ clerkId }) => {
    return getUnreadCountsByClerkId({ clerkId });
};
