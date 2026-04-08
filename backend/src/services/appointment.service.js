import mongoose from 'mongoose';
import { Appointment, Location } from '../models/appointments.model.js';
import { Connection } from '../models/connection.model.js';
import { Notification } from '../models/notification.model.js';
import { Review } from '../models/review.model.js';
import { User } from '../models/user.model.js';
import { sendMail } from '../lib/mailer.js';
import { getIO } from '../socket/index.js';
import { getSocketIds } from '../socket/onlineUsers.js';

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

export async function validateBooking({ userId, locationId, selectedTime, session = null }) {
  if (!userId) throw createServiceError(400, 'Missing userId');
  if (!locationId) throw createServiceError(400, 'Missing locationId');
  if (!selectedTime) throw createServiceError(400, 'Missing selectedTime');
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw createServiceError(400, 'Người dùng không hợp lệ');
  }
  if (!mongoose.Types.ObjectId.isValid(locationId)) {
    throw createServiceError(400, 'Địa điểm không hợp lệ');
  }

  const startTime = new Date(selectedTime);
  if (Number.isNaN(startTime.getTime())) throw createServiceError(400, 'Invalid selectedTime');

  const now = new Date();
  if (startTime.getTime() < now.getTime()) {
    throw createServiceError(400, 'Không thể chọn thời gian trong quá khứ');
  }

  const APPT_DURATION_MS = 2 * 60 * 60 * 1000;
  const endTime = new Date(startTime.getTime() + APPT_DURATION_MS);

  const userObjId = new mongoose.Types.ObjectId(userId);
  const locObjId = new mongoose.Types.ObjectId(locationId);

  const overlapQuery = {
    status: { $nin: ['cancelled', 'completed'] },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  const userConflict = await Appointment.findOne(
    {
      userId: userObjId,
      ...overlapQuery,
    },
    null,
    { session }
  ).lean();

  if (userConflict) {
    throw createServiceError(409, 'Bạn đã có lịch hẹn khác trong khung giờ này');
  }

  const locationConflict = await Appointment.findOne(
    {
      locationId: locObjId,
      ...overlapQuery,
    },
    null,
    { session }
  ).lean();

  if (locationConflict) {
    throw createServiceError(409, 'Địa điểm đã bị đặt trong khung giờ này');
  }

  return {
    startTime,
    endTime,
    userId: userObjId,
    locationId: locObjId,
  };
}

export async function createAppointment({ userId, matchUserId, locationId, startTime, totalCost, note }) {
  if (!userId || !matchUserId || !locationId || !startTime) {
    throw createServiceError(400, 'Missing required fields');
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw createServiceError(400, 'Người dùng không hợp lệ');
  }
  if (!mongoose.Types.ObjectId.isValid(matchUserId)) {
    throw createServiceError(400, 'Người được hẹn không hợp lệ');
  }
  if (!mongoose.Types.ObjectId.isValid(locationId)) {
    throw createServiceError(400, 'Địa điểm không hợp lệ');
  }
  if (String(userId) === String(matchUserId)) {
    throw createServiceError(400, 'Không thể đặt lịch với chính mình');
  }

  const selectedStartTime = new Date(startTime);
  if (Number.isNaN(selectedStartTime.getTime())) {
    throw createServiceError(400, 'Invalid startTime');
  }

  const session = await mongoose.startSession();
  let savedAppointment = null;
  let locationName = 'địa điểm';
  let requesterName = 'Ai đó';
  let requesterImage = '';
  const matchUserObjectId = new mongoose.Types.ObjectId(matchUserId);

  try {
    session.startTransaction();

    const normalizedBooking = await validateBooking({
      userId,
      locationId,
      selectedTime: selectedStartTime,
      session,
    });

    const location = await Location.findById(normalizedBooking.locationId, null, { session }).lean();
    if (!location) {
      throw createServiceError(404, 'Location not found');
    }

    locationName = location.name || locationName;

    const requesterUser = await User.findById(normalizedBooking.userId, null, { session })
      .select('username profile.personalInfo.name profile.avatarUrl')
      .lean();
    requesterName = requesterUser?.profile?.personalInfo?.name || requesterUser?.username || requesterName;
    requesterImage = requesterUser?.profile?.avatarUrl || '';

    const matchedUser = await User.findById(matchUserObjectId, null, { session })
      .select('_id username profile.personalInfo.name')
      .lean();
    if (!matchedUser) {
      throw createServiceError(404, 'Không tìm thấy người được hẹn');
    }

    const matchedConnection = await Connection.findOne(
      {
        status: 'matched',
        $or: [
          { senderId: normalizedBooking.userId, receiverId: matchUserObjectId },
          { senderId: matchUserObjectId, receiverId: normalizedBooking.userId },
        ],
      },
      null,
      { session }
    ).lean();

    if (!matchedConnection) {
      throw createServiceError(403, 'Chỉ có thể đặt lịch với người đã match');
    }

    const createdAppointments = await Appointment.create(
      [
        {
          userId: normalizedBooking.userId,
          matchUserId: matchUserObjectId,
          locationId: normalizedBooking.locationId,
          startTime: normalizedBooking.startTime,
          endTime: normalizedBooking.endTime,
          note: typeof note === 'string' ? note.trim().slice(0, 300) : '',
          totalCost: totalCost ?? location.averagePrice,
        },
      ],
      { session }
    );

    [savedAppointment] = createdAppointments;

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }

  try {
    const userDoc = await User.findById(userId).select('email').lean();
    const toEmail = userDoc?.email;
    if (toEmail && savedAppointment) {
      const startStr = new Date(savedAppointment.startTime).toLocaleString();
      await sendMail({
        to: toEmail,
        subject: `Xác nhận lịch hẹn tại ${locationName}`,
        text: `Bạn đã đặt lịch hẹn tại ${locationName} vào ${startStr}. Chi phí dự kiến: ${savedAppointment.totalCost || 'N/A'}`,
      });
    }
  } catch (mailErr) {
    console.warn('Failed to send booking email', mailErr);
  }

  if (savedAppointment) {
    const startStr = new Date(savedAppointment.startTime).toLocaleString();
    await createAppointmentNotification({
      userId: matchUserObjectId,
      senderId: userId,
      image: requesterImage,
      title: 'Lời hẹn mới',
      message: `${requesterName} muốn hẹn bạn tại ${locationName} vào ${startStr}.`,
      metadata: {
        appointmentId: savedAppointment._id?.toString(),
        action: 'request',
      },
    });
  }

  return savedAppointment;
}

