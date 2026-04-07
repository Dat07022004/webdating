import { createReviewByClerkId, getMyReviewsByClerkId } from '../services/appointment.service.js';

export const createReview = async ({ clerkId, payload }) => {
  return createReviewByClerkId({
    clerkId,
    payload: payload || {}
  });
};

export const getMyReviews = async ({ clerkId }) => {
  return getMyReviewsByClerkId(clerkId);
};
