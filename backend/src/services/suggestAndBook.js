import mongoose from "mongoose";
import { Location, Appointment } from "../models/appointments.model.js";

/**
 * Try to find a Location by category and budget, then book at preferredTime if free.
 * @param {string} userId
 * @param {string} category
 * @param {number} userBudget
 * @param {string|Date} preferredTime - ISO string or Date
 * @returns {Promise<object>} { success: boolean, data?: any, message?: string }
 */
export async function suggestAndBook(userId, category, userBudget, preferredTime) {
  try {
    if (!userId || !category || userBudget == null || !preferredTime) {
      return { success: false, message: "Missing required parameters" };
    }

    const preferred = preferredTime instanceof Date ? preferredTime : new Date(preferredTime);
    if (Number.isNaN(preferred.getTime())) {
      return { success: false, message: "Invalid preferredTime" };
    }

    // Find a location matching category and within budget (cheapest first)
    const location = await Location.findOne({
      category,
      averagePrice: { $lte: userBudget },
    }).sort({ averagePrice: 1 }).exec();

    if (!location) {
      return { success: false, message: "No location found within budget" };
    }

    // Check if any appointment at this location overlaps preferred time
    const conflict = await Appointment.findOne({
      locationId: location._id,
      startTime: { $lte: preferred },
      endTime: { $gt: preferred },
    }).exec();

    if (conflict) {
      return { success: false, message: "Time slot occupied" };
    }

    // Create appointment (endTime will be set by pre-save hook if not provided)
    const appt = new Appointment({
      userId: mongoose.Types.ObjectId(userId),
      locationId: location._id,
      startTime: preferred,
      totalCost: location.averagePrice,
    });

    const saved = await appt.save();

    return { success: true, data: saved };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export default suggestAndBook;
