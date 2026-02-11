import mongoose from 'mongoose';

const AgentConfigSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, unique: true },
    tone: String,
    rules: [String],
    forbidden: [String],
    fallback: String,
    toolsEnabled: [String],
  },
  { timestamps: true }
);

export const AgentConfig = mongoose.models.AgentConfig || mongoose.model('AgentConfig', AgentConfigSchema);
