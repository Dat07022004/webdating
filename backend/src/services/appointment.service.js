import mongoose from 'mongoose';
import { Appointment, Location } from '../models/appointments.model.js';

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
    userId: mongoose.Types.ObjectId(userId),
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

export async function createAppointment({ userId, locationId, startTime, totalCost }) {
  if (!userId || !locationId || !startTime) throw new Error('Missing required fields');

  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) throw new Error('Invalid startTime');

  const intendedEnd = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const location = await Location.findById(locationId).exec();
  if (!location) throw new Error('Location not found');

  const conflict = await Appointment.findOne({
    locationId: location._id,
    startTime: { $lt: intendedEnd },
    endTime: { $gt: start },
  }).exec();

  if (conflict) {
    const err = new Error('Time slot occupied');
    err.status = 409;
    throw err;
  }

  const appt = new Appointment({
    userId: mongoose.Types.ObjectId(userId),
    locationId: location._id,
    startTime: start,
    totalCost: totalCost ?? location.averagePrice,
  });

  const saved = await appt.save();
  return saved;
}

export async function getAppointmentsByUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error('Invalid userId');
  const appts = await Appointment.find({ userId: mongoose.Types.ObjectId(userId) }).populate('locationId').sort({ startTime: 1 }).exec();
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
  return saved;
}
