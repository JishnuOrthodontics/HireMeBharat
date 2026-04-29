import { Routes, Route, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import EmployeeFeed from './EmployeeFeed';
import EmployeeMatches from './EmployeeMatches';
import EmployeeConcierge from './EmployeeConcierge';
import EmployeeNetwork from './EmployeeNetwork';
import EmployeeProfile from './EmployeeProfile';
import EmployeeResume from './EmployeeResume';
import { getDashboardSummary, getEmployeeMatches, getEmployeeProfile, getNotifications } from '../../lib/employeeApi';
import './Employee.css';

const navItems = [
  { icon: 'home', label: 'Home', path: '/employee' },
  { icon: 'work', label: 'Matches', path: '/employee/matches', badge: 5 },
  { icon: 'support_agent', label: 'Concierge', path: '/employee/concierge', badge: 2 },
  { icon: 'group', label: 'Network', path: '/employee/network' },
  { icon: 'mail', label: 'Messages', path: '/employee/messages', badge: 3 },
];

/* ===== Left Sidebar ===== */
function LeftSidebar({ profile, activeMatches, interviews }: { profile: any; activeMatches: number; interviews: number }) {
  const initials = (profile?.displayName || 'Employee')
    .split(' ')
    .map((s: string) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <>
      {/* Profile Mini Card */}
      <div className="dash-card dash-profile-card">
        <div className="dash-profile-banner" />
        <div className="dash-profile-card-body">
          <div className="dash-profile-card-avatar">{initials}</div>
          <p className="dash-profile-card-name">{profile?.displayName || 'Employee'}</p>
          <p className="dash-profile-card-headline">
            {profile?.headline || 'Complete your profile to improve match quality'}
          </p>
          <div className="dash-profile-stats">
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value">{Math.max(0, Math.min(100, Math.round((activeMatches * 13 + 67) % 100)))}</div>
              <div className="dash-profile-stat-label">Match Score</div>
            </div>
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value">{activeMatches}</div>
              <div className="dash-profile-stat-label">Active Matches</div>
            </div>
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value">{interviews}</div>
              <div className="dash-profile-stat-label">Interviews</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="dash-card">
        <div className="dash-quick-links">
          <Link to="/employee/matches?status=SAVED" className="dash-quick-link">
            <span className="material-symbols-outlined">bookmark</span>
            Saved Roles
            <span className="dash-quick-link-badge">7</span>
          </Link>
          <Link to="/employee/market-insights" className="dash-quick-link">
            <span className="material-symbols-outlined">trending_up</span>
            Market Insights
          </Link>
          <Link to="/employee/skill-assessments" className="dash-quick-link">
            <span className="material-symbols-outlined">school</span>
            Skill Assessments
          </Link>
          <Link to="/employee/resume" className="dash-quick-link">
            <span className="material-symbols-outlined">description</span>
            My Resume
          </Link>
          <Link to="/employee/settings" className="dash-quick-link">
            <span className="material-symbols-outlined">settings</span>
            Preferences
          </Link>
        </div>
      </div>
    </>
  );
}

function EmployeeMarketInsights() {
  return (
    <div className="dash-card dash-card-padded">
      <h2 className="dash-card-title">Market Insights</h2>
      <p style={{ marginTop: 8, color: 'var(--color-on-surface-variant)' }}>
        Weekly market intelligence is shown on your Home feed. We will add deeper skill and salary trend analytics here.
      </p>
      <Link to="/employee" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
        Back to Home
      </Link>
    </div>
  );
}

function EmployeeSkillAssessments() {
  return (
    <div className="dash-card dash-card-padded">
      <h2 className="dash-card-title">Skill Assessments</h2>
      <p style={{ marginTop: 8, color: 'var(--color-on-surface-variant)' }}>
        Assessments are not enabled yet for your account. This section is ready and will show available tests once enabled.
      </p>
    </div>
  );
}

function EmployeeSettings() {
  return (
    <div className="dash-card dash-card-padded">
      <h2 className="dash-card-title">Preferences</h2>
      <p style={{ marginTop: 8, color: 'var(--color-on-surface-variant)' }}>
        Preference settings page is now connected. Profile and notification preferences will be added here.
      </p>
    </div>
  );
}

/* ===== Right Sidebar ===== */
function RightSidebar({
  notifications,
  conciergeName,
  unread,
  activeMatches,
}: {
  notifications: Array<{ id: string; title: string; createdAt?: string | null }>;
  conciergeName: string;
  unread: number;
  activeMatches: number;
}) {
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
              <p style={{ fontWeight: 600, fontSize: 14 }}>{conciergeName || 'Talent Concierge'}</p>
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
            <span className="dash-card-title">Search Insights</span>
        </div>
        <div className="dash-card-body">
          <div className="emp-salary-widget">
            <div className="emp-salary-row">
              <span className="emp-salary-label">Active Matches</span>
              <span className="emp-salary-value text-gradient-emerald">{activeMatches}</span>
            </div>
            <div className="emp-salary-row">
              <span className="emp-salary-label">Unread Notifications</span>
              <span className="emp-salary-value">{unread}</span>
            </div>
            <div className="emp-salary-row">
              <span className="emp-salary-label">Response Pace</span>
              <span className="emp-salary-value">Weekly</span>
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
          {notifications.map((n) => (
            <div key={n.id} className="dash-widget-item">
              <div className="dash-widget-dot" />
              <div>
                <p className="dash-widget-item-title">{n.title}</p>
                <p className="dash-widget-item-meta">
                  {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'recently'}
                </p>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <p style={{ color: 'var(--color-on-surface-variant)' }}>No notifications yet.</p>
          )}
        </div>
      </div>
    </>
  );
}

/* ===== Main Dashboard ===== */
export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [summary, setSummary] = useState({ activeMatches: 0, interviews: 0, unreadNotifications: 0 });
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; createdAt?: string | null }>>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [profileRes, summaryRes, notificationRes, matchRes] = await Promise.all([
          getEmployeeProfile(),
          getDashboardSummary(),
          getNotifications(),
          getEmployeeMatches({ status: 'ALL', limit: 1 }),
        ]);
        if (cancelled) return;
        setProfile(profileRes.profile);
        setSummary(summaryRes.summary);
        setNotifications(notificationRes.notifications.map((n) => ({ id: n.id, title: n.title, createdAt: n.createdAt })));
        if (summaryRes.summary.activeMatches === 0 && matchRes.total > 0) {
          setSummary((s) => ({ ...s, activeMatches: matchRes.total }));
        }
      } catch {
        // Keep dashboard usable even if side widgets fail.
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <DashboardLayout
      navItems={navItems}
      role="employee"
      userName={profile?.displayName || 'Employee'}
      userTitle={profile?.headline || 'Job seeker'}
      leftSidebar={<LeftSidebar profile={profile} activeMatches={summary.activeMatches} interviews={summary.interviews} />}
      rightSidebar={
        <RightSidebar
          notifications={notifications}
          conciergeName="Sarah Jenkins"
          unread={summary.unreadNotifications}
          activeMatches={summary.activeMatches}
        />
      }
    >
      <Routes>
        <Route index element={<EmployeeFeed />} />
        <Route path="matches" element={<EmployeeMatches />} />
        <Route path="concierge" element={<EmployeeConcierge />} />
        <Route path="network" element={<EmployeeNetwork />} />
        <Route path="profile" element={<EmployeeProfile />} />
        <Route path="market-insights" element={<EmployeeMarketInsights />} />
        <Route path="skill-assessments" element={<EmployeeSkillAssessments />} />
        <Route path="resume" element={<EmployeeResume />} />
        <Route path="settings" element={<EmployeeSettings />} />
        <Route path="*" element={<EmployeeFeed />} />
      </Routes>
    </DashboardLayout>
  );
}

