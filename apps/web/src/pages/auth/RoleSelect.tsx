import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../../contexts/AuthContext';
import './Auth.css';

/**
 * Role selection page for Google Sign-In users who don't have a profile yet.
 */
export default function RoleSelect() {
  const { firebaseUser, completeGoogleRegistration, needsRoleSelection } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If user somehow reaches here without needing role selection, redirect
  if (!firebaseUser || !needsRoleSelection) {
    // Will be handled by route guards
  }

  const selectRole = async (role: UserRole) => {
    setError('');
    setLoading(true);
    try {
      await completeGoogleRegistration(role);
      const dashboard = role === 'EMPLOYER' ? '/employer' : role === 'ADMIN' ? '/admin' : '/employee';
      navigate(dashboard, { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-effects">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <div className="auth-card glass-card auth-card-wide">
        <div className="auth-header">
          <span className="material-symbols-outlined auth-logo-icon">diamond</span>
          <h1 className="text-h1">Almost there!</h1>
          <p className="text-body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
            {firebaseUser?.displayName ? (
              <>Welcome, <strong>{firebaseUser.displayName}</strong>! Tell us how you'd like to use HireMeBharat</>
            ) : (
              'Tell us how you\'d like to use HireMeBharat'
            )}
          </p>
          {firebaseUser?.photoURL && (
            <img
              src={firebaseUser.photoURL}
              alt=""
              style={{
                width: 56, height: 56, borderRadius: '50%',
                margin: '12px auto 0', border: '3px solid var(--color-primary-container)',
              }}
            />
          )}
        </div>

        {error && (
          <div className="auth-error">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
            {error}
          </div>
        )}

        <div className="role-selection">
          <button
            className="role-card glass-card glass-card-hover"
            onClick={() => selectRole('EMPLOYEE')}
            disabled={loading}
          >
            <div className="role-icon emerald">
              <span className="material-symbols-outlined">person_search</span>
            </div>
            <h3 className="text-h3">I'm a Job Seeker</h3>
            <p className="text-caption" style={{ color: 'var(--color-on-surface-variant)' }}>
              Find curated executive roles matched to your career trajectory
            </p>
            <span className="role-select-arrow">
              <span className="material-symbols-outlined">arrow_forward</span>
            </span>
          </button>

          <button
            className="role-card glass-card glass-card-hover"
            onClick={() => selectRole('EMPLOYER')}
            disabled={loading}
          >
            <div className="role-icon gold">
              <span className="material-symbols-outlined">business_center</span>
            </div>
            <h3 className="text-h3">I'm Hiring</h3>
            <p className="text-caption" style={{ color: 'var(--color-on-surface-variant)' }}>
              Access pre-vetted, AI-matched candidates for your critical roles
            </p>
            <span className="role-select-arrow gold">
              <span className="material-symbols-outlined">arrow_forward</span>
            </span>
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <span className="auth-spinner" />
            <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', marginTop: 8 }}>
              Setting up your account...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
