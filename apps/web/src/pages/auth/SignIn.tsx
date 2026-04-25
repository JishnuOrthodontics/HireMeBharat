import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

export default function SignIn() {
  const { signInWithEmail, signInWithGoogle, clearError, error: authError, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect when profile is available (after sign-in resolves)
  useEffect(() => {
    if (userProfile) {
      const dashboards: Record<string, string> = {
        ADMIN: '/admin',
        EMPLOYEE: '/employee',
        EMPLOYER: '/employer',
      };
      navigate(from || dashboards[userProfile.role] || '/employee', { replace: true });
    }
  }, [userProfile, navigate, from]);
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      // useEffect above will handle redirect when userProfile is set
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const { isNewUser } = await signInWithGoogle();
      if (isNewUser) {
        navigate('/role-select', { replace: true });
      }
      // If existing user, useEffect + PublicOnlyGuard will redirect
    } catch (err: any) {
      if (err.message) setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const displayError = error || authError;

  return (
    <div className="auth-page">
      <div className="auth-bg-effects">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <div className="auth-card glass-card">
        <div className="auth-header">
          <span className="material-symbols-outlined auth-logo-icon">diamond</span>
          <h1 className="text-h1">Welcome back</h1>
          <p className="text-body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
            Sign in to your HireMeBharat account
          </p>
        </div>

        {displayError && (
          <div className="auth-error">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
            {displayError}
            <button
              className="auth-error-close"
              onClick={() => { setError(''); clearError(); }}
            >×</button>
          </div>
        )}

        <form onSubmit={handleEmailSignIn} className="auth-form">
          <div className="form-group">
            <label className="form-label text-label-caps">Email</label>
            <input
              type="email"
              className="glass-input form-input"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label text-label-caps">Password</label>
              <a href="#" className="form-link text-caption">Forgot password?</a>
            </div>
            <input
              type="password"
              className="glass-input form-input"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
            {loading ? (
              <><span className="auth-spinner" /> Signing in...</>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          className="btn btn-secondary btn-lg auth-google"
          style={{ width: '100%' }}
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Sign in with Google
        </button>

        <p className="auth-footer text-body-md">
          Don't have an account? <Link to="/register" className="auth-link">Register</Link>
        </p>
      </div>
    </div>
  );
}
