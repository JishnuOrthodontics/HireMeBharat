import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getEmployeePublicProfile, type EmployeePublicProfileApi } from '../../lib/employeeApi';
import { getBillingStatus, getUnlockedCandidates, unlockCandidate } from '../../lib/billingApi';
import './Employee.css';

export default function EmployeePublicProfile() {
  const { uid = '' } = useParams();
  const [profile, setProfile] = useState<EmployeePublicProfileApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Billing & unlock states
  const [billingStatus, setBillingStatus] = useState<any>(null);
  const [unlockedCandidates, setUnlockedCandidates] = useState<string[]>([]);
  const [unlocking, setUnlocking] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, statusRes, unlockedRes] = await Promise.all([
        getEmployeePublicProfile(uid),
        getBillingStatus().catch(() => null),
        getUnlockedCandidates().catch(() => ({ unlockedUids: [] })),
      ]);
      setProfile(profileRes.profile);
      if (statusRes) setBillingStatus(statusRes);
      if (unlockedRes) setUnlockedCandidates(unlockedRes.unlockedUids);
    } catch (err: any) {
      setError(err.message || 'Unable to load employee profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (uid) {
      loadData();
    } else {
      setLoading(false);
      setError('Invalid employee id');
    }
  }, [uid]);

  const handleUnlock = async () => {
    if (!uid) return;
    setUnlocking(true);
    try {
      const res = await unlockCandidate(uid);
      if (res.unlocked) {
        setUnlockedCandidates((prev) => [...prev, uid]);
        if (billingStatus) {
          setBillingStatus({
            ...billingStatus,
            credits: res.remainingCredits !== undefined ? res.remainingCredits : billingStatus.credits - 1,
          });
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to unlock candidate profile');
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) return <div className="dash-card"><p style={{ padding: 16 }}>Loading profile...</p></div>;
  if (error) return <div className="dash-card"><p style={{ padding: 16, color: 'var(--color-error)' }}>{error}</p></div>;
  if (!profile) return null;

  const initials = profile.displayName
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const bannerStyle = profile.bannerUrl
    ? { backgroundImage: `url(${profile.bannerUrl})`, backgroundSize: 'cover' as const, backgroundPosition: 'center' as const }
    : undefined;

  const isUnlocked = billingStatus?.plan === 'PRO' || unlockedCandidates.includes(uid);

  return (
    <div style={{ maxWidth: 920, margin: '24px auto', padding: '0 16px' }}>
      <style>{`
        .premium-pulsing-avatar {
          border: 3px solid #d4af37 !important;
          box-shadow: 0 0 15px rgba(212, 175, 85, 0.6);
          animation: pulse-gold 2s infinite ease-in-out;
        }
        @keyframes pulse-gold {
          0% { box-shadow: 0 0 0 0 rgba(212, 175, 85, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(212, 175, 85, 0); }
          100% { box-shadow: 0 0 0 0 rgba(212, 175, 85, 0); }
        }
        .locked-overlay {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          background: rgba(26, 26, 46, 0.6);
          border-radius: 12px;
          backdrop-filter: blur(8px);
          border: 1px dashed rgba(212, 175, 85, 0.3);
          margin-top: 12px;
        }
        .locked-title {
          font-size: 16px;
          font-weight: 600;
          color: #d4af37;
          margin: 8px 0 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .locked-desc {
          font-size: 13px;
          color: var(--color-on-surface-variant);
          max-width: 480px;
          line-height: 1.5;
          margin-bottom: 16px;
          text-align: center;
        }
      `}</style>

      <div className="dash-card">
        <div className="emp-profile-banner" style={bannerStyle}>
          {profile.photoURL ? (
            <div className={`emp-profile-avatar-lg ${profile.isPremium ? 'premium-pulsing-avatar' : ''}`}>
              <img src={profile.photoURL} alt="" />
            </div>
          ) : (
            <div className={`emp-profile-avatar-lg ${profile.isPremium ? 'premium-pulsing-avatar' : ''}`}>{initials || 'EM'}</div>
          )}
        </div>
        <div className="emp-profile-info">
          <h1 className="emp-profile-name-lg" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {profile.displayName}
            {profile.isPremium && (
              <span className="premium-badge-gold" style={{
                background: 'linear-gradient(135deg, #d4af37, #f9d976)',
                color: '#1a1a2e',
                fontSize: 10,
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '12px',
                textTransform: 'uppercase',
                boxShadow: '0 0 8px rgba(212, 175, 85, 0.4)',
                letterSpacing: '0.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>workspace_premium</span>
                PREMIUM
              </span>
            )}
          </h1>
          <p className="emp-profile-headline">{profile.headline || 'No headline added yet.'}</p>
          <p className="emp-profile-location">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
            {profile.location || 'Location not set'} · {profile.yearsExperience} years exp
          </p>
          {profile.openToWork && (
            <span className="emp-match-tag" style={{ marginTop: 10, display: 'inline-flex' }}>Open to Work</span>
          )}
          <div style={{ marginTop: 16 }}>
            <Link to="/employer/candidates" className="btn btn-primary">Back to Dashboard</Link>
          </div>
        </div>
      </div>

      {profile.about?.trim() ? (
        <div className="dash-card">
          <h2 className="emp-section-title">Professional summary</h2>
          <div className="dash-card-body" style={{ padding: '0 16px 16px' }}>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-on-surface)', whiteSpace: 'pre-wrap' }}>{profile.about.trim()}</p>
          </div>
        </div>
      ) : null}

      {profile.resume ? (
        <div className="dash-card">
          <h2 className="emp-section-title">Resume</h2>
          <div className="dash-card-body" style={{ padding: '0 16px 16px' }}>
            {isUnlocked ? (
              <a
                href={profile.resume.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                download={profile.resume.fileName}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  download
                </span>
                Download {profile.resume.fileName}
              </a>
            ) : (
              <div className="locked-overlay">
                <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#d4af37' }}>lock</span>
                <p className="locked-title">Candidate Details Locked</p>
                <p className="locked-desc">
                  This candidate's resume and verified contact channels are secured under premium lock.
                  You can unlock them with 1 credit or access unlimited candidate views with Employer Pro.
                </p>
                {billingStatus?.credits > 0 ? (
                  <button className="btn btn-gold" onClick={handleUnlock} disabled={unlocking} style={{ fontSize: 13, padding: '8px 20px' }}>
                    {unlocking ? 'Unlocking...' : `Unlock with 1 Credit (${billingStatus.credits} available)`}
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                    <button className="btn btn-disabled" disabled style={{ fontSize: 13, padding: '8px 20px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: 'none' }}>
                      Unlock with 1 Credit (0 Credits remaining)
                    </button>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      <Link to="/employer/pricing" className="btn btn-gold" style={{ fontSize: 12, padding: '6px 12px' }}>
                        Buy Credits
                      </Link>
                      <Link to="/employer/pricing" className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }}>
                        Get Employer Pro
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {(profile.linkedinUrl || profile.portfolioUrl) ? (
        <div className="dash-card">
          <h2 className="emp-section-title">Links</h2>
          <div className="dash-card-body" style={{ padding: '0 16px 16px', display: 'grid', gap: 8 }}>
            {isUnlocked ? (
              <>
                {profile.linkedinUrl ? (
                  <p style={{ margin: 0 }}>
                    <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 12 }}>LinkedIn · </span>
                    <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-container)' }}>
                      {profile.linkedinUrl}
                    </a>
                  </p>
                ) : null}
                {profile.portfolioUrl ? (
                  <p style={{ margin: 0 }}>
                    <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 12 }}>Portfolio · </span>
                    <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-container)' }}>
                      {profile.portfolioUrl}
                    </a>
                  </p>
                ) : null}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.05)' }}>
                <span className="material-symbols-outlined" style={{ color: '#d4af37', fontSize: 18 }}>lock</span>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-on-surface-variant)' }}>
                  Social connections are obscured. <span style={{ color: '#d4af37' }}>Unlock the resume above</span> to reveal professional links.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="dash-card">
        <h2 className="emp-section-title">Skills</h2>
        <div className="emp-skills-grid">
          {profile.skills.map((skill) => (
            <span key={skill} className="emp-skill-chip">
              {skill}
            </span>
          ))}
          {profile.skills.length === 0 && <p style={{ color: 'var(--color-on-surface-variant)' }}>No skills listed.</p>}
        </div>
      </div>

      {(profile.education && profile.education.length > 0) ? (
        <div className="dash-card">
          <h2 className="emp-section-title">Education</h2>
          {profile.education!.map((ed, i) => (
            <div key={i} className="emp-exp-item">
              <div className="emp-exp-logo">🎓</div>
              <div>
                <p className="emp-exp-title">{ed.degree}</p>
                <p className="emp-exp-company">{ed.institution}</p>
                {ed.yearEnd != null ? <p className="emp-exp-dates">{ed.yearEnd}</p> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="dash-card">
        <h2 className="emp-section-title">Work experience</h2>
        {profile.experience.map((exp, i) => (
          <div key={`${exp.company}-${i}`} className="emp-exp-item">
            <div className="emp-exp-logo">💼</div>
            <div>
              <p className="emp-exp-title">{exp.title}</p>
              <p className="emp-exp-company">{exp.company}</p>
              <p className="emp-exp-dates">{exp.years} yrs</p>
            </div>
          </div>
        ))}
        {profile.experience.length === 0 && (
          <p style={{ padding: 16, color: 'var(--color-on-surface-variant)' }}>No experience listed.</p>
        )}
      </div>
    </div>
  );
}
