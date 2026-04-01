import mongoose from 'mongoose';

const userBannedSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    bannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        default: null // null means permanent ban
    }
}, { timestamps: true });

export const UserBanned = mongoose.model('UserBanned', userBannedSchema);
