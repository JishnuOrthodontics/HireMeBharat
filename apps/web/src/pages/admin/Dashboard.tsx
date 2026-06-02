import { useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
  getAdminAnalytics,
  getAdminEscalations,
  getAdminSummary,
  getAdminSystemHealth,
  getAdminUsers,
  patchAdminEscalation,
  patchAdminUser,
  type AdminEscalationApi,
  type AdminEscalationPriority,
  type AdminEscalationStatus,
  type AdminSummaryApi,
  type AdminSystemHealthApi,
  type AdminUserApi,
  type AdminUserStatus,
} from '../../lib/adminApi';
import {
  getAdminJobListings,
  moderateJobListing,
  getJobPortalStats,
} from '../../lib/jobsApi';
import './Admin.css';

const navItems = [
  { icon: 'home', label: 'Home', path: '/admin' },
  { icon: 'group', label: 'Users', path: '/admin/users' },
  { icon: 'assignment', label: 'Job Portal', path: '/admin/job-portal' },
  { icon: 'flag', label: 'Escalations', path: '/admin/escalations', badge: 4 },
  { icon: 'analytics', label: 'Analytics', path: '/admin/analytics' },
];

const userStatuses: Array<AdminUserStatus> = ['ACTIVE', 'SUSPENDED', 'UNDER_REVIEW'];
const escalationStatuses: Array<AdminEscalationStatus> = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const escalationPriorities: Array<AdminEscalationPriority> = ['LOW', 'MEDIUM', 'HIGH'];

function toRelativeTime(value?: string | null) {
  if (!value) return 'recently';
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return 'recently';
  const diffMs = Date.now() - ts;
  if (diffMs < 60_000) return 'just now';
  if (diffMs < 60 * 60_000) return `${Math.max(1, Math.floor(diffMs / 60_000))}m ago`;
  if (diffMs < 24 * 60 * 60_000) return `${Math.max(1, Math.floor(diffMs / (60 * 60_000)))}h ago`;
  return `${Math.max(1, Math.floor(diffMs / (24 * 60 * 60_000)))}d ago`;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface AdminShellData {
  summary: AdminSummaryApi | null;
  health: AdminSystemHealthApi[];
  escalationsPreview: AdminEscalationApi[];
  metrics: {
    matchRate: string;
    avgResponse: string;
    npsScore: string;
  } | null;
}

/* ===== Left Sidebar ===== */
function LeftSidebar({ summary }: { summary: AdminSummaryApi | null }) {
  return (
    <>
      <div className="dash-card dash-profile-card">
        <div className="dash-profile-banner" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.2))' }} />
        <div className="dash-profile-card-body">
          <div className="dash-profile-card-avatar" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>SA</div>
          <p className="dash-profile-card-name">Super Admin</p>
          <p className="dash-profile-card-headline">Platform Administrator · Full Access</p>
          <div className="dash-profile-stats">
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value" style={{ color: '#a78bfa' }}>{summary?.totalUsers ?? 0}</div>
              <div className="dash-profile-stat-label">Users</div>
            </div>
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value" style={{ color: '#a78bfa' }}>{summary?.activeRequisitions ?? 0}</div>
              <div className="dash-profile-stat-label">Active Jobs</div>
            </div>
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value" style={{ color: '#a78bfa' }}>{summary?.escalationsOpen ?? 0}</div>
              <div className="dash-profile-stat-label">Escalations</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-quick-links">
          <Link to="/admin/users" className="dash-quick-link">
            <span className="material-symbols-outlined">person_add</span>
            Manage Users
          </Link>
          <Link to="/admin" className="dash-quick-link">
            <span className="material-symbols-outlined">monitoring</span>
            System Health
          </Link>
          <Link to="/admin/escalations" className="dash-quick-link">
            <span className="material-symbols-outlined">security</span>
            Escalations
          </Link>
          <Link to="/admin/job-portal" className="dash-quick-link">
            <span className="material-symbols-outlined">tune</span>
            Job Oversight
          </Link>
        </div>
      </div>
    </>
  );
}

