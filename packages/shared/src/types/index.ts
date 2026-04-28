export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  EMPLOYER = 'EMPLOYER',
}

export interface UserProfile {
  _id?: string;
  /** Canonical user id from Firebase/Auth layer. */
  uid: string;
  /** @deprecated use `uid` (kept for backward compatibility). */
  firebaseUid?: string;
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

export type EmployerRequisitionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'FILLED' | 'CLOSED';
export type EmployerCandidateStage = 'SOURCED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';

export interface EmployerRequisition {
  _id?: string;
  employerUid: string;
  title: string;
  department: string;
  location: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  description: string;
  requirements: string[];
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  status: EmployerRequisitionStatus;
  featured?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployerCandidatePipeline {
  _id?: string;
  employerUid: string;
  requisitionId: string;
  employeeUid: string;
  stage: EmployerCandidateStage;
  score: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployerProfile {
  _id?: string;
  employerUid: string;
  companyName: string;
  tagline: string;
  industry: string;
  companySize: number;
  location: string;
  fundingStage: string;
  fundingRaised: string;
  about: string;
  benefits: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CandidateProfile {
  _id?: string;
  /** References users.uid */
  userId: string;
  skills: string[];
  headline?: string;
  location?: string;
  openToRelocation?: boolean;
  yearsExperience?: number;
  resumeUrl?: string;
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
  employeeUid: string;
  requisitionId: string;
  title: string;
  company: string;
  location: string;
  salaryRange?: string;
  tags?: string[];
  score: number;
  status: 'NEW' | 'SAVED' | 'INTERESTED' | 'APPLIED' | 'INTERVIEW' | 'DECLINED';
  reviewedBy?: string;
  updatedByUid?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  _id?: string;
  conversationId: string;
  senderUid: string;
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
  userUid: string;
  type: 'MATCH' | 'MESSAGE' | 'ESCALATION' | 'SYSTEM';
  title: string;
  content: string;
  read: boolean;
  createdAt: Date;
}

