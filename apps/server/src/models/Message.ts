import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'agent'],
      required: true,
    },
    text: String,
    tool: {
      name: String,
      args: mongoose.Schema.Types.Mixed,
      result: mongoose.Schema.Types.Mixed,
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { timestamps: false }
);

export const Message = mongoose.model('Message', MessageSchema);
