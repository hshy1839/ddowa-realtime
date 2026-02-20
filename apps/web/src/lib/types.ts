export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    workspaceId: string;
  };
}

export interface User {
  id: string;
  email: string;
  role: string;
  workspaceId: string;
}

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  timezone: string;
  businessInfo?: {
    companyName?: string;
    description?: string;
    phone?: string;
    website?: string;
  };
  hours?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isOpen: boolean;
  }>;
}

export interface AgentConfig {
  _id: string;
  workspaceId: string;
  tone: string;
  rules: string[];
  forbidden: string[];
  fallback: string;
  toolsEnabled: string[];
}

export interface Contact {
  _id: string;
  workspaceId: string;
  name?: string;
  phone?: string;
  email?: string;
  tags: string[];
  lastSeenAt?: Date;
}

export interface Conversation {
  _id: string;
  workspaceId: string;
  contactId?: string;
  channel: 'web' | 'api';
  status: 'ongoing' | 'completed' | 'failed';
  startedAt: Date;
  endedAt?: Date;
  durationSec?: number;
  summary?: string;
  intent?: string;
}

export interface Booking {
  _id: string;
  workspaceId: string;
  contactId?: string;
  startAt: Date;
  endAt?: Date;
  serviceName?: string;
  memo?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}
