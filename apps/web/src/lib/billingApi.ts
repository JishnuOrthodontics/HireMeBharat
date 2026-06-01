import { authRequest } from './apiClient';

const request = authRequest;

export interface BillingStatusApi {
  plan: 'FREE' | 'PRO' | 'PREMIUM';
  expiresAt: string | null;
  cycle: 'monthly' | 'yearly' | null;
  credits: number;
  userRole: 'EMPLOYEE' | 'EMPLOYER' | 'ADMIN';
}

export interface BillingTransactionApi {
  id: string;
  type: 'SUBSCRIPTION' | 'CREDITS' | 'FEATURED_JOB';
  amount: number;
  currency: string;
  description: string;
  status: string;
  createdAt: string | null;
}

export interface CheckoutPayload {
  type: 'SUBSCRIPTION' | 'CREDITS' | 'FEATURED_JOB';
  plan?: 'PRO' | 'PREMIUM';
  cycle?: 'monthly' | 'yearly';
  creditsAmount?: number;
  jobId?: string;
}

export async function getBillingStatus() {
  return request<BillingStatusApi>('/api/billing/status');
}

export async function getBillingHistory() {
  return request<{ transactions: BillingTransactionApi[] }>('/api/billing/history');
}

export async function createCheckoutSession(payload: CheckoutPayload) {
  return request<{ mode: 'stripe' | 'sandbox'; checkoutUrl: string }>('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function simulateSandboxCheckout(payload: CheckoutPayload) {
  return request<{ ok: boolean; message: string }>('/api/billing/sandbox/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function createPortalSession() {
  return request<{ portalUrl: string }>('/api/billing/portal', {
    method: 'POST',
  });
}

export async function getUnlockedCandidates() {
  return request<{ unlockedUids: string[] }>('/api/billing/unlocked-candidates');
}

export async function unlockCandidate(candidateUid: string) {
  return request<{ ok: boolean; unlocked: boolean; remainingCredits?: number }>('/api/billing/unlock-candidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateUid }),
  });
}
