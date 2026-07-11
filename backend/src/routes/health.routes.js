import { Router } from 'express';
import { databaseHealthCheck, healthCheck } from '../controllers/health.controller.js';

const router = Router();

router.get('/health', (req, res) => {
	res.status(200).json(healthCheck());
});

router.get('/health/db', async (req, res) => {
	const result = await databaseHealthCheck();
	res.status(result.status).json(result.body);
});

export default router;
