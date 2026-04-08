import express from 'express';
import {
  createReview,
  getMyReviews,
  getReceivedReviews,
  getReviewForm,
} from '../controllers/review.controller.js';

const router = express.Router();

const getAuth = (req) => (typeof req.auth === 'function' ? req.auth() : req.auth);

const resolveClerkId = (req) => {
  const auth = getAuth(req);
  return auth?.userId || req.user?.clerkId;
};

const sendError = (res, error, fallbackMessage) => {
  const statusCode =
    Number.isInteger(error?.statusCode) ? error.statusCode :
    Number.isInteger(error?.status) ? error.status : 500;
  const message = error?.message || fallbackMessage;
  return res.status(statusCode).json({ message });
};

router.get('/appointment/:appointmentId', async (req, res) => {
  try {
    const clerkId = resolveClerkId(req);
    const result = await getReviewForm({ clerkId, appointmentId: req.params.appointmentId });
    return res.status(200).json(result);
  } catch (error) {
    console.error('getReviewForm error:', error);
    return sendError(res, error, 'Failed to load review form');
  }
});

router.get('/mine', async (req, res) => {
  try {
    const clerkId = resolveClerkId(req);
    const result = await getMyReviews({ clerkId });
    return res.status(200).json(result);
  } catch (error) {
    console.error('getMyReviews error:', error);
    return sendError(res, error, 'Failed to load my reviews');
  }
});

router.get('/received', async (req, res) => {
  try {
    const clerkId = resolveClerkId(req);
    const result = await getReceivedReviews({ clerkId });
    return res.status(200).json(result);
  } catch (error) {
    console.error('getReceivedReviews error:', error);
    return sendError(res, error, 'Failed to load received reviews');
  }
});

router.post('/', async (req, res) => {
  try {
    const clerkId = resolveClerkId(req);
    const result = await createReview({ clerkId, payload: req.body || {} });
    return res.status(201).json(result);
  } catch (error) {
    console.error('createReview error:', error);
    return sendError(res, error, 'Failed to create review');
  }
});

export default router;
