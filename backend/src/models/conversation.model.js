import mongoose from 'mongoose';

/**
 * Conversation — cuộc trò chuyện 1-1 giữa 2 user đã match nhau.
 * Được tạo 1 lần duy nhất khi 2 user match.
 */
const conversationSchema = new mongoose.Schema(
  {
    // Luôn là mảng 2 phần tử — 2 người tham gia cuộc trò chuyện
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],

    // Tin nhắn cuối cùng — dùng để hiển thị preview trong danh sách chat
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },

    // Số tin nhắn chưa đọc của từng participant (key = userId string)
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

// Index để query nhanh conversation của một user
conversationSchema.index({ participants: 1 });

// Index compound — tìm conversation giữa 2 người cụ thể
conversationSchema.index({ participants: 1, updatedAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
