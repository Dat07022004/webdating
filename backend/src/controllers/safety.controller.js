import { submitReport, blockUserById, unblockUserById, fetchBlockedUsers } from '../services/safety.service.js';

export const reportUser = ({ clerkId, reportedId, reason, description }) =>
    submitReport({ clerkId, reportedId, reason, description });

export const blockUser = ({ clerkId, blockedId }) =>
    blockUserById({ clerkId, blockedId });

export const unblockUser = ({ clerkId, blockedId }) =>
    unblockUserById({ clerkId, blockedId });

export const getBlockedUsers = ({ clerkId }) =>
    fetchBlockedUsers({ clerkId });
