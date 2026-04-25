import { UserRole } from '../types/index.js';

export const ROLES = Object.values(UserRole);

export const API_PATHS = {
  // Public (no auth)
  PUBLIC: {
    REGISTER: '/api/public/register',
    CONTACT: '/api/public/contact',
    STATS: '/api/public/stats',
  },
  // Admin only
  ADMIN: {
    ESCALATIONS: '/api/admin/escalations',
    USERS: '/api/admin/users',
    ANALYTICS: '/api/admin/analytics',
  },
  // Employee only
  EMPLOYEE: {
    PROFILE: '/api/employee/profile',
    MATCHES: '/api/employee/matches',
    CONCIERGE: '/api/employee/concierge',
  },
  // Employer only
  EMPLOYER: {
    REQUISITIONS: '/api/employer/requisitions',
    CANDIDATES: '/api/employer/candidates',
    MATCHES: '/api/employer/matches',
  },
  // Shared (all authenticated)
  SHARED: {
    ME: '/api/auth/me',
    NOTIFICATIONS: '/api/notifications',
  },
} as const;
