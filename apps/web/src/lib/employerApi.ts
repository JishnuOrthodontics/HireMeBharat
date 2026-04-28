import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function bearerHeaders(token: string): Record<string, string> {
  const bearer = `Bearer ${token}`;
  return {
    Authorization: bearer,
    'X-Firebase-Authorization': bearer,
  };
}

async function getToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers = {
    ...bearerHeaders(token),
    ...(init.headers || {}),
  };
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({} as any));
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  if (response.status === 204) return {} as T;
  return response.json() as Promise<T>;
}

export type EmployerRequisitionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'FILLED' | 'CLOSED';
export type EmployerCandidateStage = 'SOURCED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';

export interface EmployerRequisitionApi {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  description: string;
  requirements: string[];
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  salaryLabel: string;
  status: EmployerRequisitionStatus;
  featured: boolean;
  candidatesInPipeline: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

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
  industry: string;
  companySize: number;
  location: string;
  fundingStage: string;
  fundingRaised: string;
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

export async function getEmployerRequisitions(params: { status?: string; limit?: number; offset?: number } = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<{ requisitions: EmployerRequisitionApi[]; total: number; limit: number; offset: number }>(
    `/api/employer/requisitions${suffix}`
  );
}

export async function createEmployerRequisition(payload: {
  title: string;
  department: string;
  location: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  description: string;
  requirements?: string[];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  status?: EmployerRequisitionStatus;
}) {
  return request<{ requisition: EmployerRequisitionApi }>('/api/employer/requisitions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function patchEmployerRequisition(requisitionId: string, payload: Partial<EmployerRequisitionApi>) {
  return request<{ ok: boolean }>(`/api/employer/requisitions/${requisitionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
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
