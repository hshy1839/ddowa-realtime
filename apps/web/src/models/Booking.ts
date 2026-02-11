import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', sparse: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    serviceName: String,
    memo: String,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
