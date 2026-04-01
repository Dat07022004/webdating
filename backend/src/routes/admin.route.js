import { Router } from 'express';
import { getAllUsers, banUser, deleteUser, changeUserRole } from '../controllers/admin.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

const sendError = (res, error, fallbackMessage) => {
	const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
	const message = error?.message || fallbackMessage;
	return res.status(statusCode).json({ message });
};

// Apply requireAdmin to all routes in this router
router.use(requireAdmin);

router.get('/users', async (req, res) => {
	try {
		const result = await getAllUsers();
		return res.status(200).json(result);
	} catch (error) {
		console.error('Error fetching all users:', error);
		return sendError(res, error, 'Server error');
	}
});

router.post('/users/:userId/ban', async (req, res) => {
	try {
		const result = await banUser({
			userId: req.params.userId,
			body: req.body,
			adminId: req.user?._id
		});
		return res.status(200).json(result);
	} catch (error) {
		console.error('Error banning user:', error);
		return sendError(res, error, 'Server error when banning user');
	}
});

router.delete('/users/:userId', async (req, res) => {
	try {
		const result = await deleteUser({ userId: req.params.userId });
		return res.status(200).json(result);
	} catch (error) {
		console.error('Error deleting user:', error);
		return sendError(res, error, 'Server error when deleting user');
	}
});

router.put('/users/:userId/role', async (req, res) => {
	try {
		const result = await changeUserRole({
			userId: req.params.userId,
			body: req.body,
			adminId: req.user?._id
		});
		return res.status(200).json(result);
	} catch (error) {
		console.error('Error changing user role:', error);
		return sendError(res, error, 'Server error when changing role');
	}
});

export default router;
