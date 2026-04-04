import express from 'express';

const router = express.Router();

// Minimal placeholder revenue routes
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Revenue endpoint (placeholder)' });
});

export default router;
