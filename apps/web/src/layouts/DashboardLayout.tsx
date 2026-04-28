import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './DashboardLayout.css';

interface NavItem {
  icon: string;
  label: string;
  path: string;
  badge?: number;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  leftSidebar?: React.ReactNode;
  rightSidebar?: React.ReactNode;
  navItems: NavItem[];
  role: 'employee' | 'employer' | 'admin';
  userName?: string;
  userTitle?: string;
  userAvatar?: string;
}

export default function DashboardLayout({
  children,
  leftSidebar,
  rightSidebar,
  navItems,
  role,
  userName = 'User',
  userTitle = '',
  userAvatar,
}: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayUsername = userProfile?.displayName || userName;
  const initials = displayUsername
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
  const settingsPath = role === 'employer' ? '/employer/profile' : `/${role}/settings`;
  const settingsLabel = role === 'employer' ? 'Edit Profile' : 'Settings';

  return (
    <div className="dashboard">
      {/* ===== TOP NAVIGATION BAR ===== */}
      <header className="dash-topnav">
        <div className="dash-topnav-inner">
          {/* Left: Logo + Search */}
          <div className="dash-topnav-left">
            <Link to={`/${role}`} className="dash-logo">
              <span className="material-symbols-outlined dash-logo-icon">diamond</span>
            </Link>
            <div className="dash-search">
              <span className="material-symbols-outlined dash-search-icon">search</span>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="dash-search-input"
              />
            </div>
          </div>

          {/* Center: Nav Items (Desktop) */}
          <nav className="dash-topnav-center desktop-nav">
            {navItems.map(item => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`dash-nav-item ${isActive ? 'active' : ''}`}
                >
                  <div className="dash-nav-icon-wrap">
                    <span className="material-symbols-outlined">{item.icon}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="dash-nav-badge">{item.badge > 9 ? '9+' : item.badge}</span>
                    )}
                  </div>
                  <span className="dash-nav-label">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Profile */}
          <div className="dash-topnav-right">
            <button className="dash-notification-btn desktop-nav">
              <span className="material-symbols-outlined">notifications</span>
              <span className="dash-nav-badge">3</span>
            </button>

            <div className="dash-profile-menu-wrap">
              <button
                className="dash-profile-btn"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              >
                {(userProfile?.photoURL || userAvatar) ? (
                  <img src={userProfile?.photoURL || userAvatar} alt={displayUsername} className="dash-profile-avatar" />
                ) : (
                  <div className="dash-profile-avatar-placeholder">{initials}</div>
                )}
                <span className="material-symbols-outlined dash-profile-caret">expand_more</span>
              </button>

              {profileMenuOpen && (
                <>
                  <div className="dash-profile-backdrop" onClick={() => setProfileMenuOpen(false)} />
                  <div className="dash-profile-dropdown glass-card">
                    <div className="dash-profile-dropdown-header">
                      <div className="dash-profile-avatar-placeholder large">{initials}</div>
                      <div>
                        <p className="dash-profile-name">{displayUsername}</p>
                        <p className="dash-profile-title">{userTitle || userProfile?.role}</p>
                      </div>
                    </div>
                    <Link to={`/${role}/profile`} className="dash-dropdown-item" onClick={() => setProfileMenuOpen(false)}>
                      <span className="material-symbols-outlined">person</span>
                      View Profile
                    </Link>
                    <Link to={settingsPath} className="dash-dropdown-item" onClick={() => setProfileMenuOpen(false)}>
                      <span className="material-symbols-outlined">settings</span>
                      {settingsLabel}
                    </Link>
                    <div className="dash-dropdown-divider" />
                    <button className="dash-dropdown-item" onClick={async () => {
                      setProfileMenuOpen(false);
                      await signOut();
                      navigate('/', { replace: true });
                    }}>
                      <span className="material-symbols-outlined">logout</span>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button className="dash-mobile-btn mobile-nav" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="dash-mobile-drawer">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`dash-mobile-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="dash-mobile-badge">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className="dash-body">
        <div className="dash-body-inner">
          {/* Left Sidebar */}
          {leftSidebar && (
            <aside className="dash-sidebar-left">{leftSidebar}</aside>
          )}

          {/* Center Content */}
          <main className="dash-main">{children}</main>

          {/* Right Sidebar */}
          {rightSidebar && (
            <aside className="dash-sidebar-right">{rightSidebar}</aside>
          )}
        </div>
      </div>
    </div>
  );
}

