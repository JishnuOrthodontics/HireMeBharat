import { useEffect, useState } from 'react';
import { getEmployeeProfile, patchEmployeeProfile, type EmployeeProfileApi } from '../../lib/employeeApi';

export default function EmployeeProfile() {
  const [profile, setProfile] = useState<EmployeeProfileApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [headlineDraft, setHeadlineDraft] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getEmployeeProfile();
      setProfile(res.profile);
      setHeadlineDraft(res.profile.headline || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!profile) return;
    setError('');
    try {
      await patchEmployeeProfile({ headline: headlineDraft });
      setProfile({ ...profile, headline: headlineDraft });
      setEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
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

  return (
    <>
      {/* Profile Header */}
      <div className="dash-card">
        <div className="emp-profile-banner">
          <div className="emp-profile-avatar-lg">{initials || 'EM'}</div>
        </div>
        <div className="emp-profile-info">
          <h1 className="emp-profile-name-lg">{profile.displayName}</h1>
          <p className="emp-profile-headline">{profile.headline || 'Add a headline to describe your career goals.'}</p>
          <p className="emp-profile-location">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
            {profile.location || 'Location not set'} {profile.openToRelocation ? '· Open to relocation' : ''}
          </p>
          <div className="emp-profile-actions">
            {!editing ? (
              <button className="btn btn-primary" style={{ fontSize: 13, padding: '8px 20px' }} onClick={() => setEditing(true)}>
                Edit Profile
              </button>
            ) : (
              <button className="btn btn-primary" style={{ fontSize: 13, padding: '8px 20px' }} onClick={save}>
                Save
              </button>
            )}
            <button className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 20px' }} onClick={load}>Refresh</button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="dash-card">
        <h2 className="emp-section-title">About</h2>
        <div className="dash-card-body">
          {editing ? (
            <textarea
              className="glass-input"
              style={{ width: '100%', minHeight: 100 }}
              value={headlineDraft}
              onChange={(e) => setHeadlineDraft(e.target.value)}
            />
          ) : (
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-on-surface)' }}>
              {profile.headline || 'No about summary yet. Click edit profile to add one.'}
            </p>
          )}
        </div>
      </div>

      {/* Experience */}
      <div className="dash-card">
        <h2 className="emp-section-title">Experience</h2>
        {(profile.experience || []).map((exp, i) => (
          <div key={i} className="emp-exp-item">
            <div className="emp-exp-logo">💼</div>
            <div>
              <p className="emp-exp-title">{exp.title}</p>
              <p className="emp-exp-company">{exp.company}</p>
              <p className="emp-exp-dates">{exp.years} yrs</p>
            </div>
          </div>
        ))}
        {(profile.experience || []).length === 0 && (
          <p style={{ color: 'var(--color-on-surface-variant)' }}>No experience added yet.</p>
        )}
      </div>

      {/* Skills */}
      <div className="dash-card">
        <h2 className="emp-section-title">Skills & Expertise</h2>
        <div className="emp-skills-grid">
          {(profile.skills || []).map(skill => (
            <span key={skill} className="emp-skill-chip">{skill}</span>
          ))}
          {(profile.skills || []).length === 0 && (
            <p style={{ color: 'var(--color-on-surface-variant)' }}>No skills added yet.</p>
          )}
        </div>
      </div>

      {/* Education */}
      <div className="dash-card">
        <h2 className="emp-section-title">Education</h2>
        <p style={{ color: 'var(--color-on-surface-variant)' }}>Education can be added in a later profile version.</p>
      </div>
    </>
  );
}

