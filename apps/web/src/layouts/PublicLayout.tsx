import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import './PublicLayout.css';

export default function PublicLayout() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="public-layout">
      {/* Sticky Header */}
      <header className={`public-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container header-inner">
          <Link to="/" className="logo">
            <span className="material-symbols-outlined logo-icon">diamond</span>
            <span className="logo-text">ELITERECRUIT</span>
          </Link>

          <nav className="header-nav desktop-only">
            <a href="/#features" className="nav-link">Features</a>
            <a href="/#how-it-works" className="nav-link">How It Works</a>
            <a href="/#testimonials" className="nav-link">Testimonials</a>
          </nav>

          <div className="header-actions desktop-only">
            <Link to="/signin" className="btn btn-ghost">Sign In</Link>
            <Link to="/register" className="btn btn-primary">Register</Link>
          </div>

          <button className="mobile-menu-btn mobile-only" onClick={() => setMenuOpen(!menuOpen)}>
            <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="mobile-drawer">
          <nav className="mobile-nav">
            <a href="/#features" className="mobile-nav-link">Features</a>
            <a href="/#how-it-works" className="mobile-nav-link">How It Works</a>
            <a href="/#testimonials" className="mobile-nav-link">Testimonials</a>
            <div className="mobile-nav-divider" />
            <Link to="/signin" className="mobile-nav-link">Sign In</Link>
            <Link to="/register" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>Register</Link>
          </nav>
        </div>
      )}

      {/* Page Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="public-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="material-symbols-outlined logo-icon">diamond</span>
              <span className="logo-text">ELITERECRUIT</span>
            </div>
            <p className="footer-tagline">Premium concierge recruitment for visionary leaders.</p>
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <h4>Platform</h4>
              <a href="/#features">Features</a>
              <a href="/#how-it-works">How It Works</a>
              <Link to="/register">Get Started</Link>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Careers</a>
              <a href="#">Contact</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} HireMeBharat. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

