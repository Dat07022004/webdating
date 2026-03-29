import mongoose from "mongoose";

const { Schema } = mongoose;

// Location schema
const LocationSchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    category: { type: String, enum: ["cafe", "restaurant", "cinema", "park"] },
    averagePrice: { type: Number },
    openingHours: {
      open: { type: String },
      close: { type: String },
    },
  },
  { timestamps: true }
);

// Appointment schema
const AppointmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location" },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    reminderSent: { type: Boolean, default: false },
    totalCost: { type: Number },
    status: { type: String, default: "scheduled" },
  },
  { timestamps: true }
);

// Pre-save hook: nếu endTime chưa có, đặt mặc định là 2 giờ sau startTime
AppointmentSchema.pre("save", function (next) {
  try {
    if (!this.endTime && this.startTime) {
      const start = this.startTime instanceof Date ? this.startTime : new Date(this.startTime);
      this.endTime = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2 hours
    }
    next();
  } catch (err) {
    next(err);
  }
});

export const Location = mongoose.models.Location || mongoose.model("Location", LocationSchema);
export const Appointment = mongoose.models.Appointment || mongoose.model("Appointment", AppointmentSchema);
