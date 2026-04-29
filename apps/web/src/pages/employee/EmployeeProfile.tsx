import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  getEmployeeProfile,
  getEmployeeProfileStrength,
  patchEmployeeProfile,
  type EmployeeProfileApi,
} from '../../lib/employeeApi';

type ExpRow = { title: string; company: string; years: number };
type EduRow = { degree: string; institution: string; yearEnd: string };

type Draft = {
  displayName: string;
  headline: string;
  about: string;
  location: string;
  openToRelocation: boolean;
  yearsExperience: number;
  skillsText: string;
  experience: ExpRow[];
  education: EduRow[];
  bannerUrl: string;
  photoURL: string;
  openToWork: boolean;
  openToWorkVisibility: 'RECRUITERS_ONLY' | 'PRIVATE';
  expectedCtc: string;
  expectedCurrency: string;
  noticePeriodDays: string;
  compensationCurrent: string;
  linkedinUrl: string;
  portfolioUrl: string;
};

function buildDraft(p: EmployeeProfileApi): Draft {
  const edu = p.education || [];
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
    education:
      edu.length > 0
        ? edu.map((e) => ({
            degree: e.degree || '',
            institution: e.institution || '',
            yearEnd: e.yearEnd != null ? String(e.yearEnd) : '',
          }))
        : [{ degree: '', institution: '', yearEnd: '' }],
    bannerUrl: p.bannerUrl || '',
    photoURL: p.photoURL || '',
    openToWork: Boolean(p.openToWork),
    openToWorkVisibility: (p.openToWorkVisibility || 'RECRUITERS_ONLY') as 'RECRUITERS_ONLY' | 'PRIVATE',
    expectedCtc: String(p.expectedCtc ?? 0),
    expectedCurrency: p.expectedCurrency || 'USD',
    noticePeriodDays: String(p.noticePeriodDays ?? 30),
    compensationCurrent: String(p.compensation?.current ?? 0),
    linkedinUrl: p.linkedinUrl || '',
    portfolioUrl: p.portfolioUrl || '',
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
      const education = draft.education
        .filter((e) => e.degree.trim() && e.institution.trim())
        .map((e) => {
          const ye = e.yearEnd.trim();
          const y = ye ? parseInt(ye, 10) : NaN;
          const row: { degree: string; institution: string; yearEnd?: number } = {
            degree: e.degree.trim(),
            institution: e.institution.trim(),
          };
          if (!Number.isNaN(y) && y >= 1950 && y <= 2035) row.yearEnd = y;
          return row;
        });

      const currency = draft.expectedCurrency.trim().toUpperCase() || 'USD';
      const expected = Number(draft.expectedCtc || 0);
      await patchEmployeeProfile({
        displayName: draft.displayName.trim() || profile.displayName,
        headline: draft.headline.trim(),
        about: draft.about.trim(),
        location: draft.location.trim(),
        openToRelocation: draft.openToRelocation,
        yearsExperience: Math.min(60, Math.max(0, Math.floor(Number(draft.yearsExperience) || 0))),
        skills: parseSkillsText(draft.skillsText),
        experience: exp,
        education,
        bannerUrl: draft.bannerUrl.trim() || undefined,
        photoURL: draft.photoURL.trim() || undefined,
        openToWork: draft.openToWork,
        openToWorkVisibility: draft.openToWorkVisibility,
        expectedCtc: expected,
        expectedCurrency: currency,
        noticePeriodDays: Number(draft.noticePeriodDays || 0),
        compensation: {
          current: Number(draft.compensationCurrent || 0),
          expected,
          currency,
        },
        linkedinUrl: draft.linkedinUrl.trim() || undefined,
        portfolioUrl: draft.portfolioUrl.trim() || undefined,
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

  const addEducationRow = () => {
    setDraft((d) => (d ? { ...d, education: [...d.education, { degree: '', institution: '', yearEnd: '' }] } : d));
  };

  const removeEducationRow = (index: number) => {
    setDraft((d) => {
      if (!d) return d;
      const next = d.education.filter((_, i) => i !== index);
      return { ...d, education: next.length ? next : [{ degree: '', institution: '', yearEnd: '' }] };
    });
  };

  if (loading) return <div className="dash-card"><p style={{ padding: 16 }}>Loading profile...</p></div>;
  if (error && !profile) return <div className="dash-card"><p style={{ padding: 16, color: 'var(--color-error)' }}>{error}</p></div>;
  if (!profile || !draft) return null;

  const display = editing ? draft : buildDraft(profile);
  const aboutDisplay = profile.about?.trim()
    ? profile.about
    : profile.headline
      ? profile.headline
      : '';

  const initials = (editing ? draft.displayName : profile.displayName)
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const bannerStyle = display.bannerUrl ? { backgroundImage: `url(${display.bannerUrl})` } : undefined;

  const field = (label: string, children: ReactNode) => (
    <label className="emp-form-field">
      <span>{label}</span>
      {children}
    </label>
  );

  return (
    <>
      {error && (
        <div className="dash-card" style={{ marginBottom: 12 }}>
          <p style={{ padding: 16, color: 'var(--color-error)', margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="dash-card" style={{ padding: '16px 20px' }}>
        <h1 style={{ fontSize: 22, fontFamily: 'var(--font-display)', margin: 0 }}>Job seeker profile</h1>
        <p className="emp-profile-section-hint" style={{ marginBottom: 0 }}>
          Add the details recruiters and our matching engine use: headline, skills, experience, salary band, and availability—not company-style fields.
        </p>
      </div>

      <div className="dash-card">
        <h2 className="emp-section-title">Profile strength</h2>
        <div className="dash-card-body" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>{profileStrength}% complete</strong>
            <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 12 }}>Stronger profiles get better matches</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ width: `${profileStrength}%`, height: '100%', background: 'linear-gradient(90deg,#50fa7b,#d4af37)' }} />
          </div>
          {suggestions.length > 0 && (
            <ul style={{ marginTop: 12, paddingLeft: 18, color: 'var(--color-on-surface-variant)' }}>
              {suggestions.slice(0, 5).map((item) => (
                <li key={item} style={{ marginBottom: 6 }}>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Banner & photo */}
      <div className="dash-card">
        <h2 className="emp-section-title">Photo & banner</h2>
        <p className="emp-profile-section-hint" style={{ padding: '0 16px' }}>
          Optional cover image and profile photo—shown on your profile when recruiters view your profile.
        </p>
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
                title="Change banner"
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
              <button
                type="button"
                className="emp-edit-overlay-btn logo"
                onClick={() => logoInputRef.current?.click()}
                title="Change profile photo"
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
          {!editing ? (
            <>
              <h1 className="emp-profile-name-lg">{profile.displayName}</h1>
              <p className="emp-profile-headline">{profile.headline || 'Add a professional headline.'}</p>
              <p className="emp-profile-location">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
                {profile.location || 'Location not set'}
                {profile.openToRelocation ? ' · Open to relocation' : ''}
                {typeof profile.yearsExperience === 'number' ? ` · ${profile.yearsExperience} yrs experience` : ''}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>
              Edit your headline, summary, and job-search fields in the sections below, then save.
            </p>
          )}
          <div className="emp-profile-actions">
            {!editing ? (
              <button className="btn btn-primary" style={{ fontSize: 13, padding: '8px 20px' }} onClick={startEdit}>
                Edit profile
              </button>
            ) : (
              <>
                <button className="btn btn-gold" style={{ fontSize: 13, padding: '8px 20px' }} onClick={save} disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
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
            <button className="btn btn-ghost" style={{ fontSize: 13, padding: '8px 20px' }} onClick={load} disabled={saving}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Core job-search identity */}
      <div className="dash-card">
        <h2 className="emp-section-title">Core information</h2>
        <p className="emp-profile-section-hint" style={{ padding: '0 16px' }}>
          Name and headline are used in search results and recruiter views.
        </p>
        <div style={{ padding: '8px 16px 16px' }}>
          {editing ? (
            <div className="emp-form-grid">
              {field(
                'Full name',
                <input className="glass-input" value={draft.displayName} onChange={(e) => patchDraft({ displayName: e.target.value })} />
              )}
              {field(
                'Professional headline',
                <input
                  className="glass-input"
                  value={draft.headline}
                  onChange={(e) => patchDraft({ headline: e.target.value })}
                  placeholder="e.g. Senior Full Stack Engineer · React / Node"
                />
              )}
              {field(
                'City / region',
                <input className="glass-input" value={draft.location} onChange={(e) => patchDraft({ location: e.target.value })} />
              )}
              {field(
                'Total years of experience',
                <input
                  type="number"
                  min={0}
                  max={60}
                  className="glass-input"
                  value={draft.yearsExperience}
                  onChange={(e) => patchDraft({ yearsExperience: Number(e.target.value) || 0 })}
                />
              )}
            </div>
          ) : (
            <div className="emp-form-grid">
              <div className="emp-form-field">
                <span>Full name</span>
                <span style={{ fontSize: 15 }}>{profile.displayName}</span>
              </div>
              <div className="emp-form-field">
                <span>Professional headline</span>
                <span style={{ fontSize: 15 }}>{profile.headline || '—'}</span>
              </div>
              <div className="emp-form-field">
                <span>City / region</span>
                <span style={{ fontSize: 15 }}>{profile.location || '—'}</span>
              </div>
              <div className="emp-form-field">
                <span>Total years of experience</span>
                <span style={{ fontSize: 15 }}>{profile.yearsExperience ?? 0}</span>
              </div>
            </div>
          )}
          {editing ? (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
              <input
                type="checkbox"
                checked={draft.openToRelocation}
                onChange={(e) => patchDraft({ openToRelocation: e.target.checked })}
              />
              <span>Willing to relocate for the right role</span>
            </label>
          ) : (
            <p style={{ fontSize: 13, marginTop: 12, color: 'var(--color-on-surface-variant)' }}>
              Relocation: {profile.openToRelocation ? 'Yes, open to relocation' : 'Not indicated'}
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="dash-card">
        <h2 className="emp-section-title">Professional summary</h2>
        <p className="emp-profile-section-hint" style={{ padding: '0 16px' }}>
          A short story about your impact, domains, and what you want next—separate from your one-line headline.
        </p>
        <div className="dash-card-body">
          {editing ? (
            <textarea
              className="glass-input"
              style={{ width: '100%', minHeight: 140 }}
              placeholder="Summarize your background, strengths, and what you're looking for in your next role..."
              value={draft.about}
              onChange={(e) => patchDraft({ about: e.target.value })}
            />
          ) : (
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-on-surface)' }}>
              {aboutDisplay || 'No summary yet. Tell recruiters what you bring and what role you want.'}
            </p>
          )}
        </div>
      </div>

      {/* Compensation */}
      <div className="dash-card">
        <h2 className="emp-section-title">Salary & notice</h2>
        <p className="emp-profile-section-hint" style={{ padding: '0 16px' }}>
          Used to soft-filter roles that don’t fit your band and to set recruiter expectations (currency applies to all amounts below).
        </p>
        <div style={{ padding: '8px 16px 16px' }}>
          <div className="emp-form-grid">
            {editing ? (
              <>
                {field(
                  'Current annual compensation (optional)',
                  <input
                    className="glass-input"
                    inputMode="decimal"
                    value={draft.compensationCurrent}
                    onChange={(e) => patchDraft({ compensationCurrent: e.target.value })}
                    placeholder="0"
                  />
                )}
                {field(
                  'Expected annual (CTC)',
                  <input
                    className="glass-input"
                    inputMode="decimal"
                    value={draft.expectedCtc}
                    onChange={(e) => patchDraft({ expectedCtc: e.target.value })}
                  />
                )}
                {field(
                  'Currency',
                  <input
                    className="glass-input"
                    value={draft.expectedCurrency}
                    onChange={(e) => patchDraft({ expectedCurrency: e.target.value })}
                    placeholder="INR / USD"
                  />
                )}
                {field(
                  'Notice period (days)',
                  <input
                    className="glass-input"
                    inputMode="numeric"
                    value={draft.noticePeriodDays}
                    onChange={(e) => patchDraft({ noticePeriodDays: e.target.value })}
                  />
                )}
              </>
            ) : (
              <>
                <div className="emp-form-field">
                  <span>Current annual (optional)</span>
                  <span>
                    {profile.compensation?.current != null && profile.compensation.current > 0
                      ? `${profile.compensation.current} ${profile.compensation.currency || profile.expectedCurrency || 'USD'}`
                      : '—'}
                  </span>
                </div>
                <div className="emp-form-field">
                  <span>Expected CTC</span>
                  <span>
                    {(profile.expectedCtc ?? 0) > 0
                      ? `${profile.expectedCtc} ${profile.expectedCurrency || 'USD'}`
                      : '—'}
                  </span>
                </div>
                <div className="emp-form-field">
                  <span>Notice period</span>
                  <span>{profile.noticePeriodDays != null ? `${profile.noticePeriodDays} days` : '—'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Work history */}
      <div className="dash-card">
        <h2 className="emp-section-title">Work history</h2>
        <p className="emp-profile-section-hint" style={{ padding: '0 16px' }}>
          Roles you’ve held—title, employer, and approximate duration in years.
        </p>
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
                  <label className="emp-form-field">
                    <span>Job title</span>
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
                  <label className="emp-form-field">
                    <span>Company</span>
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
                  <label className="emp-form-field" style={{ width: 100 }}>
                    <span>Years</span>
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
              + Add role
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
              <p style={{ padding: '0 16px 16px', color: 'var(--color-on-surface-variant)' }}>No roles added yet.</p>
            )}
          </>
        )}
      </div>

      {/* Education */}
      <div className="dash-card">
        <h2 className="emp-section-title">Education</h2>
        <p className="emp-profile-section-hint" style={{ padding: '0 16px' }}>
          Degree, school, and graduation year help credibility and some recruiter filters.
        </p>
        {editing ? (
          <div style={{ padding: '8px 16px 16px', display: 'grid', gap: 12 }}>
            {draft.education.map((row, i) => (
              <div
                key={i}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  paddingBottom: 12,
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div className="emp-form-grid">
                  <label className="emp-form-field">
                    <span>Degree / qualification</span>
                    <input
                      className="glass-input"
                      value={row.degree}
                      onChange={(e) => {
                        const next = [...draft.education];
                        next[i] = { ...next[i], degree: e.target.value };
                        patchDraft({ education: next });
                      }}
                      placeholder="e.g. B.Tech Computer Science"
                    />
                  </label>
                  <label className="emp-form-field">
                    <span>Institution</span>
                    <input
                      className="glass-input"
                      value={row.institution}
                      onChange={(e) => {
                        const next = [...draft.education];
                        next[i] = { ...next[i], institution: e.target.value };
                        patchDraft({ education: next });
                      }}
                    />
                  </label>
                  <label className="emp-form-field">
                    <span>Year completed (optional)</span>
                    <input
                      className="glass-input"
                      inputMode="numeric"
                      value={row.yearEnd}
                      onChange={(e) => {
                        const next = [...draft.education];
                        next[i] = { ...next[i], yearEnd: e.target.value };
                        patchDraft({ education: next });
                      }}
                      placeholder="2024"
                    />
                  </label>
                </div>
                <button type="button" className="btn btn-ghost" style={{ justifySelf: 'start' }} onClick={() => removeEducationRow(i)}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost" onClick={addEducationRow} style={{ justifySelf: 'start' }}>
              + Add education
            </button>
          </div>
        ) : (
          <div style={{ padding: '0 16px 16px' }}>
            {(profile.education || []).length > 0 ? (
              (profile.education || []).map((ed, i) => (
                <div key={i} className="emp-exp-item">
                  <div className="emp-exp-logo">🎓</div>
                  <div>
                    <p className="emp-exp-title">{ed.degree}</p>
                    <p className="emp-exp-company">{ed.institution}</p>
                    {ed.yearEnd != null ? <p className="emp-exp-dates">{ed.yearEnd}</p> : null}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--color-on-surface-variant)' }}>No education added yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="dash-card">
        <h2 className="emp-section-title">Skills & keywords</h2>
        <p className="emp-profile-section-hint" style={{ padding: '0 16px' }}>
          Technical and soft skills used for matching and recruiter search—one per line or comma-separated.
        </p>
        {editing ? (
          <div style={{ padding: '8px 16px 16px' }}>
            <textarea
              className="glass-input"
              style={{ width: '100%', minHeight: 120 }}
              value={draft.skillsText}
              onChange={(e) => patchDraft({ skillsText: e.target.value })}
            />
          </div>
        ) : (
          <div className="emp-skills-grid">
            {(profile.skills || []).map((skill) => (
              <span key={skill} className="emp-skill-chip">
                {skill}
              </span>
            ))}
            {(profile.skills || []).length === 0 && (
              <p style={{ color: 'var(--color-on-surface-variant)' }}>No skills listed.</p>
            )}
          </div>
        )}
      </div>

      {/* Links */}
      <div className="dash-card">
        <h2 className="emp-section-title">Online presence</h2>
        <p className="emp-profile-section-hint" style={{ padding: '0 16px' }}>
          LinkedIn and portfolio or personal site—optional but recommended.
        </p>
        <div style={{ padding: '8px 16px 16px' }}>
          <div className="emp-form-grid">
            {editing ? (
              <>
                {field(
                  'LinkedIn profile URL',
                  <input
                    className="glass-input"
                    type="url"
                    value={draft.linkedinUrl}
                    onChange={(e) => patchDraft({ linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                  />
                )}
                {field(
                  'Portfolio or website',
                  <input
                    className="glass-input"
                    type="url"
                    value={draft.portfolioUrl}
                    onChange={(e) => patchDraft({ portfolioUrl: e.target.value })}
                    placeholder="https://"
                  />
                )}
              </>
            ) : (
              <>
                <div className="emp-form-field">
                  <span>LinkedIn</span>
                  {profile.linkedinUrl ? (
                    <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-container)' }}>
                      {profile.linkedinUrl}
                    </a>
                  ) : (
                    <span>—</span>
                  )}
                </div>
                <div className="emp-form-field">
                  <span>Portfolio / website</span>
                  {profile.portfolioUrl ? (
                    <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-container)' }}>
                      {profile.portfolioUrl}
                    </a>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Visibility */}
      <div className="dash-card">
        <h2 className="emp-section-title">Job search visibility</h2>
        <p className="emp-profile-section-hint" style={{ padding: '0 16px' }}>
          Control whether recruiters see that you’re open to work. Link is only for employer and admin accounts.
        </p>
        <div className="dash-card-body" style={{ padding: 16, display: 'grid', gap: 12 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={draft.openToWork}
              disabled={!editing}
              onChange={(e) => patchDraft({ openToWork: e.target.checked })}
            />
            Open to new opportunities
          </label>
          <label style={{ display: 'grid', gap: 4, maxWidth: 320 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Who can see open-to-work</span>
            <select
              className="glass-input"
              disabled={!editing}
              value={draft.openToWorkVisibility}
              onChange={(e) => patchDraft({ openToWorkVisibility: e.target.value as 'RECRUITERS_ONLY' | 'PRIVATE' })}
            >
              <option value="RECRUITERS_ONLY">Recruiters on HireMeBharat only</option>
              <option value="PRIVATE">Hidden (private)</option>
            </select>
          </label>
          <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
            Recruiter profile link: <span style={{ wordBreak: 'break-all' }}>{publicProfileUrl}</span>
          </div>
        </div>
      </div>
    </>
  );
}
