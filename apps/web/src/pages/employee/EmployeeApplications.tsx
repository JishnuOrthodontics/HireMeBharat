import { useState, useEffect } from 'react';
import { getMyApplications, withdrawApplication, type JobApplicationApi } from '../../lib/jobsApi';
import '../jobs/Jobs.css';

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function EmployeeApplications() {
  const [applications, setApplications] = useState<JobApplicationApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    getMyApplications()
      .then(res => setApplications(res.applications))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  async function handleWithdraw(id: string) {
    if (!window.confirm('Are you sure you want to withdraw this application?')) return;
    try {
      await withdrawApplication(id);
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'WITHDRAWN' } : a));
    } catch (err) {
      console.error(err);
    }
  }

  const filtered = filter === 'ALL'
    ? applications
    : applications.filter(a => a.status === filter);

  const statuses = ['ALL', 'PENDING', 'REVIEWED', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'REJECTED', 'WITHDRAWN'];

  return (
    <div className="jobs-applications-page">
      <div className="jobs-page-header">
        <h2>
          <span className="material-symbols-outlined" style={{ fontSize: 24, marginRight: 8, verticalAlign: -4, color: 'var(--color-primary-container)' }}>description</span>
          My Applications
        </h2>
        <span style={{ fontSize: 14, color: 'var(--color-on-surface-variant)' }}>{applications.length} total</span>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {statuses.map(s => (
          <button
            key={s}
            className={`jobs-filter-chip ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="jobs-app-card">
            <div className="jobs-skeleton" style={{ width: 48, height: 48, borderRadius: 8 }} />
            <div style={{ flex: 1 }}>
              <div className="jobs-skeleton" style={{ height: 16, width: '50%', marginBottom: 8 }} />
              <div className="jobs-skeleton" style={{ height: 14, width: '30%' }} />
            </div>
          </div>
        ))
      ) : filtered.length === 0 ? (
        <div className="jobs-empty">
          <span className="material-symbols-outlined">description</span>
          <h3>No applications {filter !== 'ALL' ? `with status "${filter.toLowerCase()}"` : 'yet'}</h3>
          <p>Browse the job board to find your next opportunity!</p>
        </div>
      ) : (
        filtered.map(app => (
          <div key={app.id} className="jobs-app-card animate-fade-in">
            <div className="jobs-app-logo">
              {(app.company || 'C').charAt(0)}
            </div>
            <div className="jobs-app-info">
              <div className="jobs-app-title">{app.jobTitle}</div>
              <div className="jobs-app-company">{app.company} {app.location ? `· ${app.location}` : ''}</div>
              <div className="jobs-app-date">
                Applied {timeAgo(app.appliedAt)}
                {app.reviewedAt && ` · Reviewed ${timeAgo(app.reviewedAt)}`}
              </div>
            </div>
            <div className="jobs-app-right">
              <span className={`jobs-status-badge ${app.status.toLowerCase()}`}>
                {app.status.charAt(0) + app.status.slice(1).toLowerCase()}
              </span>
              {['PENDING', 'REVIEWED', 'SHORTLISTED'].includes(app.status) && (
                <button
                  className="btn btn-secondary"
                  style={{ padding: '4px 12px', fontSize: 12 }}
                  onClick={() => handleWithdraw(app.id)}
                >
                  Withdraw
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
