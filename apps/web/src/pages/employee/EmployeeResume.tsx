import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEmployeeProfile, patchEmployeeProfile, type EmployeeProfileApi } from '../../lib/employeeApi';
import { uploadEmployeeResumeFile } from '../../lib/resumeStorage';
import './Employee.css';

function buildProfileExportText(p: EmployeeProfileApi): string {
  const lines: string[] = [];
  lines.push(p.displayName);
  if (p.headline) lines.push(p.headline);
  if (p.location) lines.push(`Location: ${p.location}`);
  if (p.openToRelocation) lines.push('Open to relocation');
  lines.push('');
  if (p.about?.trim()) {
    lines.push('Professional summary', p.about.trim(), '');
  }
  if (p.skills?.length) {
    lines.push('Skills', p.skills.join(', '), '');
  }
  if (p.experience?.length) {
    lines.push('Experience');
    for (const x of p.experience) {
      lines.push(`- ${x.title} · ${x.company} (${x.years} yrs)`);
    }
    lines.push('');
  }
  if (p.education?.length) {
    lines.push('Education');
    for (const e of p.education) {
      const y = e.yearEnd != null ? ` (${e.yearEnd})` : '';
      lines.push(`- ${e.degree}, ${e.institution}${y}`);
    }
    lines.push('');
  }
  if (p.linkedinUrl) lines.push(`LinkedIn: ${p.linkedinUrl}`);
  if (p.portfolioUrl) lines.push(`Portfolio: ${p.portfolioUrl}`);
  lines.push('');
  lines.push('— Exported from HireMe Bharat profile');
  return lines.join('\n');
}

