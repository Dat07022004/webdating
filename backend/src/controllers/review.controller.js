import { Review } from '../models/review.model.js';
import { User } from '../models/user.model.js';
import { Notification } from '../models/notification.model.js';

export const submitReview = async (req, res) => {
    try {
        const { appointmentId, reviewedId, metInPerson, whoDidNotShow, photoAccuracy, behaviors, suggestSimilar } = req.body;
        
        // Use user attached by requireActiveUser middleware
        const currentUser = req.user;
        if (!currentUser) return res.status(401).json({ success: false, message: 'Unauthorized' });

        // Check if user has already reviewed this appointment
        const existingReview = await Review.findOne({ 
            reviewerId: currentUser._id, 
            reviewedId, 
            appointmentId 
        });

        if (existingReview) {
            return res.status(400).json({ success: false, message: 'You have already reviewed this person for this appointment' });
        }

        const review = new Review({
            appointmentId,
            reviewerId: currentUser._id,
            reviewedId,
            metInPerson,
            whoDidNotShow: metInPerson ? null : whoDidNotShow,
            photoAccuracy: metInPerson ? photoAccuracy : undefined,
            behaviors,
            suggestSimilar
        });

        await review.save();

        // Process review impact (Logic Backend)
        await processReviewLogic(review);

        res.status(201).json({ success: true, message: 'Review submitted successfully' });
    } catch (error) {
        console.error('submitReview error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const processReviewLogic = async (review) => {
    try {
        const reviewedUser = await User.findById(review.reviewedId);
        if (!reviewedUser) return;

        // Logic 1: No-show penalty
        if (!review.metInPerson && review.whoDidNotShow) {
            const offender = await User.findById(review.whoDidNotShow);
            if (offender) {
                offender.behaviorSignals.reputationScore = Math.max(0, offender.behaviorSignals.reputationScore - 15);
                await offender.save();
            }
        }

        // Logic 2: Photo accuracy (Q2)
        if (review.metInPerson && review.photoAccuracy) {
            // Simple moving average or weighted score for accuracy
            const currentAccuracy = reviewedUser.behaviorSignals.photoAccuracy || 100;
            reviewedUser.behaviorSignals.photoAccuracy = (currentAccuracy + review.photoAccuracy) / 2;
            
            // If below 50 (different/scam), mark for check (Implicit in score)
            if (review.photoAccuracy < 50) {
                // Potential flag for admin or system notice
                console.log(`System Alert: Low photo accuracy for user ${reviewedUser._id}`);
            }
        }

        // Logic 3: Behaviors (Q3)
        if (review.behaviors && review.behaviors.length > 0) {
            let scoreChange = 0;
            review.behaviors.forEach(b => {
                if (b === 'polite' || b === 'engaging') scoreChange += 5;
                if (b === 'rude') scoreChange -= 10;
                if (b === 'harassment') {
                    scoreChange -= 50; // Heavy penalty
                    // Auto-ban if harassment is reported (Logic Backend: Negative response -> lock 1 week)
                    lockAccount(reviewedUser, 7); // 7 days
                }
            });
            reviewedUser.behaviorSignals.reputationScore = Math.max(0, reviewedUser.behaviorSignals.reputationScore + scoreChange);
        }

        // Logic 4: Lock account if many negative reviews
        // Logic 5: Suggest profile adjustment if multiple average reviews
        const reviewCount = await Review.countDocuments({ reviewedId: reviewedUser._id });
        const averageReviews = await Review.countDocuments({ 
            reviewedId: reviewedUser._id,
            photoAccuracy: { $gte: 50, $lte: 80 } 
        });

        if (averageReviews >= 2) {
            // Trigger a system notification or suggestion
            await Notification.create({
                userId: reviewedUser._id,
                type: 'system',
                title: 'Profile Suggestion',
                message: 'Dựa trên phản hồi, bạn nên cập nhật ảnh đại diện để phản ánh chính xác hơn diện mạo hiện tại của mình.',
                metadata: { suggestionType: 'photo_update' }
            });
        }

        if (reviewedUser.behaviorSignals.reputationScore < 40) {
             lockAccount(reviewedUser, 7);
        }

        await reviewedUser.save();
        
        // Mark as processed
        review.isProcessed = true;
        await review.save();

    } catch (error) {
        console.error('processReviewLogic error:', error);
    }
};

const lockAccount = async (user, days) => {
    // Implementation for locking account
    // For now, setting a hypothetical field or status
    // In a real app, this might use a separate UserBanned model or a status field
    console.log(`Locking user ${user._id} for ${days} days`);
    // Assuming status or a bannedUntil field exists
    user.status.isLocked = true;
    user.status.lockedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};
