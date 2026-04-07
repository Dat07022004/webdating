import mongoose from 'mongoose';
import { Appointment, Location } from '../models/appointments.model.js';
import { Review } from '../models/review.model.js';
import { User } from '../models/user.model.js';
import { sendMail } from '../lib/mailer.js';

/**
 * Service layer for appointments
 */

export async function suggestAppointments({ userId, category, budget, date }) {
  if (!userId || !category || budget == null || !date) {
    throw createServiceError(400, 'Missing required fields');
  }

  const dayStart = new Date(`${date}T00:00:00`);
  if (Number.isNaN(dayStart.getTime())) throw createServiceError(400, 'Invalid date');
  const dayEnd = new Date(`${date}T23:59:59.999`);

  const locations = await Location.find({ category, averagePrice: { $lte: budget } })
    .sort({ averagePrice: 1 })
    .limit(30)
    .lean();

  if (!locations.length) return [];

  const userAppointments = await Appointment.find({
    userId: new mongoose.Types.ObjectId(userId),
    status: { $nin: ['cancelled', 'completed'] },
    $or: [
      { startTime: { $gte: dayStart, $lt: dayEnd } },
      { endTime: { $gte: dayStart, $lt: dayEnd } },
      { $and: [{ startTime: { $lt: dayStart } }, { endTime: { $gt: dayEnd } }] },
    ],
  }).lean();

  const locationIds = locations.map((l) => l._id).filter(Boolean);
  const locationAppointments = locationIds.length
    ? await Appointment.find({
        locationId: { $in: locationIds },
        status: { $nin: ['cancelled', 'completed'] },
        $or: [
          { startTime: { $gte: dayStart, $lt: dayEnd } },
          { endTime: { $gte: dayStart, $lt: dayEnd } },
          { $and: [{ startTime: { $lt: dayStart } }, { endTime: { $gt: dayEnd } }] },
        ],
      }).lean()
    : [];

  const SLOT_MINUTES = 60;
  const DAY_OPEN_HOUR = 9;
  const DAY_CLOSE_HOUR = 21;

  function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
  }

  function makeDateTime(dateStr, hour, minute = 0) {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  const suggestions = [];

  for (const loc of locations) {
    if (suggestions.length >= 3) break;

    for (let h = DAY_OPEN_HOUR; h <= DAY_CLOSE_HOUR - 1; h++) {
      if (suggestions.length >= 3) break;

      const slotStart = makeDateTime(date, h, 0);
      const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60_000);

      const conflictWithUser = userAppointments.some((ap) =>
        overlaps(slotStart, slotEnd, new Date(ap.startTime), new Date(ap.endTime))
      );
      if (conflictWithUser) continue;

      const conflictWithLocation = locationAppointments.some((ap) =>
        ap.locationId?.toString() === loc._id.toString() && overlaps(slotStart, slotEnd, new Date(ap.startTime), new Date(ap.endTime))
      );
      if (conflictWithLocation) continue;

      suggestions.push({
        location: {
          id: loc._id.toString(),
          name: loc.name,
          address: loc.address,
          category: loc.category,
          averagePrice: loc.averagePrice,
        },
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        estimatedCost: loc.averagePrice,
      });
    }
  }

  return suggestions.slice(0, 3);
}

/**
 * Validate booking rules before creating an appointment.
 * - selectedTime must not be in the past
 * - user must not already have an active (pending/confirmed/scheduled) appointment
 * Returns true when valid, otherwise throws an Error with a Vietnamese message.
 */
export async function validateBooking({ userId, selectedTime }) {
  if (!userId) throw new Error('Missing userId');
  if (!selectedTime) throw new Error('Missing selectedTime');

  const sel = new Date(selectedTime);
  if (Number.isNaN(sel.getTime())) throw new Error('Invalid selectedTime');

  const now = new Date();
  // If selected time is strictly before now -> reject
  if (sel.getTime() < now.getTime()) {
    const err = new Error('Không thể chọn thời gian trong quá khứ');
    err.status = 400;
    err.statusCode = 400;
    throw err;
  }

  // Check for existing active appointments for this user.
  // Treat appointments with status 'cancelled' or 'completed' as inactive.
  // Any appointment not cancelled/completed and with endTime in future (or no endTime) is considered active.
  const activeStatuses = { $nin: ['cancelled', 'completed'] };

  const clause = {
    userId: new mongoose.Types.ObjectId(userId),
    status: activeStatuses,
  };

  // also ensure it's not a past appointment by checking endTime > now or endTime missing
  clause.$or = [
    { endTime: { $gt: now } },
    { endTime: { $exists: false } },
  ];

  const existing = await Appointment.findOne(clause).lean();
  if (existing) {
    const err = new Error('Bạn đang có một lịch hẹn chưa hoàn thành');
    err.status = 409;
    err.statusCode = 409;
    throw err;
  }

  return true;
}

