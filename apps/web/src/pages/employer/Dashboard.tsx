import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import EmployerFeed from './EmployerFeed';
import EmployerRequisitions from './EmployerRequisitions';
import EmployerCandidates from './EmployerCandidates';
import EmployerProfile from './EmployerProfile';
import {
  getEmployerDashboardSummary,
  getEmployerProfile,
  type EmployerProfileApi,
  type EmployerSummaryApi,
} from '../../lib/employerApi';
import './Employer.css';

const navItems = [
  { icon: 'home', label: 'Home', path: '/employer' },
  { icon: 'work', label: 'Requisitions', path: '/employer/requisitions', badge: 2 },
  { icon: 'groups', label: 'Candidates', path: '/employer/candidates', badge: 8 },
  { icon: 'mail', label: 'Messages', path: '/employer/messages', badge: 1 },
  { icon: 'analytics', label: 'Analytics', path: '/employer/analytics' },
];

/* ===== Left Sidebar ===== */
function LeftSidebar({ profile, summary }: { profile: EmployerProfileApi | null; summary: EmployerSummaryApi | null }) {
  const initials = useMemo(
    () => (profile?.companyName || 'Employer').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase(),
    [profile]
  );
  return (
    <>
      {/* Company Card */}
      <div className="dash-card dash-profile-card">
        <div className="dash-profile-banner" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(80,250,123,0.12))' }} />
        <div className="dash-profile-card-body">
          {profile?.logoUrl ? (
            <img
              src={profile.logoUrl}
              alt={profile.companyName}
              className="dash-profile-card-avatar"
              style={{ objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }}
            />
          ) : (
            <div className="dash-profile-card-avatar" style={{ background: 'linear-gradient(135deg, var(--color-secondary), #f0d060)', color: '#1a1a2e' }}>{initials}</div>
          )}
          <p className="dash-profile-card-name">{profile?.companyName || 'Employer Company'}</p>
          <p className="dash-profile-card-headline">
            {profile ? `${profile.fundingStage} · ${profile.industry} · ${profile.companySize} employees` : 'Loading company profile...'}
          </p>
          <div className="dash-profile-stats">
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value" style={{ color: 'var(--color-secondary)' }}>{summary?.openRoles ?? 0}</div>
              <div className="dash-profile-stat-label">Open Roles</div>
            </div>
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value" style={{ color: 'var(--color-secondary)' }}>{summary?.inPipeline ?? 0}</div>
              <div className="dash-profile-stat-label">In Pipeline</div>
            </div>
            <div className="dash-profile-stat">
              <div className="dash-profile-stat-value" style={{ color: 'var(--color-secondary)' }}>{summary?.hired ?? 0}</div>
              <div className="dash-profile-stat-label">Hired</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dash-card">
        <div className="dash-quick-links">
          <Link to="/employer/requisitions" className="dash-quick-link">
            <span className="material-symbols-outlined">add_circle</span>
            Post a New Role
          </Link>
          <Link to="/employer/requisitions?status=DRAFT" className="dash-quick-link">
            <span className="material-symbols-outlined">description</span>
            Job Templates
          </Link>
          <Link to="/employer/candidates?stage=INTERVIEW" className="dash-quick-link">
            <span className="material-symbols-outlined">calendar_today</span>
            Interviews
            <span className="dash-quick-link-badge">{summary?.upcomingInterviews?.length ?? 0}</span>
          </Link>
          <Link to="/employer/messages" className="dash-quick-link">
            <span className="material-symbols-outlined">support_agent</span>
            Account Manager
          </Link>
        </div>
      </div>
    </>
  );
}

