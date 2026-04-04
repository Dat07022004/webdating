import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  type: { 
    type: String, 
    enum: ['match', 'message', 'like', 'appointment', 'verification', 'system'], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  image: { type: String },
  read: { type: Boolean, default: false },
  metadata: { 
    type: Object,
    default: {} 
  }
}, { timestamps: true });

// Tự động xóa thông báo sau 30 ngày (TTL Index)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const Notification = mongoose.model('Notification', notificationSchema);
