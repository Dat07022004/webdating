import {
  createReviewByClerkId,
  getMyReviewsByClerkId,
  getReceivedReviewsByClerkId,
  getReviewFormByClerkId,
} from '../services/appointment.service.js';

export const createReview = async ({ clerkId, payload }) => {
  const review = await createReviewByClerkId({ clerkId, payload });
  return { review };
};

export const getReviewForm = async ({ clerkId, appointmentId }) => {
  return getReviewFormByClerkId({ clerkId, appointmentId });
};

export const getMyReviews = async ({ clerkId }) => {
  const reviews = await getMyReviewsByClerkId(clerkId);
  return { reviews };
};

export const getReceivedReviews = async ({ clerkId }) => {
  const reviews = await getReceivedReviewsByClerkId(clerkId);
  return { reviews };
};
