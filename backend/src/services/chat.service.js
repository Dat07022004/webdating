import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';
import { User } from '../models/user.model.js';

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

export const getConversationsByClerkId = async ({ clerkId }) => {
    const user = await resolveUserByClerkId(clerkId);

    const conversations = await Conversation.find({ participants: user._id })
        .populate({
            path: 'participants',
            select: 'profile.personalInfo.name profile.avatarUrl status clerkId',
        })
        .populate('lastMessage')
        .sort({ updatedAt: -1 });

    return { conversations };
};

export const getMessagesByConversation = async ({ clerkId, conversationId, page = 1, limit = 50 }) => {
    const user = await resolveUserByClerkId(clerkId);

    const conversation = await Conversation.findById(conversationId);
    const isParticipant = conversation?.participants?.some(
        (participantId) => participantId.toString() === user._id.toString()
    );

    if (!conversation || !isParticipant) {
        throw createError(403, 'Access denied');
    }

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const messages = await Message.find({ conversationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit);

    return { messages: messages.reverse() };
};

export const createConversationForUsers = async ({ clerkId, targetUserId }) => {
    const user = await resolveUserByClerkId(clerkId);

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

export const markConversationSeenByClerkId = async ({ clerkId, conversationId }) => {
    const user = await resolveUserByClerkId(clerkId);

    await Message.updateMany(
        { conversationId, receiverId: user._id, seen: false },
        { $set: { seen: true, seenAt: new Date() } }
    );

    return { success: true, message: 'Conversation marked as seen' };
};
