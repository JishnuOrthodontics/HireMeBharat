import { authRequest, publicRequest } from './apiClient';

// ─── Types ───────────────────────────────────────────────────────────

export type JobListingStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'FILLED' | 'CLOSED';
export type JobApplicationStatus = 'PENDING' | 'REVIEWED' | 'SHORTLISTED' | 'INTERVIEW' | 'OFFERED' | 'REJECTED' | 'WITHDRAWN';
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface JobListingApi {
  id: string;
  title: string;
  company: string;
  companyLogoUrl: string;
  department: string;
  location: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
  description: string;
  requirements?: string[];
  benefits?: string[];
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  salaryLabel: string;
  experienceMin: number;
  experienceMax: number;
  skills: string[];
  status?: JobListingStatus;
  featured: boolean;
  applicationCount: number;
  viewCount?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface JobApplicationApi {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  companyLogoUrl?: string;
  location?: string;
  description?: string;
  status: JobApplicationStatus;
  coverLetter: string;
  resumeUrl?: string;
  resumeFileName?: string;
  appliedAt?: string | null;
  reviewedAt?: string | null;
  updatedAt?: string | null;
}

export interface EmployerApplicationApi {
  id: string;
  jobId: string;
  jobTitle: string;
  applicantUid: string;
  applicantName: string;
  applicantEmail: string;
  applicantHeadline: string;
  applicantSkills: string[];
  applicantPhotoURL: string;
  status: JobApplicationStatus;
  coverLetter: string;
  resumeUrl: string;
  resumeFileName: string;
  appliedAt?: string | null;
  reviewedAt?: string | null;
  updatedAt?: string | null;
}

export interface JobOfferApi {
  id: string;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  companyLogoUrl?: string;
  status: OfferStatus;
  offerDetails: string;
  salary: number;
  salaryCurrency: string;
  startDate?: string | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  respondedAt?: string | null;
}

export interface JobInterviewApi {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  type: string;
  scheduledAt?: string | null;
  duration: string;
  notes: string;
  meetingLink: string;
}

export interface JobPortalStatsApi {
  totalListings: number;
  activeListings: number;
  totalApplications: number;
  applications24h: number;
  applications7d: number;
  totalOffers: number;
  acceptedOffers: number;
  pendingOffers: number;
  offerAcceptanceRate: number;
  avgPlatformRating: number;
}

// ─── Public API (no auth) ────────────────────────────────────────────

export async function searchJobListings(params: {
  q?: string;
  location?: string;
  type?: string;
  salaryMin?: number;
  salaryMax?: number;
  skills?: string;
  sort?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '') query.set(key, String(val));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return publicRequest<{ listings: JobListingApi[]; facets: any; total: number; limit: number; offset: number }>(
    `/api/jobs/listings${suffix}`
  );
}

export async function getJobAutocompleteSuggestions(q: string) {
  if (!q.trim()) return { suggestions: [] };
  return publicRequest<{ suggestions: string[] }>(`/api/jobs/autocomplete?q=${encodeURIComponent(q)}`);
}

export async function getJobListingById(id: string) {
  return publicRequest<{ listing: JobListingApi }>(`/api/jobs/listings/${id}`);
}

// ─── Employee API ────────────────────────────────────────────────────

export async function applyToJob(jobId: string, payload: {
  coverLetter?: string;
  resumeUrl?: string;
  resumeFileName?: string;
}) {
  return authRequest<{ application: { id: string; jobId: string; status: string; appliedAt: string } }>(
    `/api/jobs/listings/${jobId}/apply`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
}

export async function getMyApplications() {
  return authRequest<{ applications: JobApplicationApi[] }>('/api/jobs/applications');
}

export async function getApplicationById(id: string) {
  return authRequest<{ application: JobApplicationApi }>(`/api/jobs/applications/${id}`);
}

export async function withdrawApplication(id: string) {
  return authRequest<{ ok: boolean; status: string }>(`/api/jobs/applications/${id}/withdraw`, { method: 'POST' });
}

export async function getMyOffers() {
  return authRequest<{ offers: JobOfferApi[] }>('/api/jobs/offers');
}

export async function respondToOffer(offerId: string, accept: boolean) {
  return authRequest<{ ok: boolean; status: string }>(`/api/jobs/offers/${offerId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accept }),
  });
}

export async function getMyInterviews() {
  return authRequest<{ interviews: JobInterviewApi[] }>('/api/jobs/interviews');
}

export async function submitFeedback(payload: { rating: number; feedback: string }) {
  return authRequest<{ ok: boolean }>('/api/jobs/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ─── Employer API ────────────────────────────────────────────────────

export async function getEmployerJobListings() {
  return authRequest<{ listings: JobListingApi[] }>('/api/jobs/employer/listings');
}

export async function createJobListing(payload: {
  title: string;
  department: string;
  location: string;
  employmentType?: string;
  description: string;
  requirements?: string[];
  benefits?: string[];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  experienceMin?: number;
  experienceMax?: number;
  skills?: string[];
  status?: string;
  featured?: boolean;
}) {
  return authRequest<{ listing: JobListingApi }>('/api/jobs/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function patchJobListing(id: string, payload: Partial<JobListingApi>) {
  return authRequest<{ ok: boolean }>(`/api/jobs/listings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteJobListing(id: string) {
  return authRequest<{ ok: boolean }>(`/api/jobs/listings/${id}`, {
    method: 'DELETE',
  });
}

export async function getEmployerApplications(params: {
  status?: string;
  jobId?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '') query.set(key, String(val));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return authRequest<{ applications: EmployerApplicationApi[]; total: number; limit: number; offset: number }>(
    `/api/jobs/employer/applications${suffix}`
  );
}

export async function reviewApplication(id: string, status: JobApplicationStatus, notes?: string) {
  return authRequest<{ ok: boolean; status: string }>(`/api/jobs/employer/applications/${id}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  });
}

export async function makeJobOffer(payload: {
  applicationId: string;
  offerDetails: string;
  salary: number;
  salaryCurrency?: string;
  startDate?: string;
  expiresInDays?: number;
}) {
  return authRequest<{ offer: any }>('/api/jobs/employer/offers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getEmployerOffers() {
  return authRequest<{ offers: any[] }>('/api/jobs/employer/offers');
}

// ─── Admin API ───────────────────────────────────────────────────────

export async function getAdminJobListings(params: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '') query.set(key, String(val));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return authRequest<{ listings: any[]; total: number; limit: number; offset: number }>(
    `/api/jobs/admin/listings${suffix}`
  );
}

export async function moderateJobListing(id: string, status: string) {
  return authRequest<{ ok: boolean }>(`/api/jobs/admin/listings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function getJobPortalStats() {
  return authRequest<{ stats: JobPortalStatsApi }>('/api/jobs/admin/stats');
}