export async function createAppointment({ userId, locationId, startTime, totalCost, note }) {
  if (!userId || !locationId || !startTime) {
    throw createServiceError(400, 'Missing required fields');
  }

  // Validate booking before proceeding
  await validateBooking({ userId, selectedTime: startTime });

  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) throw createServiceError(400, 'Invalid startTime');

  const intendedEnd = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const location = await Location.findById(locationId).exec();
  if (!location) throw createServiceError(404, 'Location not found');

  const session = await mongoose.startSession();
  let saved;

  await session.withTransaction(async () => {
    const conflict = await Appointment.findOne({
      locationId: location._id,
      status: { $nin: ['cancelled', 'completed'] },
      startTime: { $lt: intendedEnd },
      endTime: { $gt: start },
    }).session(session).exec();

    if (conflict) {
      const err = new Error('Time slot occupied');
      err.status = 409;
      err.statusCode = 409;
      throw err;
    }

    const [created] = await Appointment.create([
      {
        userId: new mongoose.Types.ObjectId(userId),
        locationId: location._id,
        startTime: start,
        note: typeof note === 'string' ? note.trim().slice(0, 300) : '',
        totalCost: totalCost ?? location.averagePrice,
      },
    ], { session });

    saved = created;
  });

  await session.endSession();

  // Send booking confirmation email to user (best-effort)
  try {
    const usersColl = mongoose.connection.collection('users');
    const userDoc = await usersColl.findOne({ _id: new mongoose.Types.ObjectId(userId) });
    const toEmail = userDoc?.email;
    if (toEmail) {
      const locationName = location?.name || 'địa điểm';
      const startStr = new Date(saved.startTime).toLocaleString();
      await sendMail({
        to: toEmail,
        subject: `Xác nhận lịch hẹn tại ${locationName}`,
        text: `Bạn đã đặt lịch hẹn tại ${locationName} vào ${startStr}. Chi phí dự kiến: ${saved.totalCost || 'N/A'}`,
      });
    }
  } catch (mailErr) {
    console.warn('Failed to send booking email', mailErr);
  }

  return saved;
}

export async function getAppointmentsByUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) throw createServiceError(400, 'Invalid userId');
  const appts = await Appointment.find({ userId: new mongoose.Types.ObjectId(userId) }).populate('locationId').sort({ startTime: 1 }).exec();
  return appts;
}

export async function updateAppointment(id, { startTime, status }) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createServiceError(400, 'Invalid appointment id');
  const appt = await Appointment.findById(id).exec();
  if (!appt) throw createServiceError(404, 'Appointment not found');

  if (startTime) {
    const newStart = new Date(startTime);
    if (Number.isNaN(newStart.getTime())) throw createServiceError(400, 'Invalid startTime');
    const newEnd = new Date(newStart.getTime() + 2 * 60 * 60 * 1000);

    const conflict = await Appointment.findOne({
      locationId: appt.locationId,
      _id: { $ne: appt._id },
      status: { $nin: ['cancelled', 'completed'] },
      startTime: { $lt: newEnd },
      endTime: { $gt: newStart },
    }).exec();

    if (conflict) {
      const err = new Error('Time slot occupied');
      err.status = 409;
      err.statusCode = 409;
      throw err;
    }

    appt.startTime = newStart;
    appt.endTime = newEnd;
  }

  if (status) appt.status = status;

  const saved = await appt.save();
  return saved;
}

export async function cancelAppointment(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createServiceError(400, 'Invalid appointment id');
  const appt = await Appointment.findById(id).populate('locationId', 'name').exec();
  if (!appt) throw createServiceError(404, 'Appointment not found');
  appt.status = 'cancelled';
  const saved = await appt.save();

  // Send cancellation email to user (best-effort)
  try {
    const usersColl = mongoose.connection.collection('users');
    const userDoc = await usersColl.findOne({ _id: new mongoose.Types.ObjectId(appt.userId) });
    const toEmail = userDoc?.email;
    if (toEmail) {
      const locationName = appt.locationId?.name || 'địa điểm';
      const startStr = new Date(appt.startTime).toLocaleString();
      await sendMail({
        to: toEmail,
        subject: `Hủy lịch hẹn tại ${locationName}`,
        text: `Lịch hẹn tại ${locationName} vào ${startStr} đã bị hủy.`,
      });
    }
  } catch (mailErr) {
    console.warn('Failed to send cancellation email', mailErr);
  }

  return saved;
}

