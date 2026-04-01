import { Notification } from '../models/notification.model.js';
import { User } from '../models/user.model.js';
import { Message } from '../models/message.model.js';

export const getNotifications = async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    if (!clerkId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findOne({ clerkId }).select('_id');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const notifications = await Notification.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50); // Chỉ lấy 50 thông báo gần nhất

    res.status(200).json({ notifications });
  } catch (error) {
    console.error('getNotifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const clerkId = req.auth.userId;

    const user = await User.findOne({ clerkId }).select('_id');
    
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: user._id },
      { read: true },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    res.status(200).json({ notification });
  } catch (error) {
    console.error('markAsRead error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const user = await User.findOne({ clerkId }).select('_id');

    await Notification.updateMany(
      { userId: user._id, read: false },
      { read: true }
    );

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('markAllAsRead error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUnreadCounts = async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const user = await User.findOne({ clerkId }).select('_id');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Đếm số lượng thông báo chưa đọc
    const notificationCount = await Notification.countDocuments({ 
      userId: user._id, 
      read: false 
    });

    // Đếm số lượng cuộc hội thoại có tin nhắn chưa đọc (đã gửi tới tôi)
    const unreadConvs = await Message.distinct('conversationId', {
      receiverId: user._id,
      seen: false
    });

    res.status(200).json({ 
      notificationCount, 
      messageCount: unreadConvs.length 
    });
  } catch (error) {
    console.error('getUnreadCounts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
