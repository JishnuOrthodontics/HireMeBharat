import { Routes, Route, Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import EmployeeFeed from './EmployeeFeed';
import EmployeeMatches from './EmployeeMatches';
import EmployeeConcierge from './EmployeeConcierge';
import EmployeeNetwork from './EmployeeNetwork';
import EmployeeProfile from './EmployeeProfile';
import EmployeeResume from './EmployeeResume';
import EmployeeApplications from './EmployeeApplications';
import EmployeeOffers from './EmployeeOffers';
import EmployeeInterviews from './EmployeeInterviews';
import EmployeeFeedback from './EmployeeFeedback';
import { useEmployeeProfile, useEmployeeDashboardSummary, useNotifications, useEmployeeMatches, useConciergeMessages } from '../../hooks/useEmployeeQueries';
import { type EmployeeProfileApi } from '../../lib/employeeApi';
import BillingSettings from '../shared/BillingSettings';
import Pricing from '../shared/Pricing';
import JobSearch from '../jobs/JobSearch';
import JobDetails from '../jobs/JobDetails';
import './Employee.css';

const navItems = [
  { icon: 'home', label: 'Home', path: '/employee' },
  { icon: 'search', label: 'Jobs', path: '/employee/jobs' },
  { icon: 'work', label: 'Matches', path: '/employee/matches', badge: 5 },
  { icon: 'description', label: 'Applications', path: '/employee/applications' },
  { icon: 'support_agent', label: 'Concierge', path: '/employee/concierge', badge: 2 },
  { icon: 'group', label: 'Network', path: '/employee/network' },
];

/* ===== Left Sidebar ===== */
function LeftSidebar({
  profile,
  activeMatches,
  interviews,
  matchScore,
  savedCount,
}: {
  profile: EmployeeProfileApi | null | undefined;
  activeMatches: number;
  interviews: number;
  matchScore: number;
  savedCount: number;
}) {
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
              <div className="dash-profile-stat-value">{matchScore}%</div>
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
            <span className="dash-quick-link-badge">{savedCount}</span>
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
          <Link to="/employee/offers" className="dash-quick-link">
            <span className="material-symbols-outlined">card_giftcard</span>
            Job Offers
          </Link>
          <Link to="/employee/interviews" className="dash-quick-link">
            <span className="material-symbols-outlined">event</span>
            Interviews
          </Link>
          <Link to="/employee/feedback" className="dash-quick-link">
            <span className="material-symbols-outlined">rate_review</span>
            Feedback
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
  return <BillingSettings />;
}

/* ===== Right Sidebar ===== */
function RightSidebar({
  notifications,
  concierge,
  unread,
  activeMatches,
}: {
  notifications: Array<{ id: string; title: string; createdAt?: string | null }>;
  concierge: { name: string; title: string; initials: string; online: boolean };
  unread: number;
  activeMatches: number;
}) {
  return (
    <>
      {/* Concierge Widget */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Your Concierge</span>
          {concierge.online && <span className="emp-online-dot" />}
        </div>
        <div className="dash-card-body">
          <div className="emp-concierge-widget">
            <div className="emp-concierge-avatar">{concierge.initials || 'SJ'}</div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14 }}>{concierge.name || 'Talent Concierge'}</p>
              <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>{concierge.title || 'Senior Talent Concierge'}</p>
              <p className="emp-concierge-status">
                <span className="emp-online-dot" style={{ backgroundColor: concierge.online ? 'var(--color-success)' : 'var(--color-on-surface-variant)' }} /> {concierge.online ? 'Online now' : 'Away'}
              </p>
            </div>
          </div>
          <Link
            to="/employee/concierge"
            className="btn btn-primary"
            style={{
              width: '100%',
              marginTop: 12,
              fontSize: 13,
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              textDecoration: 'none',
              boxSizing: 'border-box'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
            Send Message
          </Link>
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
  const { data: profile } = useEmployeeProfile();
  const { data: summaryData } = useEmployeeDashboardSummary();
  const { data: notificationsData } = useNotifications();
  const { data: matchesRes } = useEmployeeMatches({ status: 'ALL', limit: 25 });
  const { data: savedMatchesRes } = useEmployeeMatches({ status: 'SAVED', limit: 1 });
  const { data: conciergeData } = useConciergeMessages();

  const summary = {
    activeMatches: summaryData?.activeMatches ?? matchesRes?.total ?? 0,
    interviews: summaryData?.interviews ?? 0,
    unreadNotifications: summaryData?.unreadNotifications ?? 0,
  };

  const notifications = (notificationsData ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    createdAt: n.createdAt,
  }));

  const topMatches = matchesRes?.matches || [];
  const matchScore = topMatches.length > 0 
    ? Math.round(topMatches.reduce((sum, m) => sum + m.score, 0) / topMatches.length)
    : 88;

  const savedCount = savedMatchesRes?.total ?? 0;

  const concierge = conciergeData?.concierge || {
    name: 'Sarah Jenkins',
    title: 'Senior Talent Concierge',
    initials: 'SJ',
    online: true,
  };

  return (
    <DashboardLayout
      navItems={navItems}
      role="employee"
      userName={profile?.displayName || 'Employee'}
      userTitle={profile?.headline || 'Job seeker'}
      leftSidebar={
        <LeftSidebar
          profile={profile}
          activeMatches={summary.activeMatches}
          interviews={summary.interviews}
          matchScore={matchScore}
          savedCount={savedCount}
        />
      }
      rightSidebar={
        <RightSidebar
          notifications={notifications}
          concierge={concierge}
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
        <Route path="applications" element={<EmployeeApplications />} />
        <Route path="offers" element={<EmployeeOffers />} />
        <Route path="interviews" element={<EmployeeInterviews />} />
        <Route path="feedback" element={<EmployeeFeedback />} />
        <Route path="settings" element={<EmployeeSettings />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="jobs" element={<JobSearch />} />
        <Route path="jobs/:id" element={<JobDetails />} />
        <Route path="*" element={<EmployeeFeed />} />
      </Routes>
    </DashboardLayout>
  );
}

