import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadImage } from '../controllers/upload.controller.js';
import { requireAuth } from '@clerk/express'; // ensure user is authed

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Navigate from backend to frontend/public/uploads
    cb(null, path.join(process.cwd(), '../frontend/public/uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

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

// Using custom requireAuth or clerk middleware
router.post('/image', requireAuth(), upload.single('image'), uploadImage);

export default router;
