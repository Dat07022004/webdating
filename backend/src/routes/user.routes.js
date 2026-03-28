import { Router } from 'express';
import multer from 'multer';
import { getMyProfile, onboardUser, updateMyProfile, uploadUserPhotos, getDiscoverUsers, handleUserAction, getConnections } from '../controllers/user.controller.js';

const router = Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		files: 6,
		fileSize: 8 * 1024 * 1024
	}
});

router.post('/onboarding', onboardUser);
router.post('/photos/upload', upload.array('photos', 6), uploadUserPhotos);
router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);
router.get('/discover', getDiscoverUsers);
router.post('/action', handleUserAction);
router.get('/connections', getConnections);

export default router;
