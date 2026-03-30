import { Router } from 'express';
import { handleReportAndBlock, getBlockedUsers, unblockUser } from '../controllers/safety.controller.js';

const router = Router();

// Route: POST /api/safety/report
router.post('/report', handleReportAndBlock);

// Route: GET /api/safety/blocked
router.get('/blocked', getBlockedUsers);

// Route: DELETE /api/safety/unblock/:targetUserId
router.delete('/unblock/:targetUserId', unblockUser);

export default router;