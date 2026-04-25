import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Wraps protected routes. Redirects to /signin if not authenticated.
 * If authenticated but needs role selection, redirects to /role-select.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { firebaseUser, userProfile, loading, needsRoleSelection } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!firebaseUser) {
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  }

  if (needsRoleSelection && location.pathname !== '/role-select') {
    return <Navigate to="/role-select" replace />;
  }

  if (!userProfile && !needsRoleSelection) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}

function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#131313',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, border: '3px solid rgba(255,255,255,0.1)',
          borderTop: '3px solid #50fa7b', borderRadius: '50%',
          animation: 'spin 1s linear infinite', margin: '0 auto 16px',
        }} />
        <p style={{ color: '#bbcbb8', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
          Authenticating...
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
