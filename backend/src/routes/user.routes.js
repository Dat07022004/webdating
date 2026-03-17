import { Router } from 'express';
import { onboardUser } from '../controllers/user.controller.js';

const router = Router();

router.post('/onboarding', onboardUser);

export default router;
