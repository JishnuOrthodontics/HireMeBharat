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

export type AdminUserRole = 'ADMIN' | 'EMPLOYEE' | 'EMPLOYER';
export type AdminUserStatus = 'ACTIVE' | 'SUSPENDED' | 'UNDER_REVIEW';
export type AdminEscalationType = 'MATCH_DISPUTE' | 'PROFILE_REVIEW' | 'COMPLIANCE' | 'OTHER';
export type AdminEscalationStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type AdminEscalationPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type AdminSystemHealthStatus = 'HEALTHY' | 'WARNING' | 'DOWN';

export interface AdminSummaryApi {
  window: '24h' | '7d' | '30d';
  totalUsers: number;
  usersByRole: Record<AdminUserRole, number>;
  usersLast24h: number;
  activeRequisitions: number;
  escalationsOpen: number;
  escalationsInProgress: number;
  matchesLast24h: number;
}

export interface AdminUserApi {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminEscalationApi {
  id: string;
  type: AdminEscalationType;
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

export interface AdminSystemHealthApi {
  component: string;
  status: AdminSystemHealthStatus;
  message: string;
  checkedAt?: string | null;
}

export interface AdminAnalyticsApi {
  totalUsers: number;
  activeRequisitions: number;
  matchesMade: number;
  avgMatchScore: number;
}

export async function getAdminSummary() {
  return request<{ summary: AdminSummaryApi }>('/api/admin/summary');
}

export async function getAdminUsers(params: {
  role?: AdminUserRole | 'ALL';
  status?: AdminUserStatus | 'ALL';
  search?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const query = new URLSearchParams();
  if (params.role) query.set('role', params.role);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<{ users: AdminUserApi[]; total: number; limit: number; offset: number }>(`/api/admin/users${suffix}`);
}

export async function patchAdminUser(userId: string, payload: { role?: AdminUserRole; status?: AdminUserStatus }) {
  return request<{ ok: boolean }>(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getAdminEscalations(params: {
  status?: AdminEscalationStatus | 'ALL';
  priority?: AdminEscalationPriority | 'ALL';
  limit?: number;
  offset?: number;
} = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.priority) query.set('priority', params.priority);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<{ escalations: AdminEscalationApi[]; total: number; limit: number; offset: number }>(
    `/api/admin/escalations${suffix}`
  );
}

export async function patchAdminEscalation(
  escalationId: string,
  payload: { status?: AdminEscalationStatus; priority?: AdminEscalationPriority; assignedToUid?: string; notes?: string }
) {
  return request<{ ok: boolean }>(`/api/admin/escalations/${escalationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getAdminSystemHealth() {
  return request<{ services: AdminSystemHealthApi[] }>('/api/admin/system-health');
}

export async function getAdminAnalytics() {
  return request<AdminAnalyticsApi>('/api/admin/analytics');
}
