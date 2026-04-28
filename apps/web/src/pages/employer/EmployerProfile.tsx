import { useEffect, useRef, useState } from 'react';
import { getEmployerProfile, getEmployerRequisitions, patchEmployerProfile, type EmployerProfileApi, type EmployerRequisitionApi } from '../../lib/employerApi';

function toBenefits(text: string) {
  return text
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
}

function fromBenefits(benefits: string[]) {
  return benefits.join('\n');
}

export default function EmployerProfile() {
  const [profile, setProfile] = useState<EmployerProfileApi | null>(null);
  const [openRoles, setOpenRoles] = useState<EmployerRequisitionApi[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EmployerProfileApi | null>(null);
  const [benefitsText, setBenefitsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, reqRes] = await Promise.all([
        getEmployerProfile(),
        getEmployerRequisitions({ status: 'ACTIVE', limit: 10 }),
      ]);
      setProfile(profileRes.profile);
      setDraft(profileRes.profile);
      setBenefitsText(fromBenefits(profileRes.profile.benefits || []));
      setOpenRoles(reqRes.requisitions);
    } catch (err: any) {
      setError(err.message || 'Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const patch = (next: Partial<EmployerProfileApi>) => {
    setDraft((prev) => (prev ? { ...prev, ...next } : prev));
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError('');
    setOk('');
    try {
      await patchEmployerProfile({
        companyName: draft.companyName.trim(),
        tagline: draft.tagline.trim(),
        logoUrl: draft.logoUrl.trim(),
        bannerUrl: draft.bannerUrl.trim(),
        websiteUrl: draft.websiteUrl.trim(),
        linkedinUrl: draft.linkedinUrl.trim(),
        industry: draft.industry.trim(),
        companySize: Number(draft.companySize || 0),
        foundedYear: Number(draft.foundedYear || 0),
        location: draft.location.trim(),
        fundingStage: draft.fundingStage.trim(),
        fundingRaised: draft.fundingRaised.trim(),
        showProfileToEmployees: Boolean(draft.showProfileToEmployees),
        about: draft.about.trim(),
        benefits: toBenefits(benefitsText),
      });
      setOk('Profile updated successfully.');
      setEditing(false);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read selected image'));
      reader.readAsDataURL(file);
    });

  const onPickLogoFile = async (file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      patch({ logoUrl: dataUrl });
    } catch (err: any) {
      setError(err.message || 'Unable to load logo image');
    }
  };

  const onPickBannerFile = async (file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      patch({ bannerUrl: dataUrl });
    } catch (err: any) {
      setError(err.message || 'Unable to load banner image');
    }
  };

  if (loading) return <div className="dash-card"><p style={{ padding: 16 }}>Loading company profile...</p></div>;
  if (error) return <div className="dash-card"><p style={{ padding: 16, color: 'var(--color-error)' }}>{error}</p></div>;
  if (!profile || !draft) return null;

  const initials = (draft.companyName || profile.companyName).split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'CO';

  return (
    <>
      {/* Company Header */}
      <div className="dash-card">
        <div
          className="empr-profile-banner"
          style={draft.bannerUrl ? { backgroundImage: `url(${draft.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          {draft.logoUrl ? (
            <img
              src={draft.logoUrl}
              alt={draft.companyName}
              className="empr-profile-logo"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className="empr-profile-logo">{initials}</div>
          )}
          {editing && (
            <>
              <button
                type="button"
                className="empr-edit-overlay-btn banner"
                onClick={() => bannerInputRef.current?.click()}
                title="Update banner image"
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
              <button
                type="button"
                className="empr-edit-overlay-btn logo"
                onClick={() => logoInputRef.current?.click()}
                title="Update profile logo"
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={(e) => onPickBannerFile(e.target.files?.[0])}
              />
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={(e) => onPickLogoFile(e.target.files?.[0])}
              />
            </>
          )}
        </div>
        <div className="empr-profile-info">
          <h1 className="empr-company-name">{profile.companyName}</h1>
          <p className="empr-company-tagline">{profile.tagline}</p>
          <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 8 }}>Company profile visible to employees and candidates.</p>
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
              <span className="material-symbols-outlined">history</span>
              Founded {profile.foundedYear}
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
            <button className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 20px' }} onClick={load}>Refresh</button>
            {!editing ? (
              <button className="btn btn-gold" style={{ fontSize: 13, padding: '8px 20px' }} onClick={() => setEditing(true)}>Edit Profile</button>
            ) : (
              <>
                <button className="btn btn-gold" style={{ fontSize: 13, padding: '8px 20px' }} onClick={save} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 13, padding: '8px 20px' }}
                  onClick={() => {
                    setEditing(false);
                    setDraft(profile);
                    setBenefitsText(fromBenefits(profile.benefits || []));
                    setError('');
                    setOk('');
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            {profile.websiteUrl && (
              <a href={profile.websiteUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                Website
              </a>
            )}
            {profile.linkedinUrl && (
              <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>

      {ok && <div className="dash-card"><p style={{ padding: 12, color: 'var(--color-primary-container)' }}>{ok}</p></div>}

      {editing && (
        <div className="dash-card dash-card-padded">
          <h2 className="dash-card-title" style={{ marginBottom: 12 }}>Edit Company Profile</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Company Name</span>
              <input className="glass-input" value={draft.companyName} onChange={(e) => patch({ companyName: e.target.value })} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Tagline</span>
              <input className="glass-input" value={draft.tagline} onChange={(e) => patch({ tagline: e.target.value })} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Logo URL</span>
              <input className="glass-input" value={draft.logoUrl} onChange={(e) => patch({ logoUrl: e.target.value })} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Banner URL</span>
              <input className="glass-input" value={draft.bannerUrl} onChange={(e) => patch({ bannerUrl: e.target.value })} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Website URL</span>
              <input className="glass-input" value={draft.websiteUrl} onChange={(e) => patch({ websiteUrl: e.target.value })} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>LinkedIn URL</span>
              <input className="glass-input" value={draft.linkedinUrl} onChange={(e) => patch({ linkedinUrl: e.target.value })} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Industry</span>
              <input className="glass-input" value={draft.industry} onChange={(e) => patch({ industry: e.target.value })} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Company Size</span>
              <input className="glass-input" inputMode="numeric" value={String(draft.companySize || '')} onChange={(e) => patch({ companySize: Number(e.target.value || 0) })} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Founded Year</span>
              <input className="glass-input" inputMode="numeric" value={String(draft.foundedYear || '')} onChange={(e) => patch({ foundedYear: Number(e.target.value || 0) })} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Location</span>
              <input className="glass-input" value={draft.location} onChange={(e) => patch({ location: e.target.value })} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Funding Stage</span>
              <input className="glass-input" value={draft.fundingStage} onChange={(e) => patch({ fundingStage: e.target.value })} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Funding Raised</span>
              <input className="glass-input" value={draft.fundingRaised} onChange={(e) => patch({ fundingRaised: e.target.value })} />
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>About</span>
            <textarea className="glass-input" style={{ minHeight: 110 }} value={draft.about} onChange={(e) => patch({ about: e.target.value })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Benefits (one per line)</span>
            <textarea className="glass-input" style={{ minHeight: 90 }} value={benefitsText} onChange={(e) => setBenefitsText(e.target.value)} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <input
              type="checkbox"
              checked={Boolean(draft.showProfileToEmployees)}
              onChange={(e) => patch({ showProfileToEmployees: e.target.checked })}
            />
            <span style={{ fontSize: 13, color: 'var(--color-on-surface)' }}>
              Show this company profile to employees and candidates
            </span>
          </label>
        </div>
      )}

      {/* About */}
      <div className="dash-card">
        <h2 className="emp-section-title">About {profile.companyName}</h2>
        <div className="dash-card-body">
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-on-surface)' }}>{profile.about}</p>
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

