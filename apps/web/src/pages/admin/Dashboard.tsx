import { Routes, Route, Link, useLocation } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import './Admin.css';

const navItems = [
  { icon: 'home', label: 'Home', path: '/admin' },
  { icon: 'group', label: 'Users', path: '/admin/users' },
  { icon: 'work', label: 'Requisitions', path: '/admin/requisitions' },
  { icon: 'flag', label: 'Escalations', path: '/admin/escalations', badge: 4 },
  { icon: 'analytics', label: 'Analytics', path: '/admin/analytics' },
];

/* ===== Left Sidebar ===== */
function LeftSidebar() {
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
              <div className="dash-profile-stat-value" style={{ color: '#a78bfa' }}>142</div>
              <div className="dash-profile-stat-label">Users</div>
            </div>
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value" style={{ color: '#a78bfa' }}>28</div>
              <div className="dash-profile-stat-label">Active Reqs</div>
            </div>
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value" style={{ color: '#a78bfa' }}>4</div>
              <div className="dash-profile-stat-label">Escalations</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-quick-links">
          <a href="#" className="dash-quick-link">
            <span className="material-symbols-outlined">person_add</span>
            Create User
          </a>
          <a href="#" className="dash-quick-link">
            <span className="material-symbols-outlined">monitoring</span>
            System Health
          </a>
          <a href="#" className="dash-quick-link">
            <span className="material-symbols-outlined">security</span>
            Security Logs
          </a>
          <a href="#" className="dash-quick-link">
            <span className="material-symbols-outlined">tune</span>
            Platform Settings
          </a>
        </div>
      </div>
    </>
  );
}

/* ===== Right Sidebar ===== */
function RightSidebar() {
  return (
    <>
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">System Health</span>
        </div>
        <div className="dash-card-body">
          <div className="admin-health-grid">
            {[
              { label: 'API', status: 'Healthy', ok: true },
              { label: 'Database', status: 'Healthy', ok: true },
              { label: 'Auth', status: 'Healthy', ok: true },
              { label: 'Matching', status: 'Warning', ok: false },
            ].map((h, i) => (
              <div key={i} className="admin-health-item">
                <span className={`admin-health-dot ${h.ok ? 'ok' : 'warn'}`} />
                <span className="admin-health-label">{h.label}</span>
                <span className="admin-health-status">{h.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Recent Escalations</span>
          <a href="#" className="dash-card-action">View all</a>
        </div>
        <div className="dash-widget-list">
          {[
            { text: 'Candidate salary mismatch — E. Thompson', priority: 'High', time: '1h ago' },
            { text: 'Employer feedback delay — DataFlow Inc', priority: 'Medium', time: '3h ago' },
            { text: 'Profile verification needed — S. Williams', priority: 'Low', time: '1d ago' },
          ].map((e, i) => (
            <div key={i} className="dash-widget-item">
              <div className={`dash-widget-dot ${e.priority === 'High' ? '' : 'gold'}`} />
              <div>
                <p className="dash-widget-item-title">{e.text}</p>
                <p className="dash-widget-item-meta">{e.priority} · {e.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Platform Metrics</span>
        </div>
        <div className="dash-card-body">
          <div className="empr-stats-mini">
            <div className="empr-stat-mini">
              <span className="empr-stat-mini-value" style={{ color: '#a78bfa' }}>89%</span>
              <span className="empr-stat-mini-label">Match Rate</span>
            </div>
            <div className="empr-stat-mini">
              <span className="empr-stat-mini-value" style={{ color: '#a78bfa' }}>2.1d</span>
              <span className="empr-stat-mini-label">Avg Response</span>
            </div>
            <div className="empr-stat-mini">
              <span className="empr-stat-mini-value" style={{ color: '#a78bfa' }}>4.8</span>
              <span className="empr-stat-mini-label">NPS Score</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ===== Admin Home Feed ===== */
function AdminFeed() {
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
          <strong style={{ color: '#a78bfa' }}>12 new users</strong> registered today (8 candidates, 4 employers).
          AI matching engine processed <strong style={{ color: '#a78bfa' }}>156 matches</strong>.
          4 escalations need your attention.
        </p>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Activity Feed</span>
        </div>
        {[
          { icon: 'person_add', text: 'New employer registered: DataFlow Inc.', time: '30 min ago', color: '#a78bfa' },
          { icon: 'auto_awesome', text: 'AI matched 15 candidates to new VP Engineering role', time: '1 hour ago', color: 'var(--color-primary-container)' },
          { icon: 'flag', text: 'Escalation: Candidate salary expectations mismatch', time: '2 hours ago', color: 'var(--color-error)' },
          { icon: 'check_circle', text: 'S. Williams completed profile verification', time: '3 hours ago', color: 'var(--color-primary-container)' },
          { icon: 'campaign', text: 'Monthly hiring report generated for TechVentures', time: '5 hours ago', color: 'var(--color-secondary)' },
          { icon: 'security', text: 'Failed login attempt from unusual location blocked', time: '6 hours ago', color: 'var(--color-error)' },
          { icon: 'payments', text: 'Employer subscription renewed: NextGen Robotics', time: '1 day ago', color: 'var(--color-secondary)' },
        ].map((a, i) => (
          <div key={i} className="empr-activity-item">
            <div className="empr-activity-icon" style={{ background: `${a.color}15` }}>
              <span className="material-symbols-outlined" style={{ color: a.color }}>{a.icon}</span>
            </div>
            <div>
              <p className="empr-activity-text">{a.text}</p>
              <p className="empr-activity-time">{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ===== Main Dashboard ===== */
export default function Dashboard() {
  return (
    <DashboardLayout
      navItems={navItems}
      role="admin"
      userName="Super Admin"
      userTitle="Platform Administrator"
      leftSidebar={<LeftSidebar />}
      rightSidebar={<RightSidebar />}
    >
      <Routes>
        <Route index element={<AdminFeed />} />
        <Route path="*" element={<AdminFeed />} />
      </Routes>
    </DashboardLayout>
  );
}