export async function getAppointmentsByUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) throw createServiceError(400, 'Invalid userId');
  const appts = await Appointment.find({
    $or: [
      { userId: new mongoose.Types.ObjectId(userId) },
      { matchUserId: new mongoose.Types.ObjectId(userId) }
    ]
  })
    .populate('locationId')
    .populate('userId', 'clerkId username profile.personalInfo.name profile.avatarUrl profile.photos')
    .populate('matchUserId', 'clerkId username profile.personalInfo.name profile.avatarUrl profile.photos')
    .sort({ startTime: 1 })
    .exec();
  return appts;
}

export async function respondToAppointment({ appointmentId, requesterObjectId, action }) {
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    throw createServiceError(400, 'Invalid appointment id');
  }
  if (!mongoose.Types.ObjectId.isValid(requesterObjectId)) {
    throw createServiceError(400, 'Invalid requester');
  }
  if (!['confirm', 'decline'].includes(action)) {
    throw createServiceError(400, 'Invalid response action');
  }

  const appt = await Appointment.findById(appointmentId)
    .populate('locationId', 'name')
    .populate('userId', 'email username profile.personalInfo.name profile.avatarUrl')
    .populate('matchUserId', 'email username profile.personalInfo.name profile.avatarUrl')
    .exec();

  if (!appt) {
    throw createServiceError(404, 'Appointment not found');
  }

  if (String(appt.matchUserId?._id || appt.matchUserId) !== String(requesterObjectId)) {
    throw createServiceError(403, 'Forbidden');
  }

  if (appt.status !== 'pending') {
    throw createServiceError(409, 'Lịch hẹn này không còn chờ xác nhận');
  }

  appt.status = action === 'confirm' ? 'confirmed' : 'cancelled';
  const saved = await appt.save();

  const responderName =
    appt.matchUserId?.profile?.personalInfo?.name ||
    appt.matchUserId?.username ||
    'Match của bạn';
  const locationName = appt.locationId?.name || 'địa điểm';
  const startStr = new Date(appt.startTime).toLocaleString();
  const creatorId = appt.userId?._id || appt.userId;

  await createAppointmentNotification({
    userId: creatorId,
    senderId: requesterObjectId,
    image: appt.matchUserId?.profile?.avatarUrl || '',
    title: action === 'confirm' ? 'Lịch hẹn đã được xác nhận' : 'Lịch hẹn đã bị từ chối',
    message:
      action === 'confirm'
        ? `${responderName} đã xác nhận lịch hẹn tại ${locationName} vào ${startStr}.`
        : `${responderName} đã từ chối lịch hẹn tại ${locationName} vào ${startStr}.`,
    metadata: {
      appointmentId: saved._id?.toString(),
      action,
    },
  });

  try {
    const toEmail = appt.userId?.email;
    if (toEmail) {
      await sendMail({
        to: toEmail,
        subject: action === 'confirm' ? `Lịch hẹn đã được xác nhận` : `Lịch hẹn đã bị từ chối`,
        text:
          action === 'confirm'
            ? `${responderName} đã xác nhận lịch hẹn tại ${locationName} vào ${startStr}.`
            : `${responderName} đã từ chối lịch hẹn tại ${locationName} vào ${startStr}.`,
      });
    }
  } catch (mailErr) {
    console.warn('Failed to send appointment response email', mailErr);
  }

  return saved;
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

async function createAppointmentNotification({ userId, senderId, title, message, metadata = {}, image = '' }) {
  if (!userId) return null;

  const normalizedUserId =
    typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const normalizedSenderId =
    senderId && typeof senderId === 'string' && mongoose.Types.ObjectId.isValid(senderId)
      ? new mongoose.Types.ObjectId(senderId)
      : senderId || undefined;

  try {
    await Notification.create({
      userId: normalizedUserId,
      senderId: normalizedSenderId,
      type: 'appointment',
      title,
      message,
      image: image || undefined,
      metadata,
    });
  } catch (notificationErr) {
    console.warn('Failed to create appointment notification', notificationErr);
  }

  try {
    const io = getIO();
    const socketIds = getSocketIds(String(normalizedUserId));
    socketIds.forEach((socketId) => {
      io.to(socketId).emit('new_notification', {
        type: 'appointment',
        title,
        message,
        metadata,
      });
    });
  } catch (socketErr) {
    console.warn('Failed to emit appointment notification', socketErr?.message || socketErr);
  }

  return true;
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
