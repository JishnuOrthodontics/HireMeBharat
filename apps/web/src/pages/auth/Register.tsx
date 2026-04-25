import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, type UserRole } from '../../contexts/AuthContext';
import './Auth.css';

type RoleChoice = UserRole | null;

export default function Register() {
  const { signUpWithEmail, signInWithGoogle, clearError, error: authError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedRole = searchParams.get('role')?.toUpperCase() as RoleChoice;

  const [step, setStep] = useState<1 | 2>(preselectedRole ? 2 : 1);
  const [role, setRole] = useState<RoleChoice>(preselectedRole || null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectRole = (r: RoleChoice) => {
    setRole(r);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!agreed) {
      setError('Please agree to the terms');
      return;
    }
    if (!role) {
      setError('Please select a role');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUpWithEmail(email, password, name, role);
      const dashboard = role === 'EMPLOYER' ? '/employer' : '/employee';
      navigate(dashboard, { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      const { isNewUser } = await signInWithGoogle();
      if (isNewUser) {
        // Pass selected role via state if they already chose one
        navigate('/role-select', { state: { preselectedRole: role }, replace: true });
      } else {
        // Already registered — redirect to dashboard
        // PublicOnlyGuard will handle this
      }
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

      <div className={`auth-card glass-card ${step === 1 ? 'auth-card-wide' : ''}`}>
        <div className="auth-header">
          <span className="material-symbols-outlined auth-logo-icon">diamond</span>
          <h1 className="text-h1">{step === 1 ? 'Join HireMeBharat' : 'Create your account'}</h1>
          <p className="text-body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
            {step === 1
              ? 'Tell us who you are to get started'
              : `Registering as ${role === 'EMPLOYEE' ? 'a Job Seeker' : 'an Employer'}`}
          </p>
        </div>

        {displayError && (
          <div className="auth-error">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
            {displayError}
            <button className="auth-error-close" onClick={() => { setError(''); clearError(); }}>×</button>
          </div>
        )}

        {step === 1 ? (
          /* === Step 1: Role Selection === */
          <div className="role-selection">
            <button className="role-card glass-card glass-card-hover" onClick={() => selectRole('EMPLOYEE')}>
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

            <button className="role-card glass-card glass-card-hover" onClick={() => selectRole('EMPLOYER')}>
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
        ) : (
          /* === Step 2: Account Form === */
          <>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label text-label-caps">Full Name</label>
                <input type="text" className="glass-input form-input" placeholder="John Doe"
                  value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
              </div>

              <div className="form-group">
                <label className="form-label text-label-caps">Email</label>
                <input type="email" className="glass-input form-input" placeholder="your@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label text-label-caps">Password</label>
                  <input type="password" className="glass-input form-input" placeholder="Min 8 characters"
                    value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                    autoComplete="new-password" />
                </div>
                <div className="form-group">
                  <label className="form-label text-label-caps">Confirm Password</label>
                  <input type="password" className="glass-input form-input" placeholder="Re-enter password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                    autoComplete="new-password" />
                </div>
              </div>

              <label className="form-checkbox">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                <span className="text-caption">I agree to the <a href="#" className="auth-link">Terms of Service</a> and <a href="#" className="auth-link">Privacy Policy</a></span>
              </label>

              <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading || !agreed}>
                {loading ? (
                  <><span className="auth-spinner" /> Creating account...</>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="auth-divider"><span>or</span></div>

            <button
              className="btn btn-secondary btn-lg auth-google"
              style={{ width: '100%' }}
              onClick={handleGoogleRegister}
              disabled={loading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Register with Google
            </button>

            <button className="btn btn-ghost" onClick={() => { setStep(1); setRole(null); }} style={{ width: '100%', marginTop: 8 }}>
              ← Back to role selection
            </button>
          </>
        )}

        <p className="auth-footer text-body-md">
          Already have an account? <Link to="/signin" className="auth-link">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
