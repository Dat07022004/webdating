import {
  getConversationsByClerkId,
  getMessagesByConversation,
  createConversationForUsers,
  markConversationSeenByClerkId
} from '../services/chat.service.js';

export const getConversations = async ({ clerkId }) => {
  return getConversationsByClerkId({ clerkId });
};

export const getMessages = async ({ clerkId, conversationId, page = 1, limit = 50 }) => {
  return getMessagesByConversation({ clerkId, conversationId, page, limit });
};

export const createConversation = async ({ clerkId, targetUserId }) => {
  return createConversationForUsers({ clerkId, targetUserId });
};

export const markConversationAsSeen = async ({ clerkId, conversationId }) => {
  return markConversationSeenByClerkId({ clerkId, conversationId });
};
