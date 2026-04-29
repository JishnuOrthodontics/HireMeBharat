import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getEmployeeProfile,
  getEmployeeProfileStrength,
  patchEmployeeProfile,
  type EmployeeProfileApi,
} from '../../lib/employeeApi';

type Draft = {
  displayName: string;
  headline: string;
  about: string;
  location: string;
  openToRelocation: boolean;
  yearsExperience: number;
  skillsText: string;
  experience: Array<{ title: string; company: string; years: number }>;
  bannerUrl: string;
  photoURL: string;
  openToWork: boolean;
  openToWorkVisibility: 'RECRUITERS_ONLY' | 'PRIVATE';
  expectedCtc: string;
  expectedCurrency: string;
  noticePeriodDays: string;
};

function buildDraft(p: EmployeeProfileApi): Draft {
  return {
    displayName: p.displayName,
    headline: p.headline || '',
    about: p.about ?? '',
    location: p.location || '',
    openToRelocation: Boolean(p.openToRelocation),
    yearsExperience: Number(p.yearsExperience ?? 0),
    skillsText: (p.skills || []).join('\n'),
    experience:
      (p.experience || []).length > 0
        ? p.experience.map((e) => ({ ...e }))
        : [{ title: '', company: '', years: 0 }],
    bannerUrl: p.bannerUrl || '',
    photoURL: p.photoURL || '',
    openToWork: Boolean(p.openToWork),
    openToWorkVisibility: (p.openToWorkVisibility || 'RECRUITERS_ONLY') as 'RECRUITERS_ONLY' | 'PRIVATE',
    expectedCtc: String(p.expectedCtc ?? 0),
    expectedCurrency: p.expectedCurrency || 'USD',
    noticePeriodDays: String(p.noticePeriodDays ?? 30),
  };
}

function parseSkillsText(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected image'));
    reader.readAsDataURL(file);
  });
}

