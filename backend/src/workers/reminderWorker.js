import cron from "node-cron";
import nodemailer from "nodemailer";
import moment from "moment-timezone";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Appointment } from "../models/appointments.model.js";

dotenv.config();

const TZ = "Asia/Ho_Chi_Minh";

// Create transporter using environment variables
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP credentials are not set in environment variables");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass },
  });
}

/**
 * Start the reminder cron job.
 * Runs every minute and finds appointments starting in ~30 minutes.
 */
export function startReminderWorker() {
  // Run at 0 seconds of every minute
  const task = cron.schedule("0 * * * * *", async () => {
    try {
      const now = moment.tz(TZ);

      const windowStart = now.clone().add(30, "minutes");
      const windowEnd = now.clone().add(31, "minutes");

      // Build query using Date objects
      const qStart = windowStart.toDate();
      const qEnd = windowEnd.toDate();

      const appts = await Appointment.find({
        status: "confirmed",
        reminderSent: { $ne: true },
        startTime: { $gte: qStart, $lt: qEnd },
      })
        .populate("locationId")
        .exec();

      if (!appts || appts.length === 0) return;

      const transporter = createTransporter();

      for (const appt of appts) {
        try {
          // Fetch user email from raw collection (no model guaranteed)
          const usersColl = mongoose.connection.collection("users");
          const userDoc = await usersColl.findOne({ _id: new mongoose.Types.ObjectId(appt.userId) });
          const toEmail = userDoc?.email;

          if (!toEmail) {
            console.warn(`No email for user ${appt.userId}, skipping reminder for appointment ${appt._id}`);
            continue;
          }

          const locationName = appt.locationId?.name || "địa điểm";
          const startTimeStr = moment(appt.startTime).tz(TZ).format("YYYY-MM-DD HH:mm");
          const subject = `🔔 Sắp đến giờ hẹn: ${locationName}!`;
          const text = `Chào bạn, bạn có lịch hẹn vào lúc ${startTimeStr}. Chi phí dự kiến là ${appt.totalCost || "N/A"}. Chúc bạn có một buổi hẹn vui vẻ!`;

          await transporter.sendMail({
            from: process.env.SENDER_EMAIL || process.env.SMTP_USER,
            to: toEmail,
            subject,
            text,
          });

          // Mark reminderSent true
          appt.reminderSent = true;
          await appt.save();
        } catch (innerErr) {
          console.error("Failed to send reminder for appointment", appt._id, innerErr);
        }
      }
    } catch (err) {
      console.error("Reminder worker error:", err);
    }
  });

  task.start();
  console.log("Reminder worker started (runs every minute)");
  return task;
}

export default startReminderWorker;
