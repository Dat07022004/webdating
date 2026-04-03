import { Router } from 'express';
import { fetchRevenueOverview, fetchRevenueTransactions } from '../controllers/revenue.controller.js';
import { requireManagerOrAdmin } from '../middleware/auth.middleware.js';

const router = Router();

const sendError = (res, error, fallbackMessage) => {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    const message = error?.message || fallbackMessage;
    return res.status(statusCode).json({ message });
};

router.use(requireManagerOrAdmin);

router.get('/overview', async (req, res) => {
    try {
        const result = await fetchRevenueOverview({ query: req.query });
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching revenue overview:', error);
        return sendError(res, error, 'Failed to fetch revenue overview');
    }
});

router.get('/transactions', async (req, res) => {
    try {
        const result = await fetchRevenueTransactions({ query: req.query });
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching revenue transactions:', error);
        return sendError(res, error, 'Failed to fetch revenue transactions');
    }
});

export default router;
