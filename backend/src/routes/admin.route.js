import express from 'express';

const router = express.Router();

// Minimal placeholder admin routes
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Admin endpoint (placeholder)' });
});

export default router;
