import { useEffect, useMemo, useState } from 'react';
import { getDashboardSummary, getEmployeeMatches, type EmployeeMatchApi, updateMatchStatus } from '../../lib/employeeApi';

/* ===== Home Feed ===== */
export default function EmployeeFeed() {
  const [matches, setMatches] = useState<EmployeeMatchApi[]>([]);
  const [summary, setSummary] = useState<{ activeMatches: number; interviews: number; unreadNotifications: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [matchRes, summaryRes] = await Promise.all([
          getEmployeeMatches({ limit: 5 }),
          getDashboardSummary(),
        ]);
        if (cancelled) return;
        setMatches(matchRes.matches);
        setSummary(summaryRes.summary);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load feed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const marketMessage = useMemo(() => {
    if (!summary) return 'Fetching your latest market intelligence...';
    return `You currently have ${summary.activeMatches} active matches and ${summary.interviews} interviews in progress.`;
  }, [summary]);

  const onMatchAction = async (matchId: string, action: 'interest' | 'save' | 'decline') => {
    setUpdatingId(matchId + action);
    try {
      await updateMatchStatus(matchId, action);
      const refreshed = await getEmployeeMatches({ limit: 5 });
      setMatches(refreshed.matches);
    } catch (err: any) {
      setError(err.message || 'Could not update match');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <>
      {/* Market Intelligence Banner */}
      <div className="dash-card dash-card-padded" style={{ background: 'linear-gradient(135deg, rgba(80,250,123,0.08), rgba(212,175,55,0.05))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-primary-container)', fontSize: 28 }}>query_stats</span>
          <div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>Market Intelligence Update</p>
            <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>Your weekly career market summary</p>
          </div>
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{marketMessage}</p>
      </div>

      {/* New Matches Feed */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Curated Matches</span>
          <a href="#" className="dash-card-action">View all matches</a>
        </div>

        {loading && <p style={{ padding: 16, color: 'var(--color-on-surface-variant)' }}>Loading curated matches...</p>}
        {error && <p style={{ padding: 16, color: 'var(--color-error)' }}>{error}</p>}
        {!loading && !error && matches.length === 0 && (
          <p style={{ padding: 16, color: 'var(--color-on-surface-variant)' }}>No curated matches yet. Your concierge will add opportunities soon.</p>
        )}

        {matches.map((match, i) => (
          <div key={match.id} className={`emp-match-card ${i === 0 ? 'emp-match-featured' : ''}`}>
            <div className="emp-match-logo">{i === 0 ? '🚀' : '💼'}</div>
            <div className="emp-match-info">
              <p className="emp-match-title">{match.title}</p>
              <p className="emp-match-company">{match.company}</p>
              <div className="emp-match-meta">
                <span className="emp-match-meta-item">
                  <span className="material-symbols-outlined">location_on</span>
                  {match.location || 'Location TBD'}
                </span>
                <span className="emp-match-meta-item">
                  <span className="material-symbols-outlined">payments</span>
                  {match.salaryRange || 'Compensation discussed during screening'}
                </span>
              </div>
              <div className="emp-match-tags">
                {(match.tags || []).slice(0, 4).map(tag => <span key={tag} className="emp-match-tag">{tag}</span>)}
              </div>
              <div className="emp-match-actions">
                <button
                  className="btn btn-primary"
                  style={{ fontSize: 13, padding: '6px 16px' }}
                  disabled={Boolean(updatingId)}
                  onClick={() => onMatchAction(match.id, 'interest')}
                >
                  {updatingId === match.id + 'interest' ? 'Saving...' : 'Express Interest'}
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 13, padding: '6px 16px' }}
                  disabled={Boolean(updatingId)}
                  onClick={() => onMatchAction(match.id, 'save')}
                >
                  {updatingId === match.id + 'save' ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            <div className="emp-match-right">
              <span className={`dash-match-score ${match.score >= 90 ? 'high' : match.score >= 80 ? 'medium' : 'low'}`}>
                {match.score}% Match
              </span>
              <span className="emp-match-time">{match.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Activity / Insights */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Recent Activity</span>
        </div>
        {[
          { icon: 'visibility', text: 'Your profile was viewed by 3 recruiters this week', time: 'Today' },
          { icon: 'thumb_up', text: 'NextGen Robotics bookmarked your profile', time: 'Yesterday' },
          { icon: 'update', text: 'Your concierge updated your compensation benchmarks', time: '2 days ago' },
          { icon: 'school', text: 'New skill assessment available: System Design at Scale', time: '3 days ago' },
        ].map((a, i) => (
          <div key={i} className="dash-feed-item" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-primary-container)', marginTop: 2 }}>{a.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, lineHeight: 1.5 }}>{a.text}</p>
              <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

