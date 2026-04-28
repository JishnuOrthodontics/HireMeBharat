import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  deleteEmployerRequisition,
  getEmployerRequisitions,
  patchEmployerRequisition,
  type EmployerRequisitionApi,
} from '../../lib/employerApi';
import CreateRequisitionModal from './CreateRequisitionModal';

const tabs = ['ALL', 'ACTIVE', 'PAUSED', 'FILLED', 'DRAFT'] as const;
type ReqTab = typeof tabs[number];

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function EmployerRequisitions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = (searchParams.get('status') || 'ALL').toUpperCase();
  const [activeTab, setActiveTab] = useState<ReqTab>((tabs.includes(initialStatus as ReqTab) ? initialStatus : 'ALL') as ReqTab);
  const [rows, setRows] = useState<EmployerRequisitionApi[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRequisition, setEditingRequisition] = useState<EmployerRequisitionApi | null>(null);

  const load = async (tab: ReqTab) => {
    setLoading(true);
    setError('');
    try {
      const res = await getEmployerRequisitions({ status: tab, limit: 50 });
      setRows(res.requisitions);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load requisitions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const q = (searchParams.get('status') || '').toUpperCase();
    if (q && tabs.includes(q as ReqTab) && q !== activeTab) {
      setActiveTab(q as ReqTab);
    }
  }, [searchParams, activeTab]);

  const onStatus = async (id: string, status: EmployerRequisitionApi['status']) => {
    setBusyId(id + status);
    setError('');
    try {
      await patchEmployerRequisition(id, { status });
      await load(activeTab);
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setBusyId('');
    }
  };

  const onDelete = async (req: EmployerRequisitionApi) => {
    const confirmed = window.confirm(`Delete requisition "${req.title}"? This action cannot be undone.`);
    if (!confirmed) return;
    setBusyId(req.id + 'DELETE');
    setError('');
    try {
      await deleteEmployerRequisition(req.id);
      await load(activeTab);
    } catch (err: any) {
      setError(err.message || 'Failed to delete requisition');
    } finally {
      setBusyId('');
    }
  };

  return (
    <>
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Requisitions</span>
          <button className="btn btn-gold" style={{ fontSize: 13, padding: '6px 16px' }} onClick={() => setCreateOpen(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            New Requisition
          </button>
        </div>

        <div className="empr-filter-tabs">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`empr-filter-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'ALL') {
                  setSearchParams({});
                } else {
                  setSearchParams({ status: tab });
                }
              }}
            >
              {titleCase(tab)}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 20px 8px', color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{total} total</div>
        {loading && <p style={{ padding: 16, color: 'var(--color-on-surface-variant)' }}>Loading requisitions...</p>}
        {error && <p style={{ padding: 16, color: 'var(--color-error)' }}>{error}</p>}

        {!loading && !error && rows.map((req) => (
          <div key={req.id} className="empr-req-card">
            <div className="empr-req-icon">
              <span className="material-symbols-outlined">work</span>
            </div>
            <div className="empr-req-info">
              <p className="empr-req-title">{req.title}</p>
              <div className="empr-req-meta">
                <span className="empr-req-meta-item">
                  <span className="material-symbols-outlined">apartment</span>
                  {req.department || 'Department'}
                </span>
                <span className="empr-req-meta-item">
                  <span className="material-symbols-outlined">location_on</span>
                  {req.location}
                </span>
                <span className="empr-req-meta-item">
                  <span className="material-symbols-outlined">payments</span>
                  {req.salaryLabel}
                </span>
              </div>
              <div className="empr-req-pipeline">
                <span className={`empr-req-stage-chip ${req.candidatesInPipeline > 0 ? 'has-count' : ''}`}>
                  {req.candidatesInPipeline} candidates
                </span>
                <span className="empr-req-stage-chip">{req.employmentType.replace('_', ' ')}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  disabled={Boolean(busyId)}
                  onClick={() => setEditingRequisition(req)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  disabled={Boolean(busyId)}
                  onClick={() => onStatus(req.id, req.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}
                >
                  {busyId === req.id + (req.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')
                    ? 'Saving...'
                    : req.status === 'ACTIVE'
                      ? 'Pause'
                      : 'Activate'}
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  disabled={Boolean(busyId)}
                  onClick={() => onStatus(req.id, 'FILLED')}
                >
                  {busyId === req.id + 'FILLED' ? 'Saving...' : 'Mark Filled'}
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '4px 10px', color: 'var(--color-error)' }}
                  disabled={Boolean(busyId)}
                  onClick={() => onDelete(req)}
                >
                  {busyId === req.id + 'DELETE' ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
            <div className="empr-req-right">
              <span className={`dash-status ${req.status.toLowerCase()}`}>{req.status}</span>
              <span className="empr-req-posted">
                {req.updatedAt ? new Date(req.updatedAt).toLocaleDateString() : 'recently'}
              </span>
            </div>
          </div>
        ))}

        {!loading && !error && rows.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.3 }}>search_off</span>
            <p style={{ marginTop: 12 }}>No requisitions in this category</p>
          </div>
        )}
      </div>
      <CreateRequisitionModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => load(activeTab)}
        defaultStatus={activeTab === 'ALL' ? 'DRAFT' : activeTab}
      />
      <CreateRequisitionModal
        open={Boolean(editingRequisition)}
        onClose={() => setEditingRequisition(null)}
        onCreated={async () => load(activeTab)}
        requisition={editingRequisition}
      />
    </>
  );
}

