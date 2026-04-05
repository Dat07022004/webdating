import mongoose from 'mongoose';
import { Appointment } from '../models/appointments.model.js';
import { Review } from '../models/review.model.js';
import { User } from '../models/user.model.js';

async function resolveCurrentUser(req) {
  const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
  const clerkId = auth?.userId;
  if (!clerkId) return null;
  return User.findOne({ clerkId }).select('_id clerkId').lean();
}

export const createReview = async (req, res) => {
  try {
    const currentUser = await resolveCurrentUser(req);
    if (!currentUser) return res.status(401).json({ message: 'Unauthorized' });

    const { appointmentId, rating, tags, comment, wouldMeetAgain, revieweeUserId } = req.body;
    if (!appointmentId) return res.status(400).json({ message: 'appointmentId is required' });

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ message: 'Invalid appointmentId' });
    }

    const normalizedRating = Number(rating);
    if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return res.status(400).json({ message: 'rating must be from 1 to 5' });
    }

    const appointment = await Appointment.findById(appointmentId).lean();
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (String(appointment.userId) !== String(currentUser._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (new Date(appointment.startTime).getTime() > Date.now()) {
      return res.status(400).json({ message: 'Cannot review before appointment time' });
    }

    const existing = await Review.findOne({ appointmentId: appointment._id }).lean();
    if (existing) {
      return res.status(409).json({ message: 'Review already exists for this appointment' });
    }

    const created = await Review.create({
      appointmentId: appointment._id,
      locationId: appointment.locationId,
      reviewerUserId: currentUser._id,
      revieweeUserId:
        revieweeUserId && mongoose.Types.ObjectId.isValid(revieweeUserId)
          ? new mongoose.Types.ObjectId(revieweeUserId)
          : null,
      rating: normalizedRating,
      tags: Array.isArray(tags) ? tags.filter(Boolean).slice(0, 10) : [],
      comment: typeof comment === 'string' ? comment.trim().slice(0, 500) : '',
      wouldMeetAgain: typeof wouldMeetAgain === 'boolean' ? wouldMeetAgain : null,
    });

    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
  }
};

export const getMyReviews = async (req, res) => {
  try {
    const currentUser = await resolveCurrentUser(req);
    if (!currentUser) return res.status(401).json({ message: 'Unauthorized' });

    const reviews = await Review.find({ reviewerUserId: currentUser._id })
      .populate('locationId', 'name address category')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(reviews);
  } catch (err) {
    return res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
  }
};
