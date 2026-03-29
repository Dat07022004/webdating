import { Router } from 'express';
import { getAllUsers, banUser, deleteUser, changeUserRole } from '../controllers/admin.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Apply requireAdmin to all routes in this router
router.use(requireAdmin);

router.get('/users', getAllUsers);
router.post('/users/:userId/ban', banUser);
router.delete('/users/:userId', deleteUser);
router.put('/users/:userId/role', changeUserRole);

export default router;
