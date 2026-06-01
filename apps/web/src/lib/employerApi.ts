import { authRequest } from './apiClient';
import type { NotificationApi } from './employeeApi';

const request = authRequest;

export type EmployerCandidateStage = 'SOURCED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';

export interface EmployerCandidateApi {
  id: string;
  requisitionId: string;
  employeeUid: string;
  name: string;
  initials: string;
  title: string;
  score: number;
  skills: string[];
  compensation: string;
  roleTarget: string;
  stage: EmployerCandidateStage;
  stageLabel: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface EmployerMatchApi {
  candidateId: string;
  requisitionId: string;
  score: number;
  status: EmployerCandidateStage;
  name: string;
  title: string;
  skills: string[];
  compensation: string;
  roleTarget: string;
  updatedAt?: string | null;
}

export interface EmployerProfileApi {
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
  updatedAt?: string | null;
}

export interface EmployerActivityApi {
  id: string;
  icon: string;
  text: string;
  createdAt?: string | null;
}

export interface EmployerInterviewApi {
  id: string;
  candidate: string;
  role: string;
  type: string;
  scheduledAt?: string | null;
}

export interface EmployerSummaryApi {
  openRoles: number;
  inPipeline: number;
  hired: number;
  avgMatchScore: number;
  timeToShortlistDays: number;
  costPerHire: string;
  byStage: Record<EmployerCandidateStage, number>;
  upcomingInterviews: EmployerInterviewApi[];
}



export async function getEmployerCandidates(params: { stage?: string; requisitionId?: string; limit?: number; offset?: number } = {}) {
  const query = new URLSearchParams();
  if (params.stage) query.set('stage', params.stage);
  if (params.requisitionId) query.set('requisitionId', params.requisitionId);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<{ candidates: EmployerCandidateApi[]; total: number; limit: number; offset: number }>(
    `/api/employer/candidates${suffix}`
  );
}

export async function patchEmployerCandidateStage(candidateId: string, stage: EmployerCandidateStage, notes?: string) {
  return request<{ ok: boolean; stage: EmployerCandidateStage }>(`/api/employer/candidates/${candidateId}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage, notes }),
  });
}

export async function getEmployerMatches() {
  return request<{ matches: EmployerMatchApi[] }>('/api/employer/matches');
}

export async function getEmployerDashboardSummary() {
  return request<{ summary: EmployerSummaryApi }>('/api/employer/dashboard-summary');
}

export async function getEmployerActivity() {
  return request<{ activity: EmployerActivityApi[] }>('/api/employer/activity');
}

export async function getEmployerProfile() {
  return request<{ profile: EmployerProfileApi }>('/api/employer/profile');
}

export async function patchEmployerProfile(payload: Partial<EmployerProfileApi>) {
  return request<{ ok: boolean }>('/api/employer/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getEmployerNotifications() {
  return request<{ notifications: NotificationApi[]; total: number }>('/api/employer/notifications');
}

export async function markEmployerNotificationRead(notificationId: string) {
  return request<{ ok: boolean }>(`/api/employer/notifications/${notificationId}/read`, {
    method: 'POST',
  });
}

export async function markAllEmployerNotificationsRead() {
  return request<{ ok: boolean }>('/api/employer/notifications/read-all', {
    method: 'POST',
  });
}
