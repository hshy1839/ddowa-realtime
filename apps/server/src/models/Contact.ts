import mongoose from 'mongoose';

const ContactSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    name: String,
    phone: {
      type: String,
      sparse: true,
    },
    email: {
      type: String,
      sparse: true,
      lowercase: true,
    },
    tags: [String],
    lastSeenAt: Date,
    metadata: mongoose.Schema.Types.Mixed, // Store any extra data
  },
  { timestamps: true }
);

export const Contact = mongoose.model('Contact', ContactSchema);
