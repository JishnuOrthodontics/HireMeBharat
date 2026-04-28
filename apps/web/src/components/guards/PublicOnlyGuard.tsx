import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../../contexts/AuthContext';

/**
 * Wraps public pages (signin, register). Redirects to dashboard if already logged in.
 */
export default function PublicOnlyGuard({ children }: { children: React.ReactNode }) {
  const { firebaseUser, userProfile, loading, needsRoleSelection } = useAuth();

  if (loading) return null;

  // If user needs role selection, let them go to auth pages or role-select
  if (needsRoleSelection) return <>{children}</>;

  if (firebaseUser && userProfile) {
    const dashboardMap: Record<UserRole, string> = {
      ADMIN: '/admin',
      EMPLOYEE: '/employee',
      EMPLOYER: '/employer',
    };
    return <Navigate to={dashboardMap[userProfile.role]} replace />;
  }

  return <>{children}</>;
}

