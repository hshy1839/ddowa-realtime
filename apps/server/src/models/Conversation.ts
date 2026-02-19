import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      sparse: true,
    },
    channel: {
      type: String,
      enum: ['web', 'api', 'phone'],
      default: 'web',
    },
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'failed'],
      default: 'ongoing',
    },
    startedAt: {
      type: Date,
      default: () => new Date(),
    },
    endedAt: Date,
    durationSec: Number,
    summary: String,
    intent: String,
    meta: mongoose.Schema.Types.Mixed, // Store call metadata, transcript details, etc.
  },
  { timestamps: true }
);

export const Conversation = mongoose.model('Conversation', ConversationSchema);
