import mongoose from 'mongoose';

const WorkspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    businessInfo: {
      companyName: String,
      description: String,
      phone: String,
      website: String,
    },
    hours: [
      {
        dayOfWeek: Number, // 0-6 (Sun-Sat)
        startTime: String, // HH:mm
        endTime: String, // HH:mm
        isOpen: Boolean,
      },
    ],
  },
  { timestamps: true }
);

export const Workspace = mongoose.model('Workspace', WorkspaceSchema);
