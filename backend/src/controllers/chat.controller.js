import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';
import { User } from '../models/user.model.js';

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const getConversations = async ({ clerkId }) => {
  if (!clerkId) {
    throw createError(401, 'Unauthorized');
  }

  const user = await User.findOne({ clerkId }).select('_id');
  if (!user) {
    throw createError(404, 'User not found');
  }

  const conversations = await Conversation.find({ participants: user._id })
    .populate({
      path: 'participants',
      select: 'profile.personalInfo.name profile.avatarUrl status clerkId',
    })
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

  return { conversations };
};

export const getMessages = async ({ clerkId, conversationId, page = 1, limit = 50 }) => {
  if (!clerkId) {
    throw createError(401, 'Unauthorized');
  }

  const user = await User.findOne({ clerkId }).select('_id');
  if (!user) {
    throw createError(404, 'User not found');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.participants.includes(user._id)) {
    throw createError(403, 'Access denied');
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const messages = await Message.find({ conversationId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10));

  return { messages: messages.reverse() };
};

export const createConversation = async ({ clerkId, targetUserId }) => {
  if (!clerkId) {
    throw createError(401, 'Unauthorized');
  }

  const user = await User.findOne({ clerkId }).select('_id');
  if (!user) {
    throw createError(404, 'User not found');
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [user._id, targetUserId] }
  }).populate('participants', 'profile.personalInfo.name profile.avatarUrl status clerkId');

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [user._id, targetUserId]
    });
    conversation = await conversation.populate('participants', 'profile.personalInfo.name profile.avatarUrl status clerkId');
  }

  return { conversation };
};
