import { useEffect, useMemo, useState } from 'react';
import {
  createEmployerRequisition,
  getEmployerActivity,
  getEmployerDashboardSummary,
  getEmployerMatches,
  type EmployerActivityApi,
  type EmployerMatchApi,
} from '../../lib/employerApi';

export default function EmployerFeed() {
  const [matches, setMatches] = useState<EmployerMatchApi[]>([]);
  const [activity, setActivity] = useState<EmployerActivityApi[]>([]);
  const [summary, setSummary] = useState<{ inPipeline: number; upcomingInterviews: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [m, a, s] = await Promise.all([
        getEmployerMatches(),
        getEmployerActivity(),
        getEmployerDashboardSummary(),
      ]);
      setMatches(m.matches);
      setActivity(a.activity);
      setSummary({ inPipeline: s.summary.inPipeline, upcomingInterviews: s.summary.upcomingInterviews.length });
    } catch (err: any) {
      setError(err.message || 'Failed to load employer feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const hiringMessage = useMemo(() => {
    if (!summary) return 'Fetching your latest recruitment summary...';
    return `${summary.inPipeline} candidates are currently in your pipeline and ${summary.upcomingInterviews} interviews are upcoming.`;
  }, [summary]);

  const onPost = async () => {
    setPosting(true);
    setError('');
    try {
      await createEmployerRequisition({
        title: 'New Role',
        department: 'General',
        location: 'Remote',
        description: 'Add role details here.',
        requirements: [],
        salaryMin: 0,
        salaryMax: 0,
        salaryCurrency: 'USD',
        status: 'DRAFT',
      });
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to create requisition');
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      {/* Post a Job */}
      <div className="dash-card">
        <div className="empr-post-job-card">
          <div className="dash-profile-avatar-placeholder" style={{ background: 'linear-gradient(135deg, var(--color-secondary), #f0d060)', color: '#1a1a2e', width: 40, height: 40, fontSize: 14 }}>TV</div>
          <div className="empr-post-job-input">Post a new requisition...</div>
          <button className="btn btn-gold" style={{ fontSize: 13, padding: '8px 16px' }} onClick={onPost} disabled={posting}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      {/* Hiring Status Banner */}
      <div className="dash-card dash-card-padded" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(80,250,123,0.04))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: 28 }}>trending_up</span>
          <div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>Hiring Pipeline Update</p>
            <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>Live recruitment summary for your company</p>
          </div>
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--color-secondary)' }}>AI-matched candidates are updating continuously.</strong> {hiringMessage}
        </p>
      </div>

      {/* New Candidate Matches */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">New Candidate Matches</span>
          <a href="/employer/candidates" className="dash-card-action">View all candidates</a>
        </div>

        {loading && <p style={{ padding: 16, color: 'var(--color-on-surface-variant)' }}>Loading matches...</p>}
        {error && <p style={{ padding: 16, color: 'var(--color-error)' }}>{error}</p>}
        {!loading && !error && matches.map((c) => (
          <div key={c.candidateId} className="empr-cand-card">
            <div className="empr-cand-avatar">{c.name.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()}</div>
            <div className="empr-cand-info">
              <p className="empr-cand-name">{c.name}</p>
              <p className="empr-cand-headline">{c.title}</p>
              <div className="empr-cand-skills">
                {c.skills.map(s => <span key={s} className="emp-match-tag">{s}</span>)}
              </div>
              <div className="empr-cand-comp">
                <span>Expecting: {c.compensation}</span>
                <span>For: {c.roleTarget}</span>
              </div>
              <div className="empr-cand-actions">
                <a href="/employer/candidates" className="btn btn-gold" style={{ fontSize: 12, padding: '5px 14px' }}>Review Profile</a>
                <a href="/employer/candidates" className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 14px' }}>Schedule Interview</a>
              </div>
            </div>
            <div className="empr-cand-right">
              <span className={`dash-match-score ${c.score >= 90 ? 'high' : c.score >= 80 ? 'medium' : 'low'}`}>
                {c.score}% Match
              </span>
              <span className="empr-req-posted">{c.status}</span>
            </div>
          </div>
        ))}
        {!loading && !error && matches.length === 0 && (
          <p style={{ padding: 16, color: 'var(--color-on-surface-variant)' }}>No new candidate matches right now.</p>
        )}
      </div>

      {/* Recent Activity */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Recent Activity</span>
        </div>
        {!loading && !error && activity.map((a) => (
          <div key={a.id} className="empr-activity-item">
            <div className="empr-activity-icon">
              <span className="material-symbols-outlined">{a.icon}</span>
            </div>
            <div>
              <p className="empr-activity-text">{a.text}</p>
              <p className="empr-activity-time">{a.createdAt ? new Date(a.createdAt).toLocaleString() : 'recently'}</p>
            </div>
          </div>
        ))}
        {!loading && !error && activity.length === 0 && (
          <p style={{ padding: 16, color: 'var(--color-on-surface-variant)' }}>No activity yet.</p>
        )}
      </div>
    </>
  );
}

