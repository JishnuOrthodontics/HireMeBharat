export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  EMPLOYER = 'EMPLOYER',
}

export interface UserProfile {
  _id?: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Requisition {
  _id?: string;
  employerId: string;
  title: string;
  description: string;
  requirements: string[];
  location: string;
  salaryRange: { min: number; max: number; currency: string };
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'FILLED' | 'CLOSED';
  candidateIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CandidateProfile {
  _id?: string;
  userId: string;
  skills: string[];
  experience: {
    title: string;
    company: string;
    years: number;
  }[];
  compensation: {
    current: number;
    expected: number;
    currency: string;
  };
  matchScores: Record<string, number>;
  conciergeNotes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Match {
  _id?: string;
  candidateId: string;
  requisitionId: string;
  score: number;
  status: 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'DECLINED' | 'INTERVIEW';
  reviewedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  _id?: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  readAt?: Date;
}

export interface Conversation {
  _id?: string;
  participants: string[];
  lastMessage?: string;
  updatedAt: Date;
}

export interface Escalation {
  _id?: string;
  type: 'MATCH_DISPUTE' | 'PROFILE_REVIEW' | 'COMPLIANCE' | 'OTHER';
  entityId: string;
  assignedTo?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  _id?: string;
  userId: string;
  type: 'MATCH' | 'MESSAGE' | 'ESCALATION' | 'SYSTEM';
  title: string;
  content: string;
  read: boolean;
  createdAt: Date;
}
