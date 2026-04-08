import express from "express";
import mongoose from "mongoose";
import {
  suggestAppointments,
  createAppointment,
  getAppointmentsByUser,
  updateAppointment,
  cancelAppointment,
} from "../services/appointment.service.js";
import { Appointment } from "../models/appointments.model.js";
import { User } from "../models/user.model.js";

const router = express.Router();

const getAuth = (req) => (typeof req.auth === "function" ? req.auth() : req.auth);

const resolveUserObjectId = async (candidate) => {
  if (!candidate) return null;

  const raw = String(candidate);
  if (mongoose.Types.ObjectId.isValid(raw)) return raw;

  const user = await User.findOne({ clerkId: raw }).select("_id").lean();
  return user?._id?.toString() || null;
};

router.post("/suggest", async (req, res) => {
  try {
    const auth = getAuth(req);
    const inputUserId = auth?.userId || req.body.userId;
    if (!inputUserId) return res.status(401).json({ message: "Unauthorized" });

    const userId = await resolveUserObjectId(inputUserId);
    if (!userId) return res.status(404).json({ message: "User not found" });

    const { category, budget, date } = req.body;
    const suggestions = await suggestAppointments({ userId, category, budget, date });
    return res.status(200).json(suggestions);
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ message: err.message });
    return res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/", async (req, res) => {
  try {
    const auth = getAuth(req);
    const inputUserId = auth?.userId || req.body.userId;
    if (!inputUserId) return res.status(401).json({ message: "Unauthorized" });

    const userId = await resolveUserObjectId(inputUserId);
    if (!userId) return res.status(404).json({ message: "User not found" });

    const { locationId, startTime, totalCost } = req.body;
    const saved = await createAppointment({ userId, locationId, startTime, totalCost });
    return res.status(201).json(saved);
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ message: err.message });
    return res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const auth = getAuth(req);
    const requesterId = auth?.userId;
    if (!requesterId) return res.status(401).json({ message: "Unauthorized" });

    const requesterObjectId = await resolveUserObjectId(requesterId);
    if (!requesterObjectId) return res.status(404).json({ message: "User not found" });

    const { userId: paramUserId } = req.params;
    if (paramUserId && paramUserId !== requesterId && paramUserId !== requesterObjectId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const appts = await getAppointmentsByUser(requesterObjectId);
    return res.status(200).json(appts);
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ message: err.message });
    return res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const auth = getAuth(req);
    const requesterId = auth?.userId;
    if (!requesterId) return res.status(401).json({ message: "Unauthorized" });

    const requesterObjectId = await resolveUserObjectId(requesterId);
    if (!requesterObjectId) return res.status(404).json({ message: "User not found" });

    const { id } = req.params;

    const appt = await Appointment.findById(id).lean();
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    if (appt.userId?.toString() !== requesterObjectId) return res.status(403).json({ message: "Forbidden" });

    const updates = req.body;
    const saved = await updateAppointment(id, updates);
    return res.status(200).json(saved);
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ message: err.message });
    return res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const auth = getAuth(req);
    const requesterId = auth?.userId;
    if (!requesterId) return res.status(401).json({ message: "Unauthorized" });

    const requesterObjectId = await resolveUserObjectId(requesterId);
    if (!requesterObjectId) return res.status(404).json({ message: "User not found" });

    const { id } = req.params;

    const appt = await Appointment.findById(id).lean();
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    if (appt.userId?.toString() !== requesterObjectId) return res.status(403).json({ message: "Forbidden" });

    const saved = await cancelAppointment(id);
    return res.status(200).json({ message: "Appointment cancelled", data: saved });
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ message: err.message });
    return res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