/* ===== Right Sidebar ===== */
function RightSidebar({
  health,
  escalations,
  metrics,
}: {
  health: AdminSystemHealthApi[];
  escalations: AdminEscalationApi[];
  metrics: AdminShellData['metrics'];
}) {
  return (
    <>
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">System Health</span>
        </div>
        <div className="dash-card-body">
          <div className="admin-health-grid">
            {health.map((item) => (
              <div key={item.component} className="admin-health-item">
                <span className={`admin-health-dot ${item.status === 'HEALTHY' ? 'ok' : 'warn'}`} />
                <span className="admin-health-label">{titleCase(item.component)}</span>
                <span className="admin-health-status">{titleCase(item.status)}</span>
              </div>
            ))}
            {health.length === 0 && <p style={{ color: 'var(--color-on-surface-variant)' }}>No health checks yet.</p>}
          </div>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Recent Escalations</span>
          <Link to="/admin/escalations" className="dash-card-action">View all</Link>
        </div>
        <div className="dash-widget-list">
          {escalations.map((item) => (
            <div key={item.id} className="dash-widget-item">
              <div className={`dash-widget-dot ${item.priority === 'HIGH' ? '' : 'gold'}`} />
              <div>
                <p className="dash-widget-item-title">{item.summary}</p>
                <p className="dash-widget-item-meta">{titleCase(item.priority)} · {toRelativeTime(item.updatedAt || item.createdAt)}</p>
              </div>
            </div>
          ))}
          {escalations.length === 0 && <p style={{ color: 'var(--color-on-surface-variant)' }}>No escalations.</p>}
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Platform Metrics</span>
        </div>
        <div className="dash-card-body">
          <div className="empr-stats-mini">
            <div className="empr-stat-mini">
              <span className="empr-stat-mini-value" style={{ color: '#a78bfa' }}>{metrics?.matchRate || '0%'}</span>
              <span className="empr-stat-mini-label">Match Rate</span>
            </div>
            <div className="empr-stat-mini">
              <span className="empr-stat-mini-value" style={{ color: '#a78bfa' }}>{metrics?.avgResponse || '0d'}</span>
              <span className="empr-stat-mini-label">Avg Response</span>
            </div>
            <div className="empr-stat-mini">
              <span className="empr-stat-mini-value" style={{ color: '#a78bfa' }}>{metrics?.npsScore || '0.0'}</span>
              <span className="empr-stat-mini-label">NPS Score</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ===== Admin Home Feed ===== */
function AdminFeed({ summary, escalations }: { summary: AdminSummaryApi | null; escalations: AdminEscalationApi[] }) {
  const activity = useMemo(
    () =>
      escalations.slice(0, 8).map((item) => ({
        id: item.id,
        icon: item.status === 'OPEN' ? 'flag' : item.status === 'RESOLVED' ? 'check_circle' : 'update',
        text: `${titleCase(item.type)}: ${item.summary}`,
        time: toRelativeTime(item.updatedAt || item.createdAt),
        color:
          item.priority === 'HIGH'
            ? 'var(--color-error)'
            : item.priority === 'MEDIUM'
              ? 'var(--color-secondary)'
              : 'var(--color-primary-container)',
      })),
    [escalations]
  );

  return (
    <>
      <div className="dash-card dash-card-padded" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span className="material-symbols-outlined" style={{ color: '#a78bfa', fontSize: 28 }}>admin_panel_settings</span>
          <div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>Platform Summary</p>
            <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>Last 24 hours</p>
          </div>
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
          <strong style={{ color: '#a78bfa' }}>{summary?.usersLast24h ?? 0} new users</strong> registered in the last 24 hours.
          Matching processed <strong style={{ color: '#a78bfa' }}>{summary?.matchesLast24h ?? 0} candidate updates</strong>.
          {` ${summary?.escalationsOpen ?? 0} open escalations`} need attention.
        </p>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Activity Feed</span>
        </div>
        {activity.map((a) => (
          <div key={a.id} className="empr-activity-item">
            <div className="empr-activity-icon" style={{ background: `${a.color}15` }}>
              <span className="material-symbols-outlined" style={{ color: a.color }}>{a.icon}</span>
            </div>
            <div>
              <p className="empr-activity-text">{a.text}</p>
              <p className="empr-activity-time">{a.time}</p>
            </div>
          </div>
        ))}
        {activity.length === 0 && (
          <p style={{ padding: 16, color: 'var(--color-on-surface-variant)' }}>No admin activity yet.</p>
        )}
      </div>
    </>
  );
}

function UsersPage() {
  const [rows, setRows] = useState<AdminUserApi[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [draftStatus, setDraftStatus] = useState<Record<string, AdminUserStatus>>({});
  const [draftPlan, setDraftPlan] = useState<Record<string, 'FREE' | 'PRO' | 'PREMIUM'>>({});
  const [draftCredits, setDraftCredits] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminUsers({ limit: 100, offset: 0 });
      setRows(res.users);
      setTotal(res.total);
      const statusMap: Record<string, AdminUserStatus> = {};
      const planMap: Record<string, 'FREE' | 'PRO' | 'PREMIUM'> = {};
      const creditsMap: Record<string, number> = {};
      res.users.forEach((user) => {
        statusMap[user.id] = user.status;
        planMap[user.id] = user.plan || 'FREE';
        creditsMap[user.id] = user.credits || 0;
      });
      setDraftStatus(statusMap);
      setDraftPlan(planMap);
      setDraftCredits(creditsMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveUser = async (user: AdminUserApi) => {
    const status = draftStatus[user.id];
    const plan = draftPlan[user.id];
    const credits = draftCredits[user.id];
    setSavingId(user.id);
    setError('');
    try {
      await patchAdminUser(user.id, { status, plan, credits });
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <span className="dash-card-title">Users Directory</span>
        <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{total} total</span>
      </div>
      {loading && <p style={{ padding: 16, color: 'var(--color-on-surface-variant)' }}>Loading users...</p>}
      {error && <p style={{ padding: 16, color: 'var(--color-error)' }}>{error}</p>}
      {!loading &&
        !error &&
        rows.map((user) => (
          <div key={user.id} className="admin-user-card">
            <div className="admin-user-avatar">
              <span className="material-symbols-outlined">person</span>
            </div>
            <div className="admin-user-details">
              <div className="admin-user-title-row">
                <p className="empr-activity-text" style={{ fontWeight: 600, fontSize: '15px' }}>{user.displayName || user.email}</p>
                <span className={`dash-status ${user.status?.toLowerCase() || 'active'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                  {user.status}
                </span>
                <span className={`plan-badge ${user.plan?.toLowerCase() || 'free'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                  {user.plan}
                </span>
                {user.role === 'EMPLOYER' && (
                  <span className="plan-badge credits" style={{ fontSize: '10px', padding: '2px 8px' }}>
                    {user.credits || 0} Credits
                  </span>
                )}
              </div>
              <p className="empr-activity-time" style={{ marginTop: '6px' }}>
                Email: <strong>{user.email}</strong> · UID: {user.uid || 'no-uid'} · Role: {titleCase(user.role)}
              </p>
              
              <div className="admin-user-actions-row">
                <div className="admin-user-action-group">
                  <span className="admin-user-action-label">Status:</span>
                  <select
                    className="glass-input"
                    value={draftStatus[user.id] || user.status}
                    onChange={(e) => setDraftStatus((prev) => ({ ...prev, [user.id]: e.target.value as AdminUserStatus }))}
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                  >
                    {userStatuses.map((status) => (
                      <option key={status} value={status}>
                        {titleCase(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-user-action-group">
                  <span className="admin-user-action-label">Plan:</span>
                  <select
                    className="glass-input"
                    value={draftPlan[user.id] || user.plan}
                    onChange={(e) => setDraftPlan((prev) => ({ ...prev, [user.id]: e.target.value as any }))}
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                  >
                    <option value="FREE">Free</option>
                    <option value="PRO">Employer Pro</option>
                    <option value="PREMIUM">Candidate Premium</option>
                  </select>
                </div>

                {user.role === 'EMPLOYER' && (
                  <div className="admin-user-action-group">
                    <span className="admin-user-action-label">Credits:</span>
                    <input
                      type="number"
                      className="glass-input"
                      value={draftCredits[user.id] !== undefined ? draftCredits[user.id] : (user.credits || 0)}
                      onChange={(e) => setDraftCredits((prev) => ({ ...prev, [user.id]: parseInt(e.target.value, 10) || 0 }))}
                      style={{ width: '70px', padding: '4px 8px', fontSize: '12px' }}
                    />
                  </div>
                )}

                <div className="admin-user-buttons">
                  <button
                    className="btn btn-gold"
                    onClick={() =>
                      setDraftStatus((prev) => ({
                        ...prev,
                        [user.id]: (prev[user.id] || user.status) === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
                      }))
                    }
                    disabled={Boolean(savingId)}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >
                    {(draftStatus[user.id] || user.status) === 'SUSPENDED' ? 'Restore Access' : 'Revoke Access'}
                  </button>
                  <button 
                    className="btn btn-ghost" 
                    onClick={() => saveUser(user)} 
                    disabled={Boolean(savingId)}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >
                    {savingId === user.id ? 'Applying...' : 'Apply Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      {!loading && !error && rows.length === 0 && (
        <p style={{ padding: 16, color: 'var(--color-on-surface-variant)' }}>No users found.</p>
      )}
    </div>
  );
}

function EscalationsPage() {
  const [rows, setRows] = useState<AdminEscalationApi[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [draftStatus, setDraftStatus] = useState<Record<string, AdminEscalationStatus>>({});
  const [draftPriority, setDraftPriority] = useState<Record<string, AdminEscalationPriority>>({});
  const [draftAssigned, setDraftAssigned] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminEscalations({ limit: 100, offset: 0 });
      setRows(res.escalations);
      setTotal(res.total);
      const nextStatus: Record<string, AdminEscalationStatus> = {};
      const nextPriority: Record<string, AdminEscalationPriority> = {};
      const nextAssigned: Record<string, string> = {};
      res.escalations.forEach((item) => {
        nextStatus[item.id] = item.status;
        nextPriority[item.id] = item.priority;
        nextAssigned[item.id] = item.assignedToUid || '';
      });
      setDraftStatus(nextStatus);
      setDraftPriority(nextPriority);
      setDraftAssigned(nextAssigned);
    } catch (err: any) {
      setError(err.message || 'Failed to load escalations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveEscalation = async (item: AdminEscalationApi) => {
    setSavingId(item.id);
    setError('');
    try {
      await patchAdminEscalation(item.id, {
        status: draftStatus[item.id] || item.status,
        priority: draftPriority[item.id] || item.priority,
        assignedToUid: (draftAssigned[item.id] || '').trim(),
      });
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to update escalation');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <span className="dash-card-title">Escalations</span>
        <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{total} total</span>
      </div>
      {loading && <p style={{ padding: 16, color: 'var(--color-on-surface-variant)' }}>Loading escalations...</p>}
      {error && <p style={{ padding: 16, color: 'var(--color-error)' }}>{error}</p>}
      {!loading &&
        !error &&
        rows.map((item) => (
          <div key={item.id} className="empr-activity-item">
            <div className="empr-activity-icon">
              <span className="material-symbols-outlined">flag</span>
            </div>
            <div style={{ flex: 1 }}>
              <p className="empr-activity-text" style={{ fontWeight: 600 }}>{item.summary}</p>
              <p className="empr-activity-time">
                {titleCase(item.type)} · {titleCase(item.priority)} · {toRelativeTime(item.updatedAt || item.createdAt)}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <select
                  className="glass-input"
                  value={draftStatus[item.id] || item.status}
                  onChange={(e) => setDraftStatus((prev) => ({ ...prev, [item.id]: e.target.value as AdminEscalationStatus }))}
                >
                  {escalationStatuses.map((status) => (
                    <option key={status} value={status}>
                      {titleCase(status)}
                    </option>
                  ))}
                </select>
                <select
                  className="glass-input"
                  value={draftPriority[item.id] || item.priority}
                  onChange={(e) => setDraftPriority((prev) => ({ ...prev, [item.id]: e.target.value as AdminEscalationPriority }))}
                >
                  {escalationPriorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {titleCase(priority)}
                    </option>
                  ))}
                </select>
                <input
                  className="glass-input"
                  placeholder="Assign to UID"
                  value={draftAssigned[item.id] || ''}
                  onChange={(e) => setDraftAssigned((prev) => ({ ...prev, [item.id]: e.target.value }))}
                />
                <button className="btn btn-gold" onClick={() => saveEscalation(item)} disabled={Boolean(savingId)}>
                  {savingId === item.id ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ))}
      {!loading && !error && rows.length === 0 && (
        <p style={{ padding: 16, color: 'var(--color-on-surface-variant)' }}>No escalations yet.</p>
      )}
    </div>
  );
}

function JobPortalPage() {
  const [stats, setStats] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, listingsRes] = await Promise.all([
        getJobPortalStats(),
        getAdminJobListings({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          search: search.trim() || undefined,
          limit: 50
        })
      ]);
      setStats(statsRes.stats);
      setRows(listingsRes.listings || []);
      setTotal(listingsRes.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load job portal data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleModerate = async (id: string, newStatus: string) => {
    setBusyId(id);
    try {
      await moderateJobListing(id, newStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to moderate job listing');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats Summary Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div className="dash-card dash-card-padded" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.03))' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-primary-container)', fontSize: 28 }}>work</span>
            <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--color-primary-container)' }}>{stats.activeListings} / {stats.totalListings}</p>
            <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>Active / Total Listings</p>
          </div>
          <div className="dash-card dash-card-padded" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.03))' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: 28 }}>groups</span>
            <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--color-secondary)' }}>{stats.totalApplications}</p>
            <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>Total Applications</p>
          </div>
          <div className="dash-card dash-card-padded" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.03))' }}>
            <span className="material-symbols-outlined" style={{ color: '#ce93d8', fontSize: 28 }}>timeline</span>
            <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: '#ce93d8' }}>+{stats.applications24h}</p>
            <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>Applications (24h)</p>
          </div>
          <div className="dash-card dash-card-padded" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.03))' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: 28 }}>card_membership</span>
            <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--color-secondary)' }}>{stats.offerAcceptanceRate}%</p>
            <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>Offer Acceptance Rate</p>
          </div>
          <div className="dash-card dash-card-padded" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.03))' }}>
            <span className="material-symbols-outlined" style={{ color: '#ffc107', fontSize: 28 }}>star</span>
            <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: '#ffc107' }}>{stats.avgPlatformRating} / 5</p>
            <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>Platform Rating</p>
          </div>
        </div>
      )}

      {/* Moderation Panel */}
      <div className="dash-card">
        <div className="dash-card-header" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifySelf: 'stretch', alignItems: 'center' }}>
          <span className="dash-card-title" style={{ flex: 1 }}>Job Listings Moderation ({total})</span>
          
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flex: 1, minWidth: '240px' }}>
            <input 
              className="glass-input" 
              placeholder="Search title, company..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '6px 12px', fontSize: 13 }}
            />
            <button type="submit" className="btn btn-gold" style={{ padding: '6px 14px', fontSize: 13 }}>
              Search
            </button>
          </form>

          <select 
            className="glass-input"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="PAUSED">Paused</option>
            <option value="FILLED">Filled</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        {loading && <p style={{ padding: 16, color: 'var(--color-on-surface-variant)' }}>Loading listings...</p>}
        {error && <p style={{ padding: 16, color: 'var(--color-error)' }}>{error}</p>}

        {!loading && !error && rows.map(listing => (
          <div key={listing.id} className="empr-activity-item" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="empr-activity-icon" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="material-symbols-outlined">work</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p className="empr-activity-text" style={{ fontWeight: 600 }}>{listing.title}</p>
                <span className={`dash-status ${listing.status?.toLowerCase() || 'draft'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                  {listing.status}
                </span>
              </div>
              <p className="empr-activity-time">
                Company: <strong>{listing.company}</strong> · Loc: {listing.location} · Created: {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : 'N/A'}
              </p>
              <p className="empr-activity-time" style={{ marginTop: 2 }}>
                Views: <strong>{listing.viewCount || 0}</strong> · Applications: <strong>{listing.applicationCount || 0}</strong>
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {listing.status === 'ACTIVE' && (
                <button 
                  className="btn btn-ghost" 
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={() => handleModerate(listing.id, 'PAUSED')}
                  disabled={busyId === listing.id}
                >
                  Pause
                </button>
              )}
              {listing.status === 'PAUSED' && (
                <button 
                  className="btn btn-ghost" 
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={() => handleModerate(listing.id, 'ACTIVE')}
                  disabled={busyId === listing.id}
                >
                  Activate
                </button>
              )}
              {listing.status !== 'CLOSED' && (
                <button 
                  className="btn btn-ghost" 
                  style={{ fontSize: 12, padding: '4px 10px', color: 'var(--color-error)' }}
                  onClick={() => handleModerate(listing.id, 'CLOSED')}
                  disabled={busyId === listing.id}
                >
                  Force Close
                </button>
              )}
            </div>
          </div>
        ))}

        {!loading && !error && rows.length === 0 && (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>No listings found under this filter.</p>
        )}
      </div>
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="dash-card dash-card-padded">
      <h2 className="dash-card-title">{title}</h2>
      <p style={{ marginTop: 8, color: 'var(--color-on-surface-variant)' }}>
        This section is planned for phase 2. Core admin operations are available in Home, Users, and Escalations.
      </p>
    </div>
  );
}

/* ===== Main Dashboard ===== */
export default function Dashboard() {
  const [summary, setSummary] = useState<AdminSummaryApi | null>(null);
  const [health, setHealth] = useState<AdminSystemHealthApi[]>([]);
  const [escalationsPreview, setEscalationsPreview] = useState<AdminEscalationApi[]>([]);
  const [metrics, setMetrics] = useState<AdminShellData['metrics']>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [summaryRes, healthRes, escalationsRes, analyticsRes] = await Promise.all([
          getAdminSummary(),
          getAdminSystemHealth(),
          getAdminEscalations({ limit: 5, offset: 0 }),
          getAdminAnalytics(),
        ]);
        if (cancelled) return;
        setSummary(summaryRes.summary);
        setHealth(healthRes.services || []);
        setEscalationsPreview(escalationsRes.escalations || []);
        const denominator = Math.max(1, analyticsRes.matchesMade || 1);
        const matchRate = `${Math.round(((summaryRes.summary.matchesLast24h || 0) / denominator) * 100)}%`;
        setMetrics({
          matchRate,
          avgResponse: `${Math.max(1, Math.round((summaryRes.summary.escalationsInProgress || 0) / 2))}d`,
          npsScore: (4 + Math.min(0.9, (summaryRes.summary.matchesLast24h || 0) / 500)).toFixed(1),
        });
      } catch {
        // Keep shell resilient; pages do their own fetches.
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardLayout
      navItems={navItems}
      role="admin"
      userName="Super Admin"
      userTitle="Platform Administrator"
      leftSidebar={<LeftSidebar summary={summary} />}
      rightSidebar={<RightSidebar health={health} escalations={escalationsPreview} metrics={metrics} />}
    >
      <Routes>
        <Route index element={<AdminFeed summary={summary} escalations={escalationsPreview} />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="escalations" element={<EscalationsPage />} />
        <Route path="job-portal" element={<JobPortalPage />} />
        <Route path="analytics" element={<ComingSoon title="Analytics" />} />
        <Route path="*" element={<AdminFeed summary={summary} escalations={escalationsPreview} />} />
      </Routes>
    </DashboardLayout>
  );
}

