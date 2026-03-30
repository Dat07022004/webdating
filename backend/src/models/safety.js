import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema({
    blockerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blockedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

const reportSchema = new mongoose.Schema({
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { 
        type: String, 
        required: true,
        enum: ['Scam', 'Harassment', 'Fake Profile', 'Hate Speech', 'Other']
    },
    details: { type: String, default: '' }, // User's custom input for chat-like feedback
    status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' }
}, { timestamps: true });

// Prevent duplicate blocks between the same two users
blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

export const Block = mongoose.model('Block', blockSchema);
export const Report = mongoose.model('Report', reportSchema);