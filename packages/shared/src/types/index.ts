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
  logoUrl: string;
  bannerUrl: string;
  websiteUrl: string;
  linkedinUrl: string;
  industry: string;
  companySize: number;
  foundedYear: number;
  location: string;
  fundingStage: string;
  fundingRaised: string;
  showProfileToEmployees: boolean;
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
  about?: string;
  bannerUrl?: string;
  location?: string;
  openToRelocation?: boolean;
  yearsExperience?: number;
  resumeUrl?: string;
  publicProfileSlug?: string;
  openToWork?: boolean;
  openToWorkVisibility?: 'RECRUITERS_ONLY' | 'PRIVATE';
  expectedCtc?: number;
  expectedCurrency?: string;
  noticePeriodDays?: number;
  profileStrength?: number;
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
  isSalaryMismatched?: boolean;
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

export type AdminUserStatus = 'ACTIVE' | 'SUSPENDED' | 'UNDER_REVIEW';
export type AdminEscalationStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type AdminEscalationPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type AdminHealthStatus = 'HEALTHY' | 'WARNING' | 'DOWN';

export interface AdminSummary {
  window: '24h' | '7d' | '30d';
  totalUsers: number;
  usersByRole: Record<UserRole, number>;
  usersLast24h: number;
  activeRequisitions: number;
  escalationsOpen: number;
  escalationsInProgress: number;
  matchesLast24h: number;
}

export interface AdminUserListItem {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: AdminUserStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminEscalationItem {
  id: string;
  type: Escalation['type'];
  status: AdminEscalationStatus;
  priority: AdminEscalationPriority;
  summary: string;
  entityType: string;
  entityId: string;
  assignedToUid: string;
  notes: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminSystemHealthItem {
  component: string;
  status: AdminHealthStatus;
  message: string;
  checkedAt?: string | null;
}

export interface AdminPatchUserPayload {
  role?: UserRole;
  status?: AdminUserStatus;
}

export interface AdminPatchEscalationPayload {
  status?: AdminEscalationStatus;
  priority?: AdminEscalationPriority;
  assignedToUid?: string;
  notes?: string;
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

