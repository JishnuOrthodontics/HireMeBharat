// Shared API client utilities
import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/** Retrieve Firebase ID token */
export async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

/** Build Bearer headers */
export function bearerHeaders(token: string): Record<string, string> {
  const bearer = `Bearer ${token}`;
  return {
    Authorization: bearer,
    'X-Firebase-Authorization': bearer,
  };
}

/** Core request handler */
async function coreRequest<T>(path: string, init: RequestInit = {}, requireAuth: boolean): Promise<T> {
  let headers: any = {};
  if (requireAuth) {
    const token = await getToken();
    headers = { ...bearerHeaders(token), ...(init.headers || {}) };
  } else {
    headers = init.headers || {};
  }
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    // Auto logout on 401
    if (response.status === 401) {
      try { await auth.signOut(); } catch (_) {}
    }
    const data = await response.json().catch(() => ({} as any));
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  // 204 No Content
  if (response.status === 204) return {} as T;
  return response.json() as Promise<T>;
}

/** Authenticated request */
export async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return coreRequest<T>(path, init ?? {}, true);
}

/** Public (unauthenticated) request */
export async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return coreRequest<T>(path, init ?? {}, false);
}