/* ===== Right Sidebar ===== */
function RightSidebar({ summary }: { summary: EmployerSummaryApi | null }) {
  const stageRows = [
    { stage: 'SOURCED', label: 'Sourced', color: 'var(--color-on-surface-variant)' },
    { stage: 'SCREENING', label: 'Screening', color: 'var(--color-secondary)' },
    { stage: 'INTERVIEW', label: 'Interview', color: 'var(--color-primary-container)' },
    { stage: 'OFFER', label: 'Offer', color: '#69ff88' },
    { stage: 'HIRED', label: 'Hired', color: 'white' },
  ] as const;
  const maxByStage = Math.max(1, ...(stageRows.map((s) => summary?.byStage?.[s.stage] || 0)));
  return (
    <>
      {/* Hiring Pipeline */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Pipeline Overview</span>
        </div>
        <div className="dash-card-body">
          <div className="empr-pipeline-widget">
            {stageRows.map((s) => (
              <div key={s.stage} className="empr-pipeline-row">
                <span className="empr-pipeline-stage">{s.label}</span>
                <div className="empr-pipeline-bar-track">
                  <div className="empr-pipeline-bar" style={{ width: `${((summary?.byStage?.[s.stage] || 0) / maxByStage) * 100}%`, background: s.color }} />
                </div>
                <span className="empr-pipeline-count">{summary?.byStage?.[s.stage] || 0}</span>
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
          <Link to="/employer/candidates?stage=INTERVIEW" className="dash-card-action">View all</Link>
        </div>
        <div className="dash-widget-list">
          {(summary?.upcomingInterviews || []).map((int) => (
            <div key={int.id} className="dash-widget-item">
              <div className="dash-widget-dot gold" />
              <div>
                <p className="dash-widget-item-title">{int.candidate} · {int.role}</p>
                <p className="dash-widget-item-meta">
                  {int.scheduledAt ? new Date(int.scheduledAt).toLocaleString() : 'scheduled'} · {int.type}
                </p>
              </div>
            </div>
          ))}
          {(summary?.upcomingInterviews || []).length === 0 && (
            <p style={{ color: 'var(--color-on-surface-variant)' }}>No interviews scheduled.</p>
          )}
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
              <span className="empr-stat-mini-value">{summary?.avgMatchScore ?? 0}%</span>
              <span className="empr-stat-mini-label">Avg Match Score</span>
            </div>
            <div className="empr-stat-mini">
              <span className="empr-stat-mini-value">{summary?.timeToShortlistDays ?? 0}d</span>
              <span className="empr-stat-mini-label">Time to Shortlist</span>
            </div>
            <div className="empr-stat-mini">
              <span className="empr-stat-mini-value">{summary?.costPerHire ?? '$0'}</span>
              <span className="empr-stat-mini-label">Cost per Hire</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="dash-card dash-card-padded">
      <h2 className="dash-card-title">{title}</h2>
      <p style={{ marginTop: 8, color: 'var(--color-on-surface-variant)' }}>
        This section is planned for the next release. Core hiring workflows are now fully functional.
      </p>
    </div>
  );
}

/* ===== Main Dashboard ===== */
export default function Dashboard() {
  const [profile, setProfile] = useState<EmployerProfileApi | null>(null);
  const [summary, setSummary] = useState<EmployerSummaryApi | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [p, s] = await Promise.all([getEmployerProfile(), getEmployerDashboardSummary()]);
        if (cancelled) return;
        setProfile(p.profile);
        setSummary(s.summary);
      } catch {
        // Keep the dashboard usable even if sidebar data fails.
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <DashboardLayout
      navItems={navItems}
      role="employer"
      userName={profile?.companyName || 'Employer'}
      userTitle={profile?.tagline || 'Hiring Team'}
      leftSidebar={<LeftSidebar profile={profile} summary={summary} />}
      rightSidebar={<RightSidebar summary={summary} />}
    >
      <Routes>
        <Route index element={<EmployerFeed />} />
        <Route path="requisitions" element={<EmployerRequisitions />} />
        <Route path="candidates" element={<EmployerCandidates />} />
        <Route path="messages" element={<ComingSoon title="Messages" />} />
        <Route path="analytics" element={<ComingSoon title="Analytics" />} />
        <Route path="profile" element={<EmployerProfile />} />
        <Route path="settings" element={<Navigate to="/employer/profile" replace />} />
        <Route path="*" element={<EmployerFeed />} />
      </Routes>
    </DashboardLayout>
  );
}

