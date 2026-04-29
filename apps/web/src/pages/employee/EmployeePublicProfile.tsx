import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getEmployeePublicProfile, type EmployeePublicProfileApi } from '../../lib/employeeApi';
import './Employee.css';

export default function EmployeePublicProfile() {
  const { uid = '' } = useParams();
  const [profile, setProfile] = useState<EmployeePublicProfileApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getEmployeePublicProfile(uid);
        if (!cancelled) setProfile(res.profile);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Unable to load employee profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (uid) load();
    else {
      setLoading(false);
      setError('Invalid employee id');
    }
    return () => {
      cancelled = true;
    };
  }, [uid]);

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

  return (
    <div style={{ maxWidth: 920, margin: '24px auto' }}>
      <div className="dash-card">
        <div className="emp-profile-banner" style={bannerStyle}>
          {profile.photoURL ? (
            <div className="emp-profile-avatar-lg">
              <img src={profile.photoURL} alt="" />
            </div>
          ) : (
            <div className="emp-profile-avatar-lg">{initials || 'EM'}</div>
          )}
        </div>
        <div className="emp-profile-info">
          <h1 className="emp-profile-name-lg">{profile.displayName}</h1>
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

      {(profile.linkedinUrl || profile.portfolioUrl) ? (
        <div className="dash-card">
          <h2 className="emp-section-title">Links</h2>
          <div className="dash-card-body" style={{ padding: '0 16px 16px', display: 'grid', gap: 8 }}>
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
