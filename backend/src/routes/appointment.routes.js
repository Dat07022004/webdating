import { Router } from 'express';
import { createAppointment, getMyAppointments } from '../controllers/appointment.controller.js';
import { requireActiveUser } from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth middleware to all appointment routes
router.use(requireActiveUser);

router.post('/create', createAppointment);
router.get('/my', getMyAppointments);

export default router;
