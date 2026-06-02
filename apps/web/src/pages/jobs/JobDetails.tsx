import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getJobListingById, applyToJob, type JobListingApi } from '../../lib/jobsApi';
import { useAuth } from '../../contexts/AuthContext';
import './Jobs.css';

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Posted today';
  if (days === 1) return 'Posted 1 day ago';
  if (days < 30) return `Posted ${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'Posted 1 month ago' : `Posted ${months} months ago`;
}

export default function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { firebaseUser, userProfile } = useAuth();

  const [listing, setListing] = useState<JobListingApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showApply, setShowApply] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getJobListingById(id)
      .then(res => setListing(res.listing))
      .catch(() => setError('Failed to load job listing'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApply() {
    if (!id) return;
    setApplying(true);
    setApplyError('');
    try {
      await applyToJob(id, { coverLetter: coverLetter || undefined });
      setApplied(true);
      setShowApply(false);
    } catch (err: any) {
      setApplyError(err.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="job-detail">
        <div className="job-detail-card">
          <div style={{ padding: 32 }}>
            <div className="jobs-skeleton" style={{ height: 24, width: '60%', marginBottom: 12 }} />
            <div className="jobs-skeleton" style={{ height: 18, width: '40%', marginBottom: 24 }} />
            <div className="jobs-skeleton" style={{ height: 14, width: '80%', marginBottom: 8 }} />
            <div className="jobs-skeleton" style={{ height: 14, width: '70%', marginBottom: 8 }} />
            <div className="jobs-skeleton" style={{ height: 14, width: '65%' }} />
          </div>
        </div>
      </div>
    );
  }

  const isEmployeeDashboard = location.pathname.startsWith('/employee');
  const backPath = isEmployeeDashboard ? '/employee/jobs' : '/jobs';

  if (error || !listing) {
    return (
      <div className="job-detail">
        <button className="job-detail-back" onClick={() => navigate(backPath)}>
          <span className="material-symbols-outlined">arrow_back</span> Back to Jobs
        </button>
        <div className="jobs-empty">
          <span className="material-symbols-outlined">error</span>
          <h3>{error || 'Job not found'}</h3>
          <p>This listing may have been removed or is no longer active.</p>
        </div>
      </div>
    );
  }

  const typeLabel = listing.employmentType?.replace('_', '-') || 'Full-Time';

  return (
    <div className="job-detail">
      <button className="job-detail-back" onClick={() => navigate(backPath)}>
        <span className="material-symbols-outlined">arrow_back</span> Back to Jobs
      </button>

      <div className="job-detail-card animate-fade-in-up">
        {/* Header */}
        <div className="job-detail-header">
          <div className="job-detail-header-top">
            <div className="job-detail-logo">
              {listing.companyLogoUrl ? (
                <img src={listing.companyLogoUrl} alt={listing.company} />
              ) : (
                (listing.company || 'C').charAt(0)
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div className="job-detail-title">{listing.title}</div>
              <div className="job-detail-company" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {listing.company}
                {listing.companyIsPro && (
                  <span className="premium-badge-gold" style={{
                    background: 'linear-gradient(135deg, #d4af37, #f9d976)',
                    color: '#1a1a2e',
                    fontSize: 9,
                    fontWeight: 'bold',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    boxShadow: '0 0 6px rgba(212, 175, 85, 0.3)',
                    letterSpacing: '0.5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 11 }}>workspace_premium</span>
                    PRO
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="job-detail-meta">
            <span className="job-detail-meta-item">
              <span className="material-symbols-outlined">location_on</span>
              {listing.location || 'Remote'}
            </span>
            <span className="job-detail-meta-item">
              <span className="material-symbols-outlined">work</span>
              {typeLabel}
            </span>
            {listing.department && (
              <span className="job-detail-meta-item">
                <span className="material-symbols-outlined">business</span>
                {listing.department}
              </span>
            )}
            {(listing.experienceMin > 0 || listing.experienceMax > 0) && (
              <span className="job-detail-meta-item">
                <span className="material-symbols-outlined">trending_up</span>
                {listing.experienceMin}–{listing.experienceMax} years
              </span>
            )}
            <span className="job-detail-meta-item">
              <span className="material-symbols-outlined">visibility</span>
              {listing.viewCount || 0} views
            </span>
            <span className="job-detail-meta-item">
              <span className="material-symbols-outlined">group</span>
              {listing.applicationCount || 0} applicants
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="job-detail-body">
          {/* Description */}
          <div className="job-detail-section">
            <h3>
              <span className="material-symbols-outlined">description</span>
              Job Description
            </h3>
            <p>{listing.description}</p>
          </div>

          {/* Requirements */}
          {listing.requirements && listing.requirements.length > 0 && (
            <div className="job-detail-section">
              <h3>
                <span className="material-symbols-outlined">checklist</span>
                Requirements
              </h3>
              <ul>
                {listing.requirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Benefits */}
          {listing.benefits && listing.benefits.length > 0 && (
            <div className="job-detail-section">
              <h3>
                <span className="material-symbols-outlined">favorite</span>
                Benefits
              </h3>
              <ul>
                {listing.benefits.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills */}
          {listing.skills.length > 0 && (
            <div className="job-detail-section">
              <h3>
                <span className="material-symbols-outlined">psychology</span>
                Skills Required
              </h3>
              <div className="job-detail-skills">
                {listing.skills.map(s => (
                  <span key={s} className="chip chip-emerald">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Apply Bar */}
        <div className="job-detail-apply-bar">
          <div className="job-detail-apply-salary">
            {listing.salaryLabel || 'Not disclosed'}
            {listing.salaryCurrency && (
              <span> {listing.salaryCurrency}/yr</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="job-card-posted">{timeAgo(listing.createdAt)}</span>
            {applied ? (
              <span className="chip chip-emerald" style={{ padding: '8px 20px' }}>
                ✓ Applied Successfully
              </span>
            ) : firebaseUser && userProfile?.role === 'EMPLOYEE' ? (
              <button className="btn btn-primary btn-lg" onClick={() => setShowApply(true)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                Apply Now
              </button>
            ) : !firebaseUser ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/signin')}>
                Sign In to Apply
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {showApply && (
        <div className="jobs-apply-modal-backdrop" onClick={() => setShowApply(false)}>
          <div className="jobs-apply-modal" onClick={e => e.stopPropagation()}>
            <div className="jobs-apply-modal-header">
              <h3>Apply to {listing.title}</h3>
              <button onClick={() => setShowApply(false)} style={{ color: 'var(--color-on-surface-variant)' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="jobs-apply-modal-body">
              <div className="jobs-apply-field">
                <label>Cover Letter (optional)</label>
                <textarea
                  rows={6}
                  placeholder="Tell the employer why you're a great fit for this role..."
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                />
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: -3, marginRight: 4 }}>info</span>
                Your profile and resume (if uploaded) will be shared with the employer.
              </p>
              {applyError && (
                <p style={{ color: 'var(--color-error)', fontSize: 14, marginTop: 12 }}>{applyError}</p>
              )}
            </div>
            <div className="jobs-apply-modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowApply(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleApply} disabled={applying}>
                {applying ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
