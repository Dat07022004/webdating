import mongoose from 'mongoose';
import { Appointment, Location } from '../models/appointments.model.js';
import { sendMail } from '../lib/mailer.js';

/**
 * Service layer for appointments
 */

export async function suggestAppointments({ userId, category, budget, date }) {
  if (!userId || !category || budget == null || !date) throw new Error('Missing required fields');

  const dayStart = new Date(`${date}T00:00:00`);
  if (Number.isNaN(dayStart.getTime())) throw new Error('Invalid date');
  const dayEnd = new Date(`${date}T23:59:59.999`);

  const locations = await Location.find({ category, averagePrice: { $lte: budget } })
    .sort({ averagePrice: 1 })
    .limit(30)
    .lean();

  if (!locations.length) return [];

  const userAppointments = await Appointment.find({
    userId: new mongoose.Types.ObjectId(userId),
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
    throw err;
  }

  return true;
}

export async function createAppointment({ userId, locationId, startTime, totalCost }) {
  if (!userId || !locationId || !startTime) throw new Error('Missing required fields');

  // Validate booking before proceeding
  await validateBooking({ userId, selectedTime: startTime });

  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) throw new Error('Invalid startTime');

  const intendedEnd = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const location = await Location.findById(locationId).exec();
  if (!location) throw new Error('Location not found');

  const session = await mongoose.startSession();
  let saved;

  await session.withTransaction(async () => {
    const conflict = await Appointment.findOne({
      locationId: location._id,
      startTime: { $lt: intendedEnd },
      endTime: { $gt: start },
    }).session(session).exec();

    if (conflict) {
      const err = new Error('Time slot occupied');
      err.status = 409;
      throw err;
    }

    const [created] = await Appointment.create([
      {
        userId: new mongoose.Types.ObjectId(userId),
        locationId: location._id,
        startTime: start,
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
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error('Invalid userId');
  const appts = await Appointment.find({ userId: new mongoose.Types.ObjectId(userId) }).populate('locationId').sort({ startTime: 1 }).exec();
  return appts;
}

export async function updateAppointment(id, { startTime, status }) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid appointment id');
  const appt = await Appointment.findById(id).exec();
  if (!appt) throw new Error('Appointment not found');

  if (startTime) {
    const newStart = new Date(startTime);
    if (Number.isNaN(newStart.getTime())) throw new Error('Invalid startTime');
    const newEnd = new Date(newStart.getTime() + 2 * 60 * 60 * 1000);

    const conflict = await Appointment.findOne({
      locationId: appt.locationId,
      _id: { $ne: appt._id },
      startTime: { $lt: newEnd },
      endTime: { $gt: newStart },
    }).exec();

    if (conflict) {
      const err = new Error('Time slot occupied');
      err.status = 409;
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
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid appointment id');
  const appt = await Appointment.findById(id).exec();
  if (!appt) throw new Error('Appointment not found');
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
