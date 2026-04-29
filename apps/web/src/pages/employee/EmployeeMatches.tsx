import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getEmployeeMatches, type EmployeeMatchApi, updateMatchStatus } from '../../lib/employeeApi';

const tabs = ['ALL', 'NEW', 'APPLIED', 'INTERVIEW', 'SAVED', 'DECLINED'] as const;
type MatchTab = typeof tabs[number];

function statusChip(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function EmployeeMatches() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = (searchParams.get('status') || 'ALL').toUpperCase();
  const [activeTab, setActiveTab] = useState<MatchTab>(
    (tabs.includes(initialStatus as MatchTab) ? initialStatus : 'ALL') as MatchTab
  );
  const [matches, setMatches] = useState<EmployeeMatchApi[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [showMismatched, setShowMismatched] = useState(false);

  const load = async (tab: MatchTab) => {
    setLoading(true);
    setError('');
    try {
      const res = await getEmployeeMatches({ status: tab, showMismatched, limit: 50 });
      setMatches(res.matches);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'Unable to load matches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = (searchParams.get('status') || '').toUpperCase();
    if (q && tabs.includes(q as MatchTab) && q !== activeTab) {
      setActiveTab(q as MatchTab);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    load(activeTab);
  }, [activeTab, showMismatched]);

  const onUpdate = async (matchId: string, action: 'interest' | 'save' | 'decline') => {
    setUpdatingId(matchId + action);
    try {
      await updateMatchStatus(matchId, action);
      await load(activeTab);
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <span className="dash-card-title">Your Matches</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
            <input type="checkbox" checked={showMismatched} onChange={(e) => setShowMismatched(e.target.checked)} />
            Show salary-mismatched roles
          </label>
          <span style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>{total} total</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="emp-filter-tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`emp-filter-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab);
              if (tab === 'ALL') {
                setSearchParams({});
              } else {
                setSearchParams({ status: tab });
              }
            }}
          >
            {statusChip(tab)}
          </button>
        ))}
      </div>

      {/* Match Cards */}
      {loading && <p style={{ padding: 24, color: 'var(--color-on-surface-variant)' }}>Loading matches...</p>}
      {error && <p style={{ padding: 24, color: 'var(--color-error)' }}>{error}</p>}
      {!loading && !error && matches.map((match) => (
        <div key={match.id} className="emp-match-card">
          <div className="emp-match-logo">💼</div>
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
              {(match.tags || []).map(t => <span key={t} className="emp-match-tag">{t}</span>)}
              {match.isSalaryMismatched && (
                <span className="emp-match-tag" style={{ borderColor: 'rgba(244,114,182,0.45)', color: '#f9a8d4' }}>
                  Salary mismatch
                </span>
              )}
            </div>
            <div className="emp-match-actions">
              <button
                className="btn btn-primary"
                style={{ fontSize: 13, padding: '6px 12px' }}
                disabled={Boolean(updatingId)}
                onClick={() => onUpdate(match.id, 'interest')}
              >
                {updatingId === match.id + 'interest' ? 'Saving...' : 'Express Interest'}
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 13, padding: '6px 12px' }}
                disabled={Boolean(updatingId)}
                onClick={() => onUpdate(match.id, 'save')}
              >
                {updatingId === match.id + 'save' ? 'Saving...' : 'Save'}
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 13, padding: '6px 12px' }}
                disabled={Boolean(updatingId)}
                onClick={() => onUpdate(match.id, 'decline')}
              >
                {updatingId === match.id + 'decline' ? 'Saving...' : 'Decline'}
              </button>
            </div>
          </div>
          <div className="emp-match-right">
            <span className={`dash-match-score ${match.score >= 90 ? 'high' : match.score >= 80 ? 'medium' : 'low'}`}>
              {match.score}%
            </span>
            <span className={`dash-status ${match.status.toLowerCase()}`}>{statusChip(match.status)}</span>
          </div>
        </div>
      ))}

      {!loading && !error && matches.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.3 }}>search_off</span>
          <p style={{ marginTop: 12 }}>No matches in this category</p>
        </div>
      )}
    </div>
  );
}

