import { useEffect, useMemo, useState } from 'react';
import { getEmployeeMatches, type EmployeeMatchApi } from '../../lib/employeeApi';

export default function EmployeeNetwork() {
  const [matches, setMatches] = useState<EmployeeMatchApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getEmployeeMatches({ status: 'ALL', limit: 20 });
        if (!cancelled) setMatches(res.matches);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Unable to load network suggestions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const connections = useMemo(() => (
    matches
      .filter((m) => m.status === 'INTERVIEW' || m.status === 'INTERESTED')
      .map((m, i) => ({
        name: `${m.company} Hiring Team`,
        title: m.title,
        initials: m.company.slice(0, 2).toUpperCase(),
        mutual: 3 + (m.score % 10),
        key: `${m.id}-${i}`,
      }))
  ), [matches]);

  const suggestions = useMemo(() => (
    matches
      .filter((m) => m.status === 'NEW' || m.status === 'SAVED')
      .slice(0, 6)
      .map((m, i) => ({
        name: `${m.company} Recruiter`,
        title: m.title,
        initials: m.company.slice(0, 2).toUpperCase(),
        reason: m.tags?.[0] ? `${m.tags[0]} expertise match` : 'Similar role interests',
        key: `${m.id}-${i}`,
      }))
  ), [matches]);

  return (
    <>
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Your Network</span>
          <span style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>{connections.length} active connections</span>
        </div>
        <div className="dash-card-body">
          {loading && <p style={{ color: 'var(--color-on-surface-variant)' }}>Loading your network...</p>}
          {error && <p style={{ color: 'var(--color-error)' }}>{error}</p>}
          <div className="emp-network-grid">
            {!loading && !error && connections.map((c) => (
              <div key={c.key} className="dash-card emp-network-card glass-card-hover">
                <div className="emp-network-avatar">{c.initials}</div>
                <p className="emp-network-name">{c.name}</p>
                <p className="emp-network-title">{c.title}</p>
                <p className="emp-network-mutual">{c.mutual} mutual connections</p>
                <button className="btn btn-secondary" style={{ marginTop: 12, fontSize: 13, padding: '6px 16px', width: '100%' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
                  Message
                </button>
              </div>
            ))}
            {!loading && !error && connections.length === 0 && (
              <p style={{ color: 'var(--color-on-surface-variant)' }}>No active connections yet. Express interest in matches to build your network.</p>
            )}
          </div>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Suggested Connections</span>
        </div>
        <div className="dash-card-body">
          <div className="emp-network-grid">
            {suggestions.map((s) => (
              <div key={s.key} className="dash-card emp-network-card glass-card-hover">
                <div className="emp-network-avatar" style={{ background: 'linear-gradient(135deg, var(--color-secondary), #f0d060)' }}>{s.initials}</div>
                <p className="emp-network-name">{s.name}</p>
                <p className="emp-network-title">{s.title}</p>
                <p className="emp-network-mutual">{s.reason}</p>
                <button className="btn btn-primary" style={{ marginTop: 12, fontSize: 13, padding: '6px 16px', width: '100%' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
                  Connect
                </button>
              </div>
            ))}
            {!loading && !error && suggestions.length === 0 && (
              <p style={{ color: 'var(--color-on-surface-variant)' }}>No suggestions yet. Save more matches to get curated connections.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

