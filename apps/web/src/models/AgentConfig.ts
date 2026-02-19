import mongoose from 'mongoose';

const AgentConfigSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, unique: true },
    tone: String,
    rules: [String],
    forbidden: [String],
    fallback: String,
    toolsEnabled: [String],
    agentGender: { type: String, default: 'neutral' },
    agentPersonality: { type: String, default: 'professional' },
    companyName: String,
    companyDescription: String,
    companyPhone: String,
    companyWebsite: String,
    twilioPhoneNumber: String,
    speechRate: { type: Number, default: 1.0 },
    micInputGain: { type: Number, default: 1.0 },
    micNoiseGate: { type: Number, default: 0.0 },
    micSelfMonitor: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const AgentConfig = mongoose.models.AgentConfig || mongoose.model('AgentConfig', AgentConfigSchema);
