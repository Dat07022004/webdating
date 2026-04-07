import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    category: { type: String, default: '' },
    averagePrice: { type: Number, min: 0, default: 0 },
    images: { type: [String], default: [] },
    openingHours: { type: String, default: '' },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

const appointmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true, index: true },
    startTime: { type: Date, required: true, index: true },
    endTime: {
      type: Date,
      default() {
        if (!this.startTime) return undefined;
        return new Date(new Date(this.startTime).getTime() + 2 * 60 * 60 * 1000);
      },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'scheduled', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    note: { type: String, default: '', trim: true, maxlength: 300 },
    totalCost: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

appointmentSchema.pre('save', function setEndTime(next) {
  if (this.startTime && (!this.endTime || this.isModified('startTime'))) {
    this.endTime = new Date(new Date(this.startTime).getTime() + 2 * 60 * 60 * 1000);
  }
  next();
});

export const Location = mongoose.models.Location || mongoose.model('Location', locationSchema);
export const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