function downloadTextFile(filename: string, body: string) {
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function parseValidUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

export default function EmployeeResume() {
  const [profile, setProfile] = useState<EmployeeProfileApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [externalLabel, setExternalLabel] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getEmployeeProfile();
      setProfile(res.profile);
      setExternalUrl(res.profile.resumeUrl || '');
      setExternalLabel(res.profile.resumeFileName || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveResumeMeta = async (resumeUrl: string, resumeFileName: string) => {
    setBusy(true);
    setError('');
    try {
      await patchEmployeeProfile({ resumeUrl, resumeFileName });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save resume');
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { url } = await uploadEmployeeResumeFile(file);
      await patchEmployeeProfile({
        resumeUrl: url,
        resumeFileName: file.name,
      });
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(
        `${msg} If uploads are blocked, paste a public HTTPS link to your resume below (Google Drive, Dropbox, etc.), or ask your admin to enable Firebase Storage rules for path employee-resumes/{uid}/.`
      );
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    void onPickFile(f || null);
  };

  const saveExternalLink = async () => {
    const url = parseValidUrl(externalUrl);
    if (!url) {
      setError('Enter a valid https:// link to your resume.');
      return;
    }
    const name = externalLabel.trim() || 'Resume link';
    await saveResumeMeta(url, name);
  };

  const removeResume = async () => {
    if (!window.confirm('Remove the saved resume from your profile?')) return;
    setBusy(true);
    setError('');
    try {
      await patchEmployeeProfile({ resumeUrl: '', resumeFileName: '' });
      setExternalUrl('');
      setExternalLabel('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not remove resume');
    } finally {
      setBusy(false);
    }
  };

  const toggleRecruiterVisibility = async (resumeVisibleToRecruiters: boolean) => {
    setBusy(true);
    setError('');
    try {
      await patchEmployeeProfile({ resumeVisibleToRecruiters });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update visibility');
    } finally {
      setBusy(false);
    }
  };

  const exportProfile = () => {
    if (!profile) return;
    const safe = profile.displayName.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) || 'profile';
    downloadTextFile(`hireme-profile-${safe}.txt`, buildProfileExportText(profile));
  };

  if (loading) {
    return (
      <div className="dash-card dash-card-padded emp-resume-page">
        <p style={{ color: 'var(--color-on-surface-variant)' }}>Loading…</p>
      </div>
    );
  }

  const hasResume = Boolean(profile?.resumeUrl?.trim());
  const updated = profile?.resumeUpdatedAt ? new Date(profile.resumeUpdatedAt).toLocaleString() : null;

  return (
    <div className="emp-resume-page">
      <div className="dash-card dash-card-padded">
        <h2 className="dash-card-title">My Resume</h2>
        <p className="emp-resume-lead">
          Upload a PDF or Word file, or paste a link. Recruiters who view your public profile can download your resume when you allow it below.
        </p>
        <div className="emp-resume-actions-top">
          <Link to="/employee/profile" className="btn btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              person
            </span>
            Edit profile & experience
          </Link>
        </div>
        {error ? (
          <p className="emp-resume-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="dash-card dash-card-padded emp-resume-card">
        <h3 className="emp-resume-section-title">Current resume</h3>
        {!hasResume ? (
          <p style={{ color: 'var(--color-on-surface-variant)', marginTop: 8 }}>No resume on file yet.</p>
        ) : (
          <div className="emp-resume-current">
            <div>
              <p className="emp-resume-filename">{profile?.resumeFileName || 'Resume'}</p>
              {updated ? <p className="emp-resume-meta">Updated {updated}</p> : null}
            </div>
            <div className="emp-resume-current-actions">
              <a
                href={profile!.resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  open_in_new
                </span>
                Open / preview
              </a>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void removeResume()}>
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="dash-card dash-card-padded emp-resume-card">
        <h3 className="emp-resume-section-title">Upload file</h3>
        <p className="emp-resume-hint">PDF or Word · max 10 MB</p>
        <div
          className={`emp-resume-drop ${dragOver ? 'emp-resume-drop-active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <span className="material-symbols-outlined emp-resume-drop-icon">cloud_upload</span>
          <p>Drag and drop here, or</p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            Choose file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="emp-resume-file-input"
            onChange={(e) => void onPickFile(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <div className="dash-card dash-card-padded emp-resume-card">
        <h3 className="emp-resume-section-title">Or use a link</h3>
        <p className="emp-resume-hint">HTTPS URL to a hosted PDF or shared document (must be accessible to recruiters).</p>
        <label className="emp-resume-label" htmlFor="resume-link-url">
          Resume URL
        </label>
        <input
          id="resume-link-url"
          className="emp-resume-input"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          placeholder="https://…"
          disabled={busy}
        />
        <label className="emp-resume-label" htmlFor="resume-link-label">
          Label (optional)
        </label>
        <input
          id="resume-link-label"
          className="emp-resume-input"
          value={externalLabel}
          onChange={(e) => setExternalLabel(e.target.value)}
          placeholder="e.g. Resume — March 2026"
          disabled={busy}
        />
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void saveExternalLink()}>
          Save link
        </button>
      </div>

      <div className="dash-card dash-card-padded emp-resume-card">
        <h3 className="emp-resume-section-title">Recruiter visibility</h3>
        <p className="emp-resume-hint">
          When enabled, employers opening your public profile can download your resume. Your headline, skills, and experience are controlled from Profile.
        </p>
        <label className="emp-resume-toggle">
          <input
            type="checkbox"
            checked={Boolean(profile?.resumeVisibleToRecruiters)}
            disabled={busy || !hasResume}
            onChange={(e) => void toggleRecruiterVisibility(e.target.checked)}
          />
          <span>Show resume download on my public profile</span>
        </label>
        {!hasResume ? (
          <p className="emp-resume-muted">Add a resume file or link first.</p>
        ) : null}
      </div>

      <div className="dash-card dash-card-padded emp-resume-card">
        <h3 className="emp-resume-section-title">Export profile text</h3>
        <p className="emp-resume-hint">
          Download a plain-text summary built from your Profile (skills, experience, education, links). Use it for quick applications or proofreading.
        </p>
        <button type="button" className="btn btn-gold" disabled={!profile || busy} onClick={exportProfile}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            download
          </span>
          Download .txt summary
        </button>
      </div>
    </div>
  );
}
