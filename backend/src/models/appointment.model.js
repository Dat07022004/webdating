import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    dateTime: {
      type: Date,
      required: true,
      index: true,
    },
    locationName: {
      type: String,
      required: true,
      trim: true,
    },
    locationAddress: {
      type: String,
      default: '',
      trim: true,
    },
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['planned', 'confirmed', 'completed', 'cancelled'],
      default: 'planned',
    },
    createdBySuggestion: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Appointment = mongoose.model('Appointment', appointmentSchema);
