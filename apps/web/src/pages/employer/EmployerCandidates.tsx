import { useEffect, useState } from 'react';
import {
  getEmployerCandidates,
  patchEmployerCandidateStage,
  type EmployerCandidateApi,
  type EmployerCandidateStage,
} from '../../lib/employerApi';

const stages = ['ALL', 'SOURCED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'] as const;
type StageTab = typeof stages[number];

function stageClass(stage: string) {
  const s = stage.toLowerCase();
  if (s === 'interview' || s === 'hired') return 'active';
  if (s === 'offer' || s === 'screening') return 'pending';
  return 'closed';
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function EmployerCandidates() {
  const [activeTab, setActiveTab] = useState<StageTab>('ALL');
  const [rows, setRows] = useState<EmployerCandidateApi[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = async (tab: StageTab) => {
    setLoading(true);
    setError('');
    try {
      const res = await getEmployerCandidates({ stage: tab, limit: 100 });
      setRows(res.candidates);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(activeTab);
  }, [activeTab]);

  const moveStage = async (candidateId: string, stage: EmployerCandidateStage) => {
    setBusyId(candidateId + stage);
    setError('');
    try {
      await patchEmployerCandidateStage(candidateId, stage);
      await load(activeTab);
    } catch (err: any) {
      setError(err.message || 'Failed to update candidate stage');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <span className="dash-card-title">Candidate Pipeline</span>
        <span style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>{total} candidates</span>
      </div>

      <div className="empr-filter-tabs">
        {stages.map(tab => (
          <button
            key={tab}
            className={`empr-filter-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {titleCase(tab)}
          </button>
        ))}
      </div>

      {loading && <p style={{ padding: 16, color: 'var(--color-on-surface-variant)' }}>Loading candidates...</p>}
      {error && <p style={{ padding: 16, color: 'var(--color-error)' }}>{error}</p>}

      {!loading && !error && rows.map((c) => (
        <div key={c.id} className="empr-cand-card">
          <div className="empr-cand-avatar">{c.initials}</div>
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
              <button className="btn btn-gold" style={{ fontSize: 12, padding: '5px 14px' }} onClick={() => moveStage(c.id, 'INTERVIEW')} disabled={Boolean(busyId)}>
                {busyId === c.id + 'INTERVIEW' ? 'Saving...' : 'Review'}
              </button>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 14px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>event</span>
                Schedule
              </button>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 14px' }} onClick={() => moveStage(c.id, 'OFFER')} disabled={Boolean(busyId)}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chat</span>
                {busyId === c.id + 'OFFER' ? 'Saving...' : 'Move to Offer'}
              </button>
            </div>
          </div>
          <div className="empr-cand-right">
            <span className={`dash-match-score ${c.score >= 90 ? 'high' : c.score >= 80 ? 'medium' : 'low'}`}>
              {c.score}%
            </span>
            <span className={`dash-status ${stageClass(c.stage)}`}>
              {c.stageLabel}
            </span>
          </div>
        </div>
      ))}

      {!loading && !error && rows.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.3 }}>group_off</span>
          <p style={{ marginTop: 12 }}>No candidates in this stage</p>
        </div>
      )}
    </div>
  );
}