function createServiceError(status, message) {
  const err = new Error(message);
  err.status = status;
  err.statusCode = status;
  return err;
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function resolveUserObjectId(candidate) {
  if (!candidate) return null;

  const raw = String(candidate);
  if (mongoose.Types.ObjectId.isValid(raw)) return raw;

  const user = await User.findOne({ clerkId: raw }).select('_id').lean();
  return user?._id?.toString() || null;
}

export async function ensureAppointmentOwner({ appointmentId, requesterObjectId }) {
  const appt = await Appointment.findById(appointmentId).lean();
  if (!appt) {
    throw createServiceError(404, 'Appointment not found');
  }

  if (String(appt.userId) !== String(requesterObjectId)) {
    throw createServiceError(403, 'Forbidden');
  }

  return appt;
}

export async function getDateSpotsWithRatings(query = {}) {
  const { search = '', category, budget } = query;
  const page = parsePositiveNumber(query.page, 1);
  const limit = Math.min(parsePositiveNumber(query.limit, 12), 50);
  const skip = (page - 1) * limit;

  const match = {};
  if (category && category !== 'all') {
    match.category = category;
  }

  if (budget != null && budget !== '') {
    const parsedBudget = Number(budget);
    if (!Number.isFinite(parsedBudget)) {
      throw createServiceError(400, 'Invalid budget');
    }
    match.averagePrice = { $lte: parsedBudget };
  }

  if (search && String(search).trim()) {
    const q = String(search).trim();
    match.$or = [
      { name: { $regex: q, $options: 'i' } },
      { address: { $regex: q, $options: 'i' } }
    ];
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'reviews',
        let: { locationId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$locationId', '$$locationId'] },
                  { $eq: ['$status', 'published'] }
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              averageRating: { $avg: '$rating' },
              totalReviews: { $sum: 1 }
            }
          }
        ],
        as: 'reviewStats'
      }
    },
    {
      $addFields: {
        averageRating: {
          $ifNull: [{ $arrayElemAt: ['$reviewStats.averageRating', 0] }, 0]
        },
        totalReviews: {
          $ifNull: [{ $arrayElemAt: ['$reviewStats.totalReviews', 0] }, 0]
        }
      }
    },
    {
      $project: {
        reviewStats: 0
      }
    },
    { $sort: { averageRating: -1, totalReviews: -1, createdAt: -1 } },
    { $skip: skip },
    { $limit: limit }
  ];

  const [items, total] = await Promise.all([
    Location.aggregate(pipeline),
    Location.countDocuments(match)
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
}

export async function getPublishedReviewsByLocation(locationId) {
  if (!mongoose.Types.ObjectId.isValid(locationId)) {
    throw createServiceError(400, 'Invalid location id');
  }

  return Review.find({
    locationId: new mongoose.Types.ObjectId(locationId),
    status: 'published'
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
}

async function getUserByClerkId(clerkId) {
  if (!clerkId) return null;
  return User.findOne({ clerkId }).select('_id clerkId').lean();
}

export async function createReviewByClerkId({ clerkId, payload }) {
  const currentUser = await getUserByClerkId(clerkId);
  if (!currentUser) throw createServiceError(401, 'Unauthorized');

  const { appointmentId, rating, tags, comment, wouldMeetAgain, revieweeUserId } = payload || {};
  if (!appointmentId) throw createServiceError(400, 'appointmentId is required');

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    throw createServiceError(400, 'Invalid appointmentId');
  }

  const normalizedRating = Number(rating);
  if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    throw createServiceError(400, 'rating must be from 1 to 5');
  }

  const appointment = await Appointment.findById(appointmentId).lean();
  if (!appointment) throw createServiceError(404, 'Appointment not found');

  if (String(appointment.userId) !== String(currentUser._id)) {
    throw createServiceError(403, 'Forbidden');
  }

  if (new Date(appointment.startTime).getTime() > Date.now()) {
    throw createServiceError(400, 'Cannot review before appointment time');
  }

  const existing = await Review.findOne({ appointmentId: appointment._id }).lean();
  if (existing) {
    throw createServiceError(409, 'Review already exists for this appointment');
  }

  return Review.create({
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
    wouldMeetAgain: typeof wouldMeetAgain === 'boolean' ? wouldMeetAgain : null
  });
}

export async function getMyReviewsByClerkId(clerkId) {
  const currentUser = await getUserByClerkId(clerkId);
  if (!currentUser) throw createServiceError(401, 'Unauthorized');

  return Review.find({ reviewerUserId: currentUser._id })
    .populate('locationId', 'name address category')
    .sort({ createdAt: -1 })
    .lean();
}
