import mongoose from 'mongoose';

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      index: true,
    },
    reviewerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    revieweeUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    tags: {
      type: [String],
      default: [],
    },
    comment: {
      type: String,
      default: '',
      maxlength: 500,
    },
    wouldMeetAgain: {
      type: Boolean,
      default: null,
    },
    status: {
      type: String,
      enum: ['published', 'hidden'],
      default: 'published',
      index: true,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ locationId: 1, createdAt: -1 });
reviewSchema.index({ reviewerUserId: 1, createdAt: -1 });

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
