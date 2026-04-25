import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../../contexts/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

/**
 * Wraps role-specific routes. Redirects to the correct dashboard if role mismatch.
 */
export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { userProfile } = useAuth();

  if (!userProfile) {
    return <Navigate to="/signin" replace />;
  }

  if (!allowedRoles.includes(userProfile.role)) {
    // Redirect to the user's own dashboard
    const dashboardMap: Record<UserRole, string> = {
      ADMIN: '/admin',
      EMPLOYEE: '/employee',
      EMPLOYER: '/employer',
    };
    return <Navigate to={dashboardMap[userProfile.role]} replace />;
  }

  return <>{children}</>;
}