export default function EmployeeProfile() {
  const [profile, setProfile] = useState<EmployeeProfileApi | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileStrength, setProfileStrength] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const patchDraft = (next: Partial<Draft>) => {
    setDraft((prev) => (prev ? { ...prev, ...next } : prev));
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [res, strength] = await Promise.all([getEmployeeProfile(), getEmployeeProfileStrength()]);
      setProfile(res.profile);
      if (!editing) {
        setDraft(buildDraft(res.profile));
      }
      setProfileStrength(strength.profileStrength || 0);
      setSuggestions(strength.suggestions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const publicProfileUrl = useMemo(
    () => (profile ? `${window.location.origin}/employee/${profile.uid}` : ''),
    [profile]
  );

  const startEdit = () => {
    if (!profile) return;
    setDraft(buildDraft(profile));
    setEditing(true);
  };

  const save = async () => {
    if (!profile || !draft) return;
    setSaving(true);
    setError('');
    try {
      const exp = draft.experience
        .filter((e) => e.title.trim() && e.company.trim())
        .map((e) => ({
          title: e.title.trim(),
          company: e.company.trim(),
          years: Math.min(60, Math.max(0, Math.floor(Number(e.years) || 0))),
        }));
      await patchEmployeeProfile({
        displayName: draft.displayName.trim() || profile.displayName,
        headline: draft.headline.trim(),
        about: draft.about.trim(),
        location: draft.location.trim(),
        openToRelocation: draft.openToRelocation,
        yearsExperience: Math.min(60, Math.max(0, Math.floor(Number(draft.yearsExperience) || 0))),
        skills: parseSkillsText(draft.skillsText),
        experience: exp,
        bannerUrl: draft.bannerUrl.trim() || undefined,
        photoURL: draft.photoURL.trim() || undefined,
        openToWork: draft.openToWork,
        openToWorkVisibility: draft.openToWorkVisibility,
        expectedCtc: Number(draft.expectedCtc || 0),
        expectedCurrency: draft.expectedCurrency.trim().toUpperCase() || 'USD',
        noticePeriodDays: Number(draft.noticePeriodDays || 0),
      });
      setEditing(false);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const onPickLogo = async (file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      patchDraft({ photoURL: dataUrl });
    } catch (err: any) {
      setError(err.message || 'Unable to load profile image');
    }
  };

  const onPickBanner = async (file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      patchDraft({ bannerUrl: dataUrl });
    } catch (err: any) {
      setError(err.message || 'Unable to load banner image');
    }
  };

  const addExperienceRow = () => {
    setDraft((d) => (d ? { ...d, experience: [...d.experience, { title: '', company: '', years: 0 }] } : d));
  };

  const removeExperienceRow = (index: number) => {
    setDraft((d) => {
      if (!d) return d;
      const next = d.experience.filter((_, i) => i !== index);
      return { ...d, experience: next.length ? next : [{ title: '', company: '', years: 0 }] };
    });
  };

  if (loading) return <div className="dash-card"><p style={{ padding: 16 }}>Loading profile...</p></div>;
  if (error && !profile) return <div className="dash-card"><p style={{ padding: 16, color: 'var(--color-error)' }}>{error}</p></div>;
  if (!profile || !draft) return null;

  const display = editing ? draft : buildDraft(profile);
  const aboutDisplay = profile.about?.trim() ? profile.about : profile.headline;

  const initials = (editing ? draft.displayName : profile.displayName)
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const bannerStyle = display.bannerUrl
    ? {
        backgroundImage: `url(${display.bannerUrl})`,
      }
    : undefined;

  return (
    <>
      {error && (
        <div className="dash-card" style={{ marginBottom: 12 }}>
          <p style={{ padding: 16, color: 'var(--color-error)', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Profile Header */}
      <div className="dash-card">
        <div className="emp-profile-banner" style={bannerStyle}>
          {display.photoURL ? (
            <div className="emp-profile-avatar-lg">
              <img src={display.photoURL} alt="" />
            </div>
          ) : (
            <div className="emp-profile-avatar-lg">{initials || 'EM'}</div>
          )}
          {editing && (
            <>
              <button
                type="button"
                className="emp-edit-overlay-btn banner"
                onClick={() => bannerInputRef.current?.click()}
                title="Update banner image"
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
              <button
                type="button"
                className="emp-edit-overlay-btn logo"
                onClick={() => logoInputRef.current?.click()}
                title="Update profile photo"
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={(e) => onPickBanner(e.target.files?.[0])}
              />
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={(e) => onPickLogo(e.target.files?.[0])}
              />
            </>
          )}
        </div>
        <div className="emp-profile-info">
          {editing ? (
            <label style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Display name</span>
              <input
                className="glass-input"
                value={draft.displayName}
                onChange={(e) => patchDraft({ displayName: e.target.value })}
              />
            </label>
          ) : (
            <h1 className="emp-profile-name-lg">{profile.displayName}</h1>
          )}

          {editing ? (
            <label style={{ display: 'grid', gap: 6, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Professional headline</span>
              <input
                className="glass-input"
                value={draft.headline}
                onChange={(e) => patchDraft({ headline: e.target.value })}
                placeholder="e.g. Senior Engineer · Product & Platform"
              />
            </label>
          ) : (
            <p className="emp-profile-headline">{profile.headline || 'Add a professional headline.'}</p>
          )}

          {editing ? (
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Location</span>
                <input className="glass-input" value={draft.location} onChange={(e) => patchDraft({ location: e.target.value })} />
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={draft.openToRelocation}
                  onChange={(e) => patchDraft({ openToRelocation: e.target.checked })}
                />
                Open to relocation
              </label>
              <label style={{ display: 'grid', gap: 6, maxWidth: 160 }}>
                <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Total years experience</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  className="glass-input"
                  value={draft.yearsExperience}
                  onChange={(e) => patchDraft({ yearsExperience: Number(e.target.value) || 0 })}
                />
              </label>
            </div>
          ) : (
            <p className="emp-profile-location">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                location_on
              </span>
              {profile.location || 'Location not set'} {profile.openToRelocation ? '· Open to relocation' : ''}
              {typeof profile.yearsExperience === 'number' ? ` · ${profile.yearsExperience} yrs experience` : ''}
            </p>
          )}

          <div className="emp-profile-actions">
            {!editing ? (
              <button className="btn btn-primary" style={{ fontSize: 13, padding: '8px 20px' }} onClick={startEdit}>
                Edit Profile
              </button>
            ) : (
              <>
                <button className="btn btn-primary" style={{ fontSize: 13, padding: '8px 20px' }} onClick={save} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: 13, padding: '8px 20px' }}
                  disabled={saving}
                  onClick={() => {
                    setEditing(false);
                    setDraft(buildDraft(profile));
                    setError('');
                  }}
                >
                  Cancel
                </button>
              </>
            )}
            <button className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 20px' }} onClick={load} disabled={saving}>
              Refresh
            </button>
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
              style={{ width: '100%', minHeight: 140 }}
              placeholder="Tell recruiters about your background, strengths, and goals..."
              value={draft.about}
              onChange={(e) => patchDraft({ about: e.target.value })}
            />
          ) : (
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-on-surface)' }}>
              {aboutDisplay || 'No summary yet. Click Edit Profile to add your story.'}
            </p>
          )}
        </div>
      </div>

      <div className="dash-card">
        <h2 className="emp-section-title">Profile Strength</h2>
        <div className="dash-card-body" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>{profileStrength}% complete</strong>
            <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 12 }}>Improve visibility with suggestions</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ width: `${profileStrength}%`, height: '100%', background: 'linear-gradient(90deg,#50fa7b,#d4af37)' }} />
          </div>
          {suggestions.length > 0 && (
            <ul style={{ marginTop: 12, paddingLeft: 18, color: 'var(--color-on-surface-variant)' }}>
              {suggestions.slice(0, 4).map((item) => (
                <li key={item} style={{ marginBottom: 6 }}>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="dash-card">
        <h2 className="emp-section-title">Visibility & Availability</h2>
        <div className="dash-card-body" style={{ padding: 16, display: 'grid', gap: 12 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={draft.openToWork}
              disabled={!editing}
              onChange={(e) => patchDraft({ openToWork: e.target.checked })}
            />
            Open to work
          </label>
          <label style={{ display: 'grid', gap: 4, maxWidth: 300 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Open-to-work visibility</span>
            <select
              className="glass-input"
              disabled={!editing}
              value={draft.openToWorkVisibility}
              onChange={(e) => patchDraft({ openToWorkVisibility: e.target.value as 'RECRUITERS_ONLY' | 'PRIVATE' })}
            >
              <option value="RECRUITERS_ONLY">Recruiters only</option>
              <option value="PRIVATE">Private</option>
            </select>
          </label>
          <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
            Shareable profile URL (employers/admins): {publicProfileUrl}
          </div>
        </div>
      </div>

      <div className="dash-card">
        <h2 className="emp-section-title">Salary Expectations</h2>
        <div
          className="dash-card-body"
          style={{ padding: 16, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
        >
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Expected CTC</span>
            <input
              className="glass-input"
              disabled={!editing}
              value={draft.expectedCtc}
              onChange={(e) => patchDraft({ expectedCtc: e.target.value })}
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Currency</span>
            <input
              className="glass-input"
              disabled={!editing}
              value={draft.expectedCurrency}
              onChange={(e) => patchDraft({ expectedCurrency: e.target.value })}
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Notice period (days)</span>
            <input
              className="glass-input"
              disabled={!editing}
              value={draft.noticePeriodDays}
              onChange={(e) => patchDraft({ noticePeriodDays: e.target.value })}
            />
          </label>
        </div>
      </div>

      {/* Experience */}
      <div className="dash-card">
        <h2 className="emp-section-title">Experience</h2>
        {editing ? (
          <div style={{ padding: '8px 16px 16px', display: 'grid', gap: 12 }}>
            {draft.experience.map((exp, i) => (
              <div
                key={i}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  paddingBottom: 12,
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Title</span>
                    <input
                      className="glass-input"
                      value={exp.title}
                      onChange={(e) => {
                        const next = [...draft.experience];
                        next[i] = { ...next[i], title: e.target.value };
                        patchDraft({ experience: next });
                      }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Company</span>
                    <input
                      className="glass-input"
                      value={exp.company}
                      onChange={(e) => {
                        const next = [...draft.experience];
                        next[i] = { ...next[i], company: e.target.value };
                        patchDraft({ experience: next });
                      }}
                    />
                  </label>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
                  <label style={{ display: 'grid', gap: 4, width: 100 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Years</span>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      className="glass-input"
                      value={exp.years}
                      onChange={(e) => {
                        const next = [...draft.experience];
                        next[i] = { ...next[i], years: Number(e.target.value) || 0 };
                        patchDraft({ experience: next });
                      }}
                    />
                  </label>
                  <button type="button" className="btn btn-ghost" style={{ padding: '8px 12px' }} onClick={() => removeExperienceRow(i)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-ghost" onClick={addExperienceRow} style={{ justifySelf: 'start' }}>
              + Add experience
            </button>
          </div>
        ) : (
          <>
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
              <p style={{ padding: '0 16px 16px', color: 'var(--color-on-surface-variant)' }}>No experience added yet.</p>
            )}
          </>
        )}
      </div>

      {/* Skills */}
      <div className="dash-card">
        <h2 className="emp-section-title">Skills & Expertise</h2>
        {editing ? (
          <div style={{ padding: '8px 16px 16px' }}>
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>One skill per line (or comma-separated)</span>
              <textarea
                className="glass-input"
                style={{ width: '100%', minHeight: 120 }}
                value={draft.skillsText}
                onChange={(e) => patchDraft({ skillsText: e.target.value })}
              />
            </label>
          </div>
        ) : (
          <div className="emp-skills-grid">
            {(profile.skills || []).map((skill) => (
              <span key={skill} className="emp-skill-chip">
                {skill}
              </span>
            ))}
            {(profile.skills || []).length === 0 && (
              <p style={{ color: 'var(--color-on-surface-variant)' }}>No skills added yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Education */}
      <div className="dash-card">
        <h2 className="emp-section-title">Education</h2>
        <p style={{ color: 'var(--color-on-surface-variant)' }}>Education can be added in a later profile version.</p>
      </div>
    </>
  );
}
