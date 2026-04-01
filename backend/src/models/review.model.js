import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    appointmentId: { type: String, required: true }, // Referencing the appointment
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Q1: Verification
    metInPerson: { type: Boolean, required: true },
    whoDidNotShow: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null 
    },

    // Q2: Reliability (Photo accuracy)
    photoAccuracy: { 
        type: Number, 
        enum: [100, 75, 40], // 90-100% -> 100, 50-80% -> 75, <50% -> 40
        required: function() { return this.metInPerson; }
    },

    // Q3: Behavior Checklist
    behaviors: [{
        type: String,
        enum: ['polite', 'engaging', 'rude', 'harassment']
    }],

    // Q4: Algorithm Optimization
    suggestSimilar: { type: Boolean, required: true },

    isProcessed: { type: Boolean, default: false }
}, { timestamps: true });

// Ensure double-blind: reviewers can't see each other's reviews easily
reviewSchema.index({ reviewerId: 1, reviewedId: 1, appointmentId: 1 }, { unique: true });

export const Review = mongoose.model('Review', reviewSchema);
