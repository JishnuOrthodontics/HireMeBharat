import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  signOut as firebaseSignOutDirect,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

// ---- Types ----
export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'EMPLOYER';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  createdAt?: string;
}

interface AuthState {
  /** Firebase user object (null if signed out) */
  firebaseUser: User | null;
  /** Backend user profile (null if not yet registered) */
  userProfile: UserProfile | null;
  /** True while Firebase auth state is resolving */
  loading: boolean;
  /** True when a Google user needs to pick a role before first use */
  needsRoleSelection: boolean;
  /** Last error message */
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<{ needsRoleSelection: boolean }>;
  signUpWithEmail: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
  completeGoogleRegistration: (role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  clearError: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/** Duplicate bearer on a non-standard header so proxies that strip `Authorization` still reach api-auth. */
function bearerHeaders(token: string): Record<string, string> {
  const bearer = `Bearer ${token}`;
  return {
    Authorization: bearer,
    'X-Firebase-Authorization': bearer,
  };
}

// ---- Context ----
const AuthContext = createContext<AuthContextValue | null>(null);

// ---- API helpers ----
async function apiPost(path: string, token: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...bearerHeaders(token) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `API error ${res.status}`);
  }
  return res.json();
}

async function apiGet(path: string, token: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: bearerHeaders(token),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `API error ${res.status}`);
  }
  return res.json();
}

// ---- Provider ----
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    userProfile: null,
    loading: true,
    needsRoleSelection: false,
    error: null,
  });

  // Helper to merge partial state
  const patch = (partial: Partial<AuthState>) =>
    setState(prev => ({ ...prev, ...partial }));

  // Fetch the user profile from the backend
  const fetchProfile = useCallback(async (user: User): Promise<UserProfile | null> => {
    try {
      const token = await user.getIdToken();
      const result = await apiGet('/api/public/me', token);
      return result?.profile || result || null;
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('account has been revoked') || msg.includes('ACCOUNT_REVOKED')) {
        throw new Error('Your account has been revoked. Please contact admin.');
      }
      return null;
    }
  }, []);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await fetchProfile(user);
        patch({
          firebaseUser: user,
          userProfile: profile,
          needsRoleSelection: !profile,
          loading: false,
        });
      } else {
        patch({
          firebaseUser: null,
          userProfile: null,
          needsRoleSelection: false,
          loading: false,
        });
      }
    });
    return unsubscribe;
  }, [fetchProfile]);

  // ---- Auth methods ----

  const signInWithEmail = async (email: string, password: string): Promise<{ needsRoleSelection: boolean }> => {
    patch({ loading: true, error: null });
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      let profile: UserProfile | null = null;
      try {
        profile = await fetchProfile(cred.user);
      } catch (err: any) {
        const msg = String(err?.message || '');
        if (msg.toLowerCase().includes('account has been revoked') || msg.includes('ACCOUNT_REVOKED')) {
          await firebaseSignOutDirect(auth);
          throw new Error('Your account has been revoked. Please contact admin.');
        }
        throw err;
      }
      if (!profile) {
        // Firebase user exists but backend profile is missing; send user to role selection
        // so we can create the app profile via /api/public/register.
        patch({
          firebaseUser: cred.user,
          userProfile: null,
          loading: false,
          needsRoleSelection: true,
        });
        return { needsRoleSelection: true };
      }
      patch({ firebaseUser: cred.user, userProfile: profile, loading: false, needsRoleSelection: false });
      return { needsRoleSelection: false };
    } catch (err: any) {
      const msg = friendlyError(err.code || err.message);
      patch({ loading: false, error: msg });
      throw new Error(msg);
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string, role: UserRole) => {
    patch({ loading: true, error: null });
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });

      const token = await cred.user.getIdToken();
      const result = await apiPost('/api/public/register', token, {
        displayName: name,
        role,
      });

      patch({
        firebaseUser: cred.user,
        userProfile: result.profile || { uid: cred.user.uid, email, displayName: name, role },
        loading: false,
        needsRoleSelection: false,
      });
    } catch (err: any) {
      const msg = friendlyError(err.code || err.message);
      patch({ loading: false, error: msg });
      throw new Error(msg);
    }
  };

  const signInWithGoogle = async (): Promise<{ isNewUser: boolean }> => {
    patch({ loading: true, error: null });
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const profile = await fetchProfile(cred.user);

      if (profile) {
        patch({ firebaseUser: cred.user, userProfile: profile, loading: false, needsRoleSelection: false });
        return { isNewUser: false };
      } else {
        patch({ firebaseUser: cred.user, userProfile: null, loading: false, needsRoleSelection: true });
        return { isNewUser: true };
      }
    } catch (err: any) {
      const msg = friendlyError(err.code || err.message);
      patch({ loading: false, error: msg });
      throw new Error(msg);
    }
  };

  const completeGoogleRegistration = async (role: UserRole) => {
    if (!state.firebaseUser) throw new Error('No authenticated user');
    patch({ loading: true, error: null });
    try {
      const token = await state.firebaseUser.getIdToken();
      const result = await apiPost('/api/public/register', token, {
        displayName: state.firebaseUser.displayName || 'User',
        role,
        photoURL: state.firebaseUser.photoURL || undefined,
      });
      patch({
        userProfile: result.profile || {
          uid: state.firebaseUser.uid,
          email: state.firebaseUser.email!,
          displayName: state.firebaseUser.displayName || 'User',
          role,
        },
        loading: false,
        needsRoleSelection: false,
      });
    } catch (err: any) {
      const msg = friendlyError(err.code || err.message);
      patch({ loading: false, error: msg });
      throw new Error(msg);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    patch({ firebaseUser: null, userProfile: null, needsRoleSelection: false, error: null });
  };

  const getIdToken = async () => {
    if (!state.firebaseUser) return null;
    return state.firebaseUser.getIdToken();
  };

  const clearError = () => patch({ error: null });

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        completeGoogleRegistration,
        signOut,
        getIdToken,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---- Hook ----
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

// ---- Helpers ----
function friendlyError(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed. Please try again';
    case 'auth/cancelled-popup-request':
      return '';
    default:
      return code;
  }
}

