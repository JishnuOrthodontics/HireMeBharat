import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import EmployeeFeed from './EmployeeFeed';
import EmployeeMatches from './EmployeeMatches';
import EmployeeConcierge from './EmployeeConcierge';
import EmployeeNetwork from './EmployeeNetwork';
import EmployeeProfile from './EmployeeProfile';
import './Employee.css';

const navItems = [
  { icon: 'home', label: 'Home', path: '/employee' },
  { icon: 'work', label: 'Matches', path: '/employee/matches', badge: 5 },
  { icon: 'support_agent', label: 'Concierge', path: '/employee/concierge', badge: 2 },
  { icon: 'group', label: 'Network', path: '/employee/network' },
  { icon: 'mail', label: 'Messages', path: '/employee/messages', badge: 3 },
];

/* ===== Left Sidebar ===== */
function LeftSidebar() {
  return (
    <>
      {/* Profile Mini Card */}
      <div className="dash-card dash-profile-card">
        <div className="dash-profile-banner" />
        <div className="dash-profile-card-body">
          <div className="dash-profile-card-avatar">AK</div>
          <p className="dash-profile-card-name">Alex Kumar</p>
          <p className="dash-profile-card-headline">
            Senior Engineering Leader · ex-Google, Stripe
          </p>
          <div className="dash-profile-stats">
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value">94</div>
              <div className="dash-profile-stat-label">Match Score</div>
            </div>
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value">12</div>
              <div className="dash-profile-stat-label">Active Matches</div>
            </div>
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value">4</div>
              <div className="dash-profile-stat-label">Interviews</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="dash-card">
        <div className="dash-quick-links">
          <a href="#" className="dash-quick-link">
            <span className="material-symbols-outlined">bookmark</span>
            Saved Roles
            <span className="dash-quick-link-badge">7</span>
          </a>
          <a href="#" className="dash-quick-link">
            <span className="material-symbols-outlined">trending_up</span>
            Market Insights
          </a>
          <a href="#" className="dash-quick-link">
            <span className="material-symbols-outlined">school</span>
            Skill Assessments
          </a>
          <a href="#" className="dash-quick-link">
            <span className="material-symbols-outlined">description</span>
            My Resume
          </a>
          <a href="#" className="dash-quick-link">
            <span className="material-symbols-outlined">settings</span>
            Preferences
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
      {/* Concierge Widget */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Your Concierge</span>
          <span className="emp-online-dot" />
        </div>
        <div className="dash-card-body">
          <div className="emp-concierge-widget">
            <div className="emp-concierge-avatar">SJ</div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14 }}>Sarah Jenkins</p>
              <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Senior Talent Concierge</p>
              <p className="emp-concierge-status">
                <span className="emp-online-dot" /> Online now
              </p>
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 12, fontSize: 13, padding: '8px 16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
            Send Message
          </button>
        </div>
      </div>

      {/* Trending Skills */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Trending Skills</span>
          <a href="#" className="dash-card-action">View all</a>
        </div>
        <div className="dash-widget-list">
          {[
            { skill: 'AI/ML Infrastructure', demand: '+42% demand', hot: true },
            { skill: 'Platform Engineering', demand: '+38% demand', hot: true },
            { skill: 'Staff+ Leadership', demand: '+27% demand', hot: false },
            { skill: 'Rust / Systems', demand: '+24% demand', hot: false },
          ].map((s, i) => (
            <div key={i} className="dash-widget-item">
              <div className={`dash-widget-dot ${s.hot ? '' : 'gold'}`} />
              <div>
                <p className="dash-widget-item-title">{s.skill}</p>
                <p className="dash-widget-item-meta">{s.demand}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Salary Insights */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Salary Insights</span>
        </div>
        <div className="dash-card-body">
          <div className="emp-salary-widget">
            <div className="emp-salary-row">
              <span className="emp-salary-label">Your Market Value</span>
              <span className="emp-salary-value text-gradient-emerald">$220k - $280k</span>
            </div>
            <div className="emp-salary-row">
              <span className="emp-salary-label">Industry Median</span>
              <span className="emp-salary-value">$195k</span>
            </div>
            <div className="emp-salary-row">
              <span className="emp-salary-label">Top 10% Earners</span>
              <span className="emp-salary-value">$310k+</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', marginTop: 8 }}>
              Based on your skills, experience, and market data
            </p>
          </div>
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Notifications</span>
          <a href="#" className="dash-card-action">See all</a>
        </div>
        <div className="dash-widget-list">
          {[
            { text: 'New 94% match: VP Engineering at Stealth Startup', time: '2h ago' },
            { text: 'Sarah updated your profile positioning', time: '5h ago' },
            { text: 'Interview prep materials ready for NextGen', time: '1d ago' },
          ].map((n, i) => (
            <div key={i} className="dash-widget-item">
              <div className="dash-widget-dot" />
              <div>
                <p className="dash-widget-item-title">{n.text}</p>
                <p className="dash-widget-item-meta">{n.time}</p>
              </div>
            </div>
          ))}
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
      role="employee"
      userName="Alex Kumar"
      userTitle="Senior Engineering Leader"
      leftSidebar={<LeftSidebar />}
      rightSidebar={<RightSidebar />}
    >
      <Routes>
        <Route index element={<EmployeeFeed />} />
        <Route path="matches" element={<EmployeeMatches />} />
        <Route path="concierge" element={<EmployeeConcierge />} />
        <Route path="network" element={<EmployeeNetwork />} />
        <Route path="profile" element={<EmployeeProfile />} />
        <Route path="*" element={<EmployeeFeed />} />
      </Routes>
    </DashboardLayout>
  );
}
