import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';
import { User } from '../models/user.model.js';
import { Block } from '../models/safety.js';

export const getConversations = async (req, res) => {
  try {
    const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
    const clerkId = auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findOne({ clerkId }).select('_id');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const userId = user._id;

    // Lấy danh sách những người bị chặn hoặc đã chặn user này
    const blocks = await Block.find({
      $or: [
        { blockerId: userId },
        { blockedId: userId }
      ]
    });

    const blockedUserIds = blocks.map(b => 
      b.blockerId.toString() === userId.toString() ? b.blockedId.toString() : b.blockerId.toString()
    );

    // Lấy danh sách conversation của user, sắp xếp theo tin nhắn mới nhất
    const conversations = await Conversation.find({ 
        participants: userId,
        participants: { $nin: blockedUserIds } // Loại bỏ conversation với người bị chặn
      })
      .populate({
        path: 'participants',
        select: 'profile.personalInfo.name profile.avatarUrl status clerkId',
      })
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    console.error('getConversations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    if (!clerkId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Kiểm tra user có quyền truy cập không
    const user = await User.findOne({ clerkId }).select('_id');
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation || !conversation.participants.includes(user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Đảo ngược lại để trả về theo thứ tự thời gian cũ -> mới (tiện cho frontend render)
    res.status(200).json({ success: true, data: messages.reverse() });
  } catch (error) {
    console.error('getMessages error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createConversation = async (req, res) => {
  try {
    const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
    const clerkId = auth?.userId;
    if (!clerkId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { targetUserId } = req.body; // targetUserId là MongoDB ObjectId của người kia

    const user = await User.findOne({ clerkId }).select('_id');
    const userId = user._id;

    // Check if either user has blocked the other
    const blockExists = await Block.findOne({
        $or: [
            { blockerId: userId, blockedId: targetUserId },
            { blockerId: targetUserId, blockedId: userId }
        ]
    });

    if (blockExists) {
        return res.status(403).json({ success: false, message: "Cannot message a blocked user" });
    }

    // Kiểm tra xem đã có conversation giữa 2 người chưa
    let conversation = await Conversation.findOne({
      participants: { $all: [user._id, targetUserId] }
    }).populate('participants', 'profile.personalInfo.name profile.avatarUrl status clerkId');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [user._id, targetUserId]
      });
      // Populate thông tin người tham gia
      conversation = await conversation.populate('participants', 'profile.personalInfo.name profile.avatarUrl status clerkId');
    }

    res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    console.error('createConversation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
