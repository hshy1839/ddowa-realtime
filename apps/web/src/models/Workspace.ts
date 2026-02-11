import mongoose from 'mongoose';

const WorkspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    timezone: { type: String, default: 'UTC' },
    businessInfo: {
      companyName: String,
      description: String,
      phone: String,
      website: String,
    },
    hours: [
      {
        dayOfWeek: Number,
        startTime: String,
        endTime: String,
        isOpen: Boolean,
      },
    ],
  },
  { timestamps: true }
);

export const Workspace = mongoose.models.Workspace || mongoose.model('Workspace', WorkspaceSchema);
