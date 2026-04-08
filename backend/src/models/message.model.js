import mongoose from 'mongoose';
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

    type: {
      type: String,
      enum: ['text', 'image'],
      default: 'text',
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

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
messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
