import mongoose from 'mongoose';

const AgentConfigSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      unique: true,
    },
    tone: {
      type: String,
      default: 'professional',
    },
    rules: [String], // Custom rules for agent behavior
    forbidden: [String], // Topics/keywords to avoid
    fallback: String, // Fallback message when unable to help
    toolsEnabled: [String], // Which tools are enabled: getBusinessInfo, listAvailability, createBooking, etc.
    agentGender: {
      type: String,
      default: 'neutral',
    },
    agentPersonality: {
      type: String,
      default: 'professional',
    },
    companyName: String,
    companyDescription: String,
    companyPhone: String,
    companyWebsite: String,
    speechRate: {
      type: Number,
      default: 1.0,
    },
  },
  { timestamps: true }
);

export const AgentConfig = mongoose.model('AgentConfig', AgentConfigSchema);
