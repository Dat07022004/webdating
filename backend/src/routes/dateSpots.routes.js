import express from 'express';
import { getDateSpots, getDateSpotReviews } from '../controllers/dateSpot.controller.js';

const router = express.Router();

const sendError = (res, error, fallbackMessage) => {
	const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : Number.isInteger(error?.status) ? error.status : 500;
	const message = error?.message || fallbackMessage;
	return res.status(statusCode).json({ message });
};

router.get('/', async (req, res) => {
	try {
		const result = await getDateSpots({ query: req.query });
		return res.status(200).json(result);
	} catch (error) {
		console.error('Error fetching date spots:', error);
		return sendError(res, error, 'Server error while fetching date spots');
	}
});

router.get('/:locationId/reviews', async (req, res) => {
	try {
		const result = await getDateSpotReviews({ locationId: req.params.locationId });
		return res.status(200).json(result);
	} catch (error) {
		console.error('Error fetching date spot reviews:', error);
		return sendError(res, error, 'Server error while fetching date spot reviews');
	}
});

export default router;
