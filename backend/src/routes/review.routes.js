import express from 'express';
import { createReview, getMyReviews } from '../controllers/review.controller.js';

const router = express.Router();

router.get('/me', getMyReviews);
router.post('/', createReview);

export default router;
