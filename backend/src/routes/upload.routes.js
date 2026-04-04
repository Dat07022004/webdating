import express from 'express';
import multer from 'multer';
import { uploadImage } from '../controllers/upload.controller.js';
import { requireAuth } from '@clerk/express'; // ensure user is authed
import { ENV } from '../config/env.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

const authMiddleware = ENV.NODE_ENV === 'production' ? requireAuth() : (_req, _res, next) => next();

// Using custom requireAuth or clerk middleware
router.post('/image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const result = await uploadImage({ file: req.file });
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('uploadImage error:', error);
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    return res.status(statusCode).json({ success: false, message: error?.message || 'Image upload failed' });
  }
});

export default router;
