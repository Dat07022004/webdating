import mongoose from 'mongoose';

const matchSuggestionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    candidateUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, min: 0, max: 1, required: true },
    reasonTags: [{
        type: String,
        enum: ["same_interest", "nearby", "similar_behavior", "mutual_connection", "profile_similarity"]
    }],
    generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

matchSuggestionSchema.index({ userId: 1, score: -1, generatedAt: -1 });

export const MatchSuggestion = mongoose.model("MatchSuggestion", matchSuggestionSchema);
