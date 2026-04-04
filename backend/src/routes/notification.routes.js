import express from 'express';

const router = express.Router();

// Minimal placeholder notification routes
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Notifications endpoint (placeholder)' });
});

export default router;
