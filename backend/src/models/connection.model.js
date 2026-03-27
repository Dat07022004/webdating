import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    interactionType: {
        type: String,
        enum: ["like", "friend_request", "match_invite"],
        default: "like"
    },
    status: {
        type: String,
        enum: ["pending", "liked", "matched", "accepted", "rejected", "blocked", "canceled"],
        default: "pending" },
    matchedBy: {
        type: String,
        enum: ["manual", "geo", "interest", "behavior", "hybrid"],
        default: "manual"
    },
    matchedScore: { type: Number, min: 0, max: 1 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

connectionSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });
connectionSchema.index({ receiverId: 1, status: 1, createdAt: -1 });

export const Connection = mongoose.model("Connection", connectionSchema);
