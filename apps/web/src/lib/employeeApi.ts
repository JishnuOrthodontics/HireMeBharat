import { authRequest } from './apiClient';

const request = authRequest;



export type EmployeeMatchStatus = 'NEW' | 'SAVED' | 'INTERESTED' | 'APPLIED' | 'INTERVIEW' | 'DECLINED';

export interface EmployeeProfileApi {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  photoURL?: string | null;
  bannerUrl?: string | null;
  headline: string;
  /** Long-form summary; falls back to headline in UI when empty */
  about?: string;
  location: string;
  openToRelocation: boolean;
  yearsExperience: number;
  skills: string[];
  experience: Array<{ title: string; company: string; years: number }>;
  education?: Array<{ degree: string; institution: string; yearEnd?: number }>;
  linkedinUrl?: string;
  portfolioUrl?: string;
  compensation: { current: number; expected: number; currency: string };
  publicProfileSlug?: string;
  openToWork?: boolean;
  openToWorkVisibility?: 'RECRUITERS_ONLY' | 'PRIVATE';
  expectedCtc?: number;
  expectedCurrency?: string;
  noticePeriodDays?: number;
  /** HTTPS URL to PDF/DOC (Firebase Storage or external). */
  resumeUrl?: string;
  resumeFileName?: string;
  resumeVisibleToRecruiters?: boolean;
  resumeUpdatedAt?: string | null;
  updatedAt?: string | null;
}

export interface EmployeeMatchApi {
  id: string;
  title: string;
  company: string;
  score: number;
  status: EmployeeMatchStatus;
  salaryRange: string;
  location: string;
  tags: string[];
  isSalaryMismatched?: boolean;
  updatedAt?: string | null;
}

export interface EmployeeProfileStrengthApi {
  profileStrength: number;
  suggestions: string[];
}

export interface EmployeePublicProfileApi {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  bannerUrl?: string | null;
  headline: string;
  about?: string;
  location: string;
  yearsExperience: number;
  skills: string[];
  experience: Array<{ title: string; company: string; years: number }>;
  education?: Array<{ degree: string; institution: string; yearEnd?: number }>;
  linkedinUrl?: string;
  portfolioUrl?: string;
  openToWork: boolean;
  expectedCtc: number;
  expectedCurrency: string;
  noticePeriodDays: number;
  publicProfileUrl: string;
  /** Present when the candidate allows resume download for recruiters. */
  resume: { url: string; fileName: string } | null;
  updatedAt?: string | null;
}

export interface ConciergeMessageApi {
  id: string;
  from: 'user' | 'concierge';
  content: string;
  timestamp?: string | null;
}

export interface ConciergeApi {
  concierge: { name: string; title: string; initials: string; online: boolean };
  messages: ConciergeMessageApi[];
}

export interface NotificationApi {
  id: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  createdAt?: string | null;
}

export async function getEmployeeProfile() {
  return request<{ profile: EmployeeProfileApi }>('/api/employee/profile');
}

export async function patchEmployeeProfile(payload: Partial<EmployeeProfileApi>) {
  return request<{ ok: boolean }>('/api/employee/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getEmployeeMatches(
  params: { status?: string; showMismatched?: boolean; limit?: number; offset?: number } = {}
) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.showMismatched !== undefined) query.set('showMismatched', String(params.showMismatched));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<{ matches: EmployeeMatchApi[]; total: number; limit: number; offset: number; showMismatched?: boolean }>(`/api/employee/matches${suffix}`);
}

export async function updateMatchStatus(matchId: string, action: 'interest' | 'save' | 'decline') {
  return request<{ ok: boolean; status: EmployeeMatchStatus }>(`/api/employee/matches/${matchId}/${action}`, {
    method: 'POST',
  });
}

export async function getConciergeMessages() {
  return request<ConciergeApi>('/api/employee/concierge/messages');
}

export async function sendConciergeMessage(content: string) {
  return request<{ message: ConciergeMessageApi }>('/api/employee/concierge/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

export async function getNotifications() {
  return request<{ notifications: NotificationApi[] }>('/api/employee/notifications');
}

export async function markNotificationRead(notificationId: string) {
  return request<{ ok: boolean }>(`/api/employee/notifications/${notificationId}/read`, {
    method: 'POST',
  });
}

export async function getDashboardSummary() {
  return request<{ summary: { activeMatches: number; interviews: number; unreadNotifications: number } }>(
    '/api/employee/dashboard-summary'
  );
}

export async function getEmployeeProfileStrength() {
  return request<EmployeeProfileStrengthApi>('/api/employee/profile-strength');
}

export async function patchEmployeeProfileVisibility(payload: {
  openToWork?: boolean;
  openToWorkVisibility?: 'RECRUITERS_ONLY' | 'PRIVATE';
  publicProfileSlug?: string;
}) {
  return request<{ ok: boolean }>('/api/employee/profile-visibility', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function patchEmployeeSalaryExpectations(payload: {
  expectedCtc: number;
  expectedCurrency: string;
  noticePeriodDays: number;
}) {
  return request<{ ok: boolean }>('/api/employee/salary-expectations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getEmployeePublicProfile(uid: string) {
  return request<{ profile: EmployeePublicProfileApi }>(`/api/employee/public/${encodeURIComponent(uid)}`);
}

export async function uploadResumeToBackend(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request<{ ok: boolean; url: string; fileName: string }>('/api/employee/resume/upload', {
    method: 'POST',
    body: formData,
  });
}

