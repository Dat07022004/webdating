import express from 'express';
import { getDateSpots, getDateSpotReviews } from '../controllers/dateSpot.controller.js';

const router = express.Router();

router.get('/', getDateSpots);
router.get('/:locationId/reviews', getDateSpotReviews);

export default router;
