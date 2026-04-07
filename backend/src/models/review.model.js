import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      index: true,
    },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true, index: true },
    reviewerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    revieweeUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    tags: { type: [String], default: [] },
    comment: { type: String, default: '' },
    wouldMeetAgain: { type: Boolean, default: null },
    status: { type: String, enum: ['draft', 'published', 'hidden'], default: 'published', index: true },
  },
  { timestamps: true }
);

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
