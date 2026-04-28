import { useEffect, useMemo, useState } from 'react';
import { getEmployerProfile, patchEmployerProfile, type EmployerProfileApi } from '../../lib/employerApi';

type FormState = EmployerProfileApi;

function toBenefits(text: string) {
  return text
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
}

function fromBenefits(benefits: string[]) {
  return benefits.join('\n');
}

export default function EmployerSettings() {
  const [form, setForm] = useState<FormState | null>(null);
  const [benefitsText, setBenefitsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const initials = useMemo(() => {
    if (!form?.companyName) return 'CO';
    return form.companyName
      .split(' ')
      .map((x) => x[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [form?.companyName]);

  const load = async () => {
    setLoading(true);
    setError('');
    setOk('');
    try {
      const res = await getEmployerProfile();
      setForm(res.profile);
      setBenefitsText(fromBenefits(res.profile.benefits || []));
    } catch (err: any) {
      setError(err.message || 'Unable to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const patch = (next: Partial<FormState>) => {
    setForm((prev) => (prev ? { ...prev, ...next } : prev));
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError('');
    setOk('');
    try {
      await patchEmployerProfile({
        companyName: form.companyName.trim(),
        tagline: form.tagline.trim(),
        logoUrl: form.logoUrl.trim(),
        bannerUrl: form.bannerUrl.trim(),
        websiteUrl: form.websiteUrl.trim(),
        linkedinUrl: form.linkedinUrl.trim(),
        industry: form.industry.trim(),
        companySize: Number(form.companySize || 0),
        foundedYear: Number(form.foundedYear || 0),
        location: form.location.trim(),
        fundingStage: form.fundingStage.trim(),
        fundingRaised: form.fundingRaised.trim(),
        showProfileToEmployees: Boolean(form.showProfileToEmployees),
        about: form.about.trim(),
        benefits: toBenefits(benefitsText),
      });
      setOk('Company settings saved.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="dash-card"><p style={{ padding: 16 }}>Loading company settings...</p></div>;
  if (error && !form) return <div className="dash-card"><p style={{ padding: 16, color: 'var(--color-error)' }}>{error}</p></div>;
  if (!form) return null;

  return (
    <>
      <div className="dash-card dash-card-padded" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {form.logoUrl ? (
            <img
              src={form.logoUrl}
              alt={form.companyName}
              style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }}
            />
          ) : (
            <div className="dash-profile-card-avatar" style={{ width: 64, height: 64, fontSize: 20 }}>{initials}</div>
          )}
          <div style={{ flex: 1 }}>
            <h2 className="dash-card-title" style={{ marginBottom: 4 }}>Company Settings</h2>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>
              Configure how your company profile appears to employees and candidates.
            </p>
          </div>
          <button className="btn btn-gold" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
        {ok && <p style={{ color: 'var(--color-primary-container)', marginTop: 10 }}>{ok}</p>}
        {error && <p style={{ color: 'var(--color-error)', marginTop: 10 }}>{error}</p>}
      </div>

      <div className="dash-card dash-card-padded">
        <h3 className="dash-card-title" style={{ marginBottom: 10 }}>Branding</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Company Name</span>
            <input className="glass-input" value={form.companyName} onChange={(e) => patch({ companyName: e.target.value })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Tagline</span>
            <input className="glass-input" value={form.tagline} onChange={(e) => patch({ tagline: e.target.value })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Logo URL</span>
            <input className="glass-input" value={form.logoUrl} onChange={(e) => patch({ logoUrl: e.target.value })} placeholder="https://..." />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Banner URL</span>
            <input className="glass-input" value={form.bannerUrl} onChange={(e) => patch({ bannerUrl: e.target.value })} placeholder="https://..." />
          </label>
        </div>
      </div>

      <div className="dash-card dash-card-padded" style={{ marginTop: 12 }}>
        <h3 className="dash-card-title" style={{ marginBottom: 10 }}>Company Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Industry</span>
            <input className="glass-input" value={form.industry} onChange={(e) => patch({ industry: e.target.value })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Company Size</span>
            <input className="glass-input" inputMode="numeric" value={String(form.companySize || '')} onChange={(e) => patch({ companySize: Number(e.target.value || 0) })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Founded Year</span>
            <input className="glass-input" inputMode="numeric" value={String(form.foundedYear || '')} onChange={(e) => patch({ foundedYear: Number(e.target.value || 0) })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Location</span>
            <input className="glass-input" value={form.location} onChange={(e) => patch({ location: e.target.value })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Website URL</span>
            <input className="glass-input" value={form.websiteUrl} onChange={(e) => patch({ websiteUrl: e.target.value })} placeholder="https://..." />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>LinkedIn URL</span>
            <input className="glass-input" value={form.linkedinUrl} onChange={(e) => patch({ linkedinUrl: e.target.value })} placeholder="https://..." />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Funding Stage</span>
            <input className="glass-input" value={form.fundingStage} onChange={(e) => patch({ fundingStage: e.target.value })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Funding Raised</span>
            <input className="glass-input" value={form.fundingRaised} onChange={(e) => patch({ fundingRaised: e.target.value })} />
          </label>
        </div>
      </div>

      <div className="dash-card dash-card-padded" style={{ marginTop: 12 }}>
        <h3 className="dash-card-title" style={{ marginBottom: 10 }}>Public Profile</h3>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>About</span>
          <textarea className="glass-input" style={{ minHeight: 110 }} value={form.about} onChange={(e) => patch({ about: e.target.value })} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Benefits (one per line)</span>
          <textarea className="glass-input" style={{ minHeight: 90 }} value={benefitsText} onChange={(e) => setBenefitsText(e.target.value)} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={Boolean(form.showProfileToEmployees)}
            onChange={(e) => patch({ showProfileToEmployees: e.target.checked })}
          />
          <span style={{ fontSize: 13, color: 'var(--color-on-surface)' }}>
            Show this company profile to employees and candidates
          </span>
        </label>
      </div>
    </>
  );
}

