import { Router } from 'express';
import { healthCheck } from '../controllers/health.controller.js';

const router = Router();

router.get('/health', (req, res) => {
	res.status(200).json(healthCheck());
});

export default router;
