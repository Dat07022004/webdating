import express from "express";
import {
  suggestAppointments,
  createAppointment,
  getAppointmentsByUser,
  updateAppointment,
  cancelAppointment,
} from "../services/appointment.service.js";
import { Appointment } from "../models/appointments.model.js";

const router = express.Router();

/**
 * POST /api/appointments/suggest
 * Trả về tối đa 3 đề xuất: địa điểm, thời gian (start/end) và chi phí dự kiến
 * Body: { userId, category, budget, date }  // date: YYYY-MM-DD
 */
router.post("/suggest", async (req, res) => {
  try {
    const { userId, category, budget, date } = req.body;
    const suggestions = await suggestAppointments({ userId, category, budget, date });
    return res.status(200).json(suggestions);
  } catch (err) {
    return res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * POST /api/appointments
 * Create a new appointment for a given location and startTime.
 * Body: { userId, locationId, startTime, totalCost? }
 * - Checks for time conflicts at the same location (overlap with existing appointments).
 * - If free, creates and returns the appointment (201).
 * - If occupied or bad input, returns appropriate error codes (400/409).
 */
router.post("/", async (req, res) => {
  try {
    const auth = typeof req.auth === "function" ? req.auth() : req.auth;
    const userId = auth?.userId || req.body.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { locationId, startTime, totalCost } = req.body;
    const saved = await createAppointment({ userId, locationId, startTime, totalCost });
    return res.status(201).json(saved);
  } catch (err) {
    if (err && err.status === 409) return res.status(409).json({ message: err.message });
    return res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
  }
});


/**
 * GET /api/appointments/:userId
 * Fetch all appointments for a specific user and populate location details.
 */
router.get("/:userId", async (req, res) => {
  try {
    const auth = typeof req.auth === "function" ? req.auth() : req.auth;
    const requesterId = auth?.userId;
    const { userId: paramUserId } = req.params;
    const userId = paramUserId || requesterId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (requesterId !== userId) return res.status(403).json({ message: "Forbidden" });

    const appts = await getAppointmentsByUser(userId);
    return res.status(200).json(appts);
  } catch (err) {
    return res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
  }
});


/**
 * PATCH /api/appointments/:id
 * Update startTime or status of an appointment.
 * Body may include: { startTime?, status? }
 * - When updating startTime, checks for conflicts at the same location excluding this appointment.
 */
router.patch("/:id", async (req, res) => {
  try {
    const auth = typeof req.auth === "function" ? req.auth() : req.auth;
    const requesterId = auth?.userId;
    const { id } = req.params;

    const appt = await Appointment.findById(id).lean();
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    if (appt.userId?.toString() !== requesterId) return res.status(403).json({ message: "Forbidden" });

    const updates = req.body;
    const saved = await updateAppointment(id, updates);
    return res.status(200).json(saved);
  } catch (err) {
    if (err && err.status === 409) return res.status(409).json({ message: err.message });
    return res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
  }
});


/**
 * DELETE /api/appointments/:id
 * Cancel an appointment. This route marks the appointment status as 'cancelled'.
 */
router.delete("/:id", async (req, res) => {
  try {
    const auth = typeof req.auth === "function" ? req.auth() : req.auth;
    const requesterId = auth?.userId;
    const { id } = req.params;

    const appt = await Appointment.findById(id).lean();
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    if (appt.userId?.toString() !== requesterId) return res.status(403).json({ message: "Forbidden" });

    const saved = await cancelAppointment(id);
    return res.status(200).json({ message: "Appointment cancelled", data: saved });
  } catch (err) {
    return res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
