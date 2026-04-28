import { useEffect, useState } from 'react';
import { getEmployerProfile, getEmployerRequisitions, patchEmployerProfile, type EmployerProfileApi, type EmployerRequisitionApi } from '../../lib/employerApi';

export default function EmployerProfile() {
  const [profile, setProfile] = useState<EmployerProfileApi | null>(null);
  const [openRoles, setOpenRoles] = useState<EmployerRequisitionApi[]>([]);
  const [editing, setEditing] = useState(false);
  const [draftAbout, setDraftAbout] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, reqRes] = await Promise.all([
        getEmployerProfile(),
        getEmployerRequisitions({ status: 'ACTIVE', limit: 10 }),
      ]);
      setProfile(profileRes.profile);
      setOpenRoles(reqRes.requisitions);
      setDraftAbout(profileRes.profile.about || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load company profile');
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
      await patchEmployerProfile({ about: draftAbout });
      setProfile({ ...profile, about: draftAbout });
      setEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    }
  };

  if (loading) return <div className="dash-card"><p style={{ padding: 16 }}>Loading company profile...</p></div>;
  if (error) return <div className="dash-card"><p style={{ padding: 16, color: 'var(--color-error)' }}>{error}</p></div>;
  if (!profile) return null;

  const initials = profile.companyName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'CO';

  return (
    <>
      {/* Company Header */}
      <div className="dash-card">
        <div className="empr-profile-banner">
          <div className="empr-profile-logo">{initials}</div>
        </div>
        <div className="empr-profile-info">
          <h1 className="empr-company-name">{profile.companyName}</h1>
          <p className="empr-company-tagline">{profile.tagline}</p>
          <div className="empr-company-meta">
            <span className="empr-company-meta-item">
              <span className="material-symbols-outlined">apartment</span>
              {profile.industry}
            </span>
            <span className="empr-company-meta-item">
              <span className="material-symbols-outlined">groups</span>
              {profile.companySize} employees
            </span>
            <span className="empr-company-meta-item">
              <span className="material-symbols-outlined">location_on</span>
              {profile.location}
            </span>
            <span className="empr-company-meta-item">
              <span className="material-symbols-outlined">rocket_launch</span>
              {profile.fundingStage} · {profile.fundingRaised}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {!editing ? (
              <button className="btn btn-gold" style={{ fontSize: 13, padding: '8px 20px' }} onClick={() => setEditing(true)}>Edit Company</button>
            ) : (
              <button className="btn btn-gold" style={{ fontSize: 13, padding: '8px 20px' }} onClick={save}>Save</button>
            )}
            <button className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 20px' }} onClick={load}>Refresh</button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="dash-card">
        <h2 className="emp-section-title">About {profile.companyName}</h2>
        <div className="dash-card-body">
          {!editing ? (
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-on-surface)' }}>{profile.about}</p>
          ) : (
            <textarea
              className="glass-input"
              style={{ width: '100%', minHeight: 120 }}
              value={draftAbout}
              onChange={(e) => setDraftAbout(e.target.value)}
            />
          )}
        </div>
      </div>

      {/* Open Roles */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Open Positions</span>
          <span style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>{openRoles.length} active roles</span>
        </div>
        {openRoles.map((role) => (
          <div key={role.id} className="empr-req-card">
            <div className="empr-req-icon">
              <span className="material-symbols-outlined">work</span>
            </div>
            <div className="empr-req-info">
              <p className="empr-req-title">{role.title}</p>
              <div className="empr-req-meta">
                <span className="empr-req-meta-item">
                  <span className="material-symbols-outlined">apartment</span>
                  {role.department}
                </span>
                <span className="empr-req-meta-item">
                  <span className="material-symbols-outlined">location_on</span>
                  {role.location}
                </span>
              </div>
            </div>
            <span className="empr-req-stage-chip has-count">{role.candidatesInPipeline} candidates</span>
          </div>
        ))}
        {openRoles.length === 0 && (
          <p style={{ padding: 16, color: 'var(--color-on-surface-variant)' }}>No active requisitions yet.</p>
        )}
      </div>

      {/* Culture */}
      <div className="dash-card">
        <h2 className="emp-section-title">Culture & Benefits</h2>
        <div className="dash-card-body">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {profile.benefits.map(b => (
              <span key={b} className="emp-match-tag" style={{ padding: '6px 14px', fontSize: 13 }}>{b}</span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

