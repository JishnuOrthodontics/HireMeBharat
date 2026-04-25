import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import EmployerFeed from './EmployerFeed';
import EmployerRequisitions from './EmployerRequisitions';
import EmployerCandidates from './EmployerCandidates';
import EmployerProfile from './EmployerProfile';
import './Employer.css';

const navItems = [
  { icon: 'home', label: 'Home', path: '/employer' },
  { icon: 'work', label: 'Requisitions', path: '/employer/requisitions', badge: 2 },
  { icon: 'groups', label: 'Candidates', path: '/employer/candidates', badge: 8 },
  { icon: 'mail', label: 'Messages', path: '/employer/messages', badge: 1 },
  { icon: 'analytics', label: 'Analytics', path: '/employer/analytics' },
];

/* ===== Left Sidebar ===== */
function LeftSidebar() {
  return (
    <>
      {/* Company Card */}
      <div className="dash-card dash-profile-card">
        <div className="dash-profile-banner" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(80,250,123,0.12))' }} />
        <div className="dash-profile-card-body">
          <div className="dash-profile-card-avatar" style={{ background: 'linear-gradient(135deg, var(--color-secondary), #f0d060)', color: '#1a1a2e' }}>TV</div>
          <p className="dash-profile-card-name">TechVentures Inc.</p>
          <p className="dash-profile-card-headline">
            Series C · AI/ML · 450 employees
          </p>
          <div className="dash-profile-stats">
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value" style={{ color: 'var(--color-secondary)' }}>6</div>
              <div className="dash-profile-stat-label">Open Roles</div>
            </div>
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value" style={{ color: 'var(--color-secondary)' }}>28</div>
              <div className="dash-profile-stat-label">In Pipeline</div>
            </div>
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value" style={{ color: 'var(--color-secondary)' }}>3</div>
              <div className="dash-profile-stat-label">Hired</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dash-card">
        <div className="dash-quick-links">
          <a href="#" className="dash-quick-link">
            <span className="material-symbols-outlined">add_circle</span>
            Post a New Role
          </a>
          <a href="#" className="dash-quick-link">
            <span className="material-symbols-outlined">description</span>
            Job Templates
          </a>
          <a href="#" className="dash-quick-link">
            <span className="material-symbols-outlined">calendar_today</span>
            Interviews
            <span className="dash-quick-link-badge">4</span>
          </a>
          <a href="#" className="dash-quick-link">
            <span className="material-symbols-outlined">support_agent</span>
            Account Manager
          </a>
          <a href="#" className="dash-quick-link">
            <span className="material-symbols-outlined">settings</span>
            Company Settings
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
      {/* Hiring Pipeline */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Pipeline Overview</span>
        </div>
        <div className="dash-card-body">
          <div className="empr-pipeline-widget">
            {[
              { stage: 'Sourced', count: 45, color: 'var(--color-on-surface-variant)' },
              { stage: 'Screening', count: 18, color: 'var(--color-secondary)' },
              { stage: 'Interview', count: 8, color: 'var(--color-primary-container)' },
              { stage: 'Offer', count: 3, color: '#69ff88' },
              { stage: 'Hired', count: 2, color: 'white' },
            ].map((s, i) => (
              <div key={i} className="empr-pipeline-row">
                <span className="empr-pipeline-stage">{s.stage}</span>
                <div className="empr-pipeline-bar-track">
                  <div className="empr-pipeline-bar" style={{ width: `${(s.count / 45) * 100}%`, background: s.color }} />
                </div>
                <span className="empr-pipeline-count">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account Manager */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Account Manager</span>
          <span className="emp-online-dot" />
        </div>
        <div className="dash-card-body">
          <div className="emp-concierge-widget">
            <div className="emp-concierge-avatar" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>MR</div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14 }}>Michael Rodriguez</p>
              <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Enterprise Account Director</p>
              <p className="emp-concierge-status">
                <span className="emp-online-dot" /> Available
              </p>
            </div>
          </div>
          <button className="btn btn-gold" style={{ width: '100%', marginTop: 12, fontSize: 13, padding: '8px 16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
            Contact
          </button>
        </div>
      </div>

      {/* Upcoming Interviews */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Upcoming Interviews</span>
          <a href="#" className="dash-card-action">View all</a>
        </div>
        <div className="dash-widget-list">
          {[
            { candidate: 'E. Thompson', role: 'VP Engineering', time: 'Tomorrow, 2:00 PM', type: 'Video' },
            { candidate: 'M. Chen', role: 'Head of AI', time: 'Wed, 10:00 AM', type: 'On-site' },
            { candidate: 'S. Williams', role: 'Director of Eng', time: 'Thu, 3:30 PM', type: 'Phone' },
          ].map((int, i) => (
            <div key={i} className="dash-widget-item">
              <div className="dash-widget-dot gold" />
              <div>
                <p className="dash-widget-item-title">{int.candidate} · {int.role}</p>
                <p className="dash-widget-item-meta">{int.time} · {int.type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hiring Analytics */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">This Month</span>
        </div>
        <div className="dash-card-body">
          <div className="empr-stats-mini">
            <div className="empr-stat-mini">
              <span className="empr-stat-mini-value">94%</span>
              <span className="empr-stat-mini-label">Avg Match Score</span>
            </div>
            <div className="empr-stat-mini">
              <span className="empr-stat-mini-value">4.2d</span>
              <span className="empr-stat-mini-label">Time to Shortlist</span>
            </div>
            <div className="empr-stat-mini">
              <span className="empr-stat-mini-value">$0</span>
              <span className="empr-stat-mini-label">Cost per Hire</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ===== Main Dashboard ===== */
export default function Dashboard() {
  return (
    <DashboardLayout
      navItems={navItems}
      role="employer"
      userName="James K."
      userTitle="CEO, TechVentures Inc."
      leftSidebar={<LeftSidebar />}
      rightSidebar={<RightSidebar />}
    >
      <Routes>
        <Route index element={<EmployerFeed />} />
        <Route path="requisitions" element={<EmployerRequisitions />} />
        <Route path="candidates" element={<EmployerCandidates />} />
        <Route path="profile" element={<EmployerProfile />} />
        <Route path="*" element={<EmployerFeed />} />
      </Routes>
    </DashboardLayout>
  );
}
