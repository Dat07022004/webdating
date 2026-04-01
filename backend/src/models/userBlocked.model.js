import mongoose from 'mongoose';

const userBlockedSchema = new mongoose.Schema({
    blockerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    blockedId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Prevent duplicate blocks between the same users
userBlockedSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

export const UserBlocked = mongoose.model('UserBlocked', userBlockedSchema);
