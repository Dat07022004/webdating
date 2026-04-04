import mongoose from 'mongoose';

/**
 * Message — một tin nhắn trong cuộc trò chuyện.
 * type: 'text' | 'image'
 * - text: content là nội dung văn bản (hỗ trợ emoji unicode)
 * - image: content là Cloudinary URL của ảnh
 */
const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // 'text' = tin nhắn văn bản / emoji
    // 'image' = ảnh (content là URL Cloudinary)
    type: {
      type: String,
      enum: ['text', 'image'],
      default: 'text',
    },

    // Nội dung: text hoặc image URL
    content: {
      type: String,
      required: true,
      trim: true,
    },

    // true khi đầu kia đã xem tin nhắn
    seen: {
      type: Boolean,
      default: false,
    },

    seenAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index để phân trang lịch sử chat
messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
