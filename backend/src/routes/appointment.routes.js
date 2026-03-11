import express from 'express';
import { Appointment } from '../models/appointment.model.js';

const router = express.Router();

const DATE_SUGGESTION_LOCATIONS = [
  { name: 'The Rustics Coffee', address: 'Q. Hoan Kiem, Ha Noi', baseCost: 180000 },
  { name: 'Lotte Cinema', address: 'Q. Ba Dinh, Ha Noi', baseCost: 420000 },
  { name: 'Ho Tay Walk + Ice Cream', address: 'Q. Tay Ho, Ha Noi', baseCost: 120000 },
  { name: 'Bui Vien Food Tour', address: 'Q. 1, TP.HCM', baseCost: 350000 },
  { name: 'Starlight Rooftop', address: 'Q. Hai Chau, Da Nang', baseCost: 300000 },
  { name: 'Boardgame Cafe', address: 'Q. Ninh Kieu, Can Tho', baseCost: 220000 },
];

const TIME_SLOTS = [
  { label: 'Sang thu bay', hour: 9 },
  { label: 'Chieu cuoi tuan', hour: 16 },
  { label: 'Toi lang man', hour: 19 },
];

const getClerkId = (req) => req.auth?.userId;

const parseDateInput = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildDateSuggestions = ({ budget = 'medium' }) => {
  const budgetMultiplierMap = {
    low: 0.75,
    medium: 1,
    high: 1.35,
  };

  const multiplier = budgetMultiplierMap[budget] || 1;
  const now = new Date();
  const suggestions = [];

  for (let i = 0; i < 3; i += 1) {
    const location = DATE_SUGGESTION_LOCATIONS[(now.getDate() + i) % DATE_SUGGESTION_LOCATIONS.length];
    const slot = TIME_SLOTS[i % TIME_SLOTS.length];

    const date = new Date(now);
    date.setDate(now.getDate() + i + 1);
    date.setHours(slot.hour, 0, 0, 0);

    suggestions.push({
      title: `Hen ho ${slot.label.toLowerCase()}`,
      dateTime: date,
      locationName: location.name,
      locationAddress: location.address,
      estimatedCost: Math.round(location.baseCost * multiplier),
      notes: `Goi y dua tren ngan sach ${budget}.`,
    });
  }

  return suggestions;
};

router.get('/suggestions', async (req, res) => {
  const clerkId = getClerkId(req);

  if (!clerkId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const budget = String(req.query.budget || 'medium').toLowerCase();
  const suggestions = buildDateSuggestions({ budget });

  return res.status(200).json({ suggestions });
});

router.get('/', async (req, res) => {
  const clerkId = getClerkId(req);

  if (!clerkId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const appointments = await Appointment.find({ clerkId }).sort({ dateTime: 1 });
  return res.status(200).json({ appointments });
});

router.post('/', async (req, res) => {
  const clerkId = getClerkId(req);

  if (!clerkId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const dateTime = parseDateInput(req.body.dateTime);
  if (!dateTime) {
    return res.status(400).json({ message: 'Invalid dateTime value' });
  }

  const payload = {
    clerkId,
    title: String(req.body.title || '').trim(),
    dateTime,
    locationName: String(req.body.locationName || '').trim(),
    locationAddress: String(req.body.locationAddress || '').trim(),
    estimatedCost: Number(req.body.estimatedCost || 0),
    notes: String(req.body.notes || '').trim(),
    status: String(req.body.status || 'planned'),
    createdBySuggestion: Boolean(req.body.createdBySuggestion),
  };

  if (!payload.title || !payload.locationName) {
    return res.status(400).json({ message: 'title and locationName are required' });
  }

  const appointment = await Appointment.create(payload);
  return res.status(201).json({ appointment });
});

router.put('/:id', async (req, res) => {
  const clerkId = getClerkId(req);

  if (!clerkId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const update = {};

  if (req.body.title !== undefined) update.title = String(req.body.title).trim();
  if (req.body.locationName !== undefined) update.locationName = String(req.body.locationName).trim();
  if (req.body.locationAddress !== undefined) update.locationAddress = String(req.body.locationAddress).trim();
  if (req.body.notes !== undefined) update.notes = String(req.body.notes).trim();
  if (req.body.status !== undefined) update.status = String(req.body.status);
  if (req.body.estimatedCost !== undefined) update.estimatedCost = Number(req.body.estimatedCost);
  if (req.body.dateTime !== undefined) {
    const parsed = parseDateInput(req.body.dateTime);
    if (!parsed) {
      return res.status(400).json({ message: 'Invalid dateTime value' });
    }
    update.dateTime = parsed;
  }

  const appointment = await Appointment.findOneAndUpdate(
    { _id: req.params.id, clerkId },
    update,
    { new: true, runValidators: true }
  );

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  return res.status(200).json({ appointment });
});

router.delete('/:id', async (req, res) => {
  const clerkId = getClerkId(req);

  if (!clerkId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const appointment = await Appointment.findOneAndDelete({ _id: req.params.id, clerkId });

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  return res.status(200).json({ message: 'Deleted successfully' });
});

export default router;
