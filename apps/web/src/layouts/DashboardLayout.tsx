import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoleNotifications } from '../hooks/useRoleNotifications';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useQueryClient } from '@tanstack/react-query';
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { notifications, unreadCount, markRead, markAllRead } = useRoleNotifications();
  const { subscribe } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = subscribe('notification', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', role] });
      if (role === 'employee') {
        queryClient.invalidateQueries({ queryKey: ['employee', 'dashboardSummary'] });
      }
    });
    return () => unsubscribe();
  }, [subscribe, queryClient, role]);

  const formatTime = (createdAt?: string | null): string => {
    if (!createdAt) return '';
    const now = new Date();
    const date = new Date(createdAt);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

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
            <div className="dash-notification-menu-wrap">
              <button
                className={`dash-notification-btn desktop-nav ${notificationsOpen ? 'active' : ''}`}
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileMenuOpen(false);
                }}
              >
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                  <span className="dash-nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div className="dash-profile-backdrop" onClick={() => setNotificationsOpen(false)} />
                  <div className="dash-notifications-dropdown glass-card animate-fade-in">
                    <div className="dash-notifications-header">
                      <h3 className="dash-notifications-title">Notifications</h3>
                      {unreadCount > 0 && (
                        <button className="dash-notifications-clear-btn" onClick={() => markAllRead()}>
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="dash-notifications-list">
                      {notifications.length === 0 ? (
                        <div className="dash-notifications-empty">
                          <span className="material-symbols-outlined empty-icon">notifications_off</span>
                          <p className="empty-text">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((n) => {
                          let iconName = 'info';
                          if (n.type === 'JOB_APPLICATION') iconName = 'work';
                          if (n.type === 'MESSAGE' || n.type === 'CONCIERGE') iconName = 'chat';
                          if (n.type === 'MATCH') iconName = 'handshake';
                          if (n.type === 'OFFER') iconName = 'assignment_turned_in';
                          if (n.type === 'INTERVIEW') iconName = 'calendar_month';

                          return (
                            <div
                              key={n.id}
                              className={`dash-notification-item ${!n.read ? 'unread' : ''}`}
                              onClick={() => {
                                if (!n.read) markRead(n.id);
                              }}
                            >
                              <div className="notification-icon-wrap">
                                <span className="material-symbols-outlined">{iconName}</span>
                              </div>
                              <div className="notification-content-wrap">
                                <p className="notification-title">{n.title}</p>
                                <p className="notification-desc">{n.content}</p>
                                {n.createdAt && (
                                  <span className="notification-time">
                                    {formatTime(n.createdAt)}
                                  </span>
                                )}
                              </div>
                              {!n.read && <span className="notification-unread-dot" />}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="dash-profile-menu-wrap">
              <button
                className="dash-profile-btn"
                onClick={() => {
                  setProfileMenuOpen(!profileMenuOpen);
                  setNotificationsOpen(false);
                }}
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

