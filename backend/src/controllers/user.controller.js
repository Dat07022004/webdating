import {
    getUserProfile,
    saveUserOnboarding,
    updateUserProfile,
    uploadUserPhotosToCloudinary,
    getDiscoverUsers as getDiscoverUsersService,
    handleUserAction as handleUserActionService,
    getConnections as getConnectionsService
} from '../services/user.service.js';

const createError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}; // Now delegated to service layer

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

export const getDiscoverUsers = ({ clerkId }) => getDiscoverUsersService({ clerkId });

export const handleUserAction = ({ clerkId, targetUserId, action }) => handleUserActionService({ clerkId, targetUserId, action });

export const getConnections = ({ clerkId }) => getConnectionsService({ clerkId });
