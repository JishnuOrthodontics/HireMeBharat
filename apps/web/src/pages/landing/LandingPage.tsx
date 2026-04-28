import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

/* ============================================================
   Animated Counter Component
   ============================================================ */
function AnimatedCounter({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = 0;
          const startTime = performance.now();

          function animate(now: number) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(start + (end - start) * eased));
            if (progress < 1) requestAnimationFrame(animate);
          }
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <div ref={ref} className="stat-number text-display">{count.toLocaleString()}{suffix}</div>;
}

/* ============================================================
   Landing Page
   ============================================================ */
export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* ===== HERO SECTION ===== */}
      <section className="hero-section">
        <div className="hero-bg-effects">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
          <div className="hero-grid" />
        </div>

        <div className="container hero-content">
          <div className="hero-badge">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
            AI-Powered Concierge Recruitment
          </div>

          <h1 className="text-hero">
            Your Career,<br />
            <span className="text-gradient-emerald">Curated.</span>
          </h1>

          <p className="text-hero-sub hero-subtitle">
            The premium recruitment platform where AI precision meets human intuition.
            Connecting elite talent with visionary companies through personalized concierge service.
          </p>

          <div className="hero-ctas">
            <Link to="/register?role=employee" className="hero-cta-card glass-card glass-card-hover">
              <span className="material-symbols-outlined cta-icon emerald-icon">person_search</span>
              <h3 className="text-h3">I'm Looking</h3>
              <p className="text-caption">Find your next executive role with a dedicated concierge</p>
              <span className="cta-arrow">
                <span className="material-symbols-outlined">arrow_forward</span>
              </span>
            </Link>

            <Link to="/register?role=employer" className="hero-cta-card glass-card glass-card-hover">
              <span className="material-symbols-outlined cta-icon gold-icon">business_center</span>
              <h3 className="text-h3">I'm Hiring</h3>
              <p className="text-caption">Access curated, AI-matched candidates for critical roles</p>
              <span className="cta-arrow gold">
                <span className="material-symbols-outlined">arrow_forward</span>
              </span>
            </Link>
          </div>

          <div className="hero-trust">
            <span className="text-caption" style={{ color: 'var(--color-on-surface-variant)' }}>Trusted by teams at</span>
            <div className="trust-logos">
              {['Google', 'Meta', 'Stripe', 'Coinbase', 'Figma'].map(name => (
                <span key={name} className="trust-logo">{name}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOR EMPLOYEES ===== */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-header">
            <span className="section-badge chip-emerald">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
              For Job Seekers
            </span>
            <h2 className="text-h1">Your career deserves a <span className="text-gradient-emerald">concierge</span></h2>
            <p className="text-body-lg section-subtitle">Stop scrolling job boards. Get curated, AI-matched executive opportunities delivered by your personal talent concierge.</p>
          </div>

          <div className="features-grid">
            {[
              { icon: 'auto_awesome', title: 'AI-Matched Roles', desc: 'Our proprietary matching engine analyzes 200+ data points to surface roles that truly fit your trajectory, not just your resume keywords.' },
              { icon: 'support_agent', title: 'Personal Concierge', desc: 'A dedicated senior recruiter manages your entire search. From portfolio positioning to salary negotiation — they handle it all.' },
              { icon: 'query_stats', title: 'Market Intelligence', desc: 'Real-time compensation benchmarks, industry trends, and company insider intelligence — all curated for your specific market position.' },
            ].map((f, i) => (
              <div key={i} className="feature-card glass-card glass-card-hover" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="feature-icon-wrap emerald">
                  <span className="material-symbols-outlined">{f.icon}</span>
                </div>
                <h3 className="text-h3">{f.title}</h3>
                <p className="text-body-md" style={{ color: 'var(--color-on-surface-variant)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOR EMPLOYERS ===== */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <span className="section-badge chip-gold">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>business</span>
              For Employers
            </span>
            <h2 className="text-h1">Hiring reimagined with <span className="text-gradient-gold">precision</span></h2>
            <p className="text-body-lg section-subtitle">Stop sifting through hundreds of unqualified applicants. Receive pre-vetted, culturally-aligned candidates curated by AI and human experts.</p>
          </div>

          <div className="features-grid">
            {[
              { icon: 'groups', title: 'Curated Candidates', desc: 'Every candidate is pre-screened, skill-verified, and motivation-assessed before reaching your dashboard. Zero noise, pure signal.' },
              { icon: 'handshake', title: 'Concierge Recruitment', desc: 'Your dedicated account manager orchestrates the entire hiring pipeline — from intake brief to offer acceptance.' },
              { icon: 'psychology', title: 'Cultural Fit AI', desc: 'Beyond skills matching — our AI evaluates work style, leadership philosophy, and team dynamics compatibility.' },
            ].map((f, i) => (
              <div key={i} className="feature-card glass-card glass-card-hover" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="feature-icon-wrap gold">
                  <span className="material-symbols-outlined">{f.icon}</span>
                </div>
                <h3 className="text-h3">{f.title}</h3>
                <p className="text-body-md" style={{ color: 'var(--color-on-surface-variant)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="section" id="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2 className="text-h1">How it <span className="text-gradient-emerald">works</span></h2>
            <p className="text-body-lg section-subtitle">Three simple steps to transform your recruitment experience.</p>
          </div>

          <div className="steps-grid">
            {[
              { num: '01', title: 'Create Your Profile', desc: 'Tell us about your experience, aspirations, and what matters most. Our AI builds a comprehensive digital dossier.', icon: 'edit_note' },
              { num: '02', title: 'AI Matching', desc: 'Our engine processes thousands of opportunities or candidates, scoring each match on 200+ weighted criteria.', icon: 'auto_awesome' },
              { num: '03', title: 'Concierge Intro', desc: 'Your dedicated concierge reviews the top matches, adds human insight, and orchestrates warm introductions.', icon: 'rocket_launch' },
            ].map((s, i) => (
              <div key={i} className="step-card">
                <div className="step-num text-gradient-emerald">{s.num}</div>
                <div className="step-icon-wrap">
                  <span className="material-symbols-outlined">{s.icon}</span>
                </div>
                <h3 className="text-h3">{s.title}</h3>
                <p className="text-body-md" style={{ color: 'var(--color-on-surface-variant)' }}>{s.desc}</p>
                {i < 2 && <div className="step-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="section section-alt">
        <div className="container">
          <div className="stats-grid">
            {[
              { value: 2400, suffix: '+', label: 'Successful Placements' },
              { value: 98, suffix: '%', label: 'Client Satisfaction' },
              { value: 500, suffix: '+', label: 'Partner Companies' },
              { value: 72, suffix: 'hr', label: 'Average Match Time' },
            ].map((s, i) => (
              <div key={i} className="stat-card glass-card">
                <AnimatedCounter end={s.value} suffix={s.suffix} />
                <p className="stat-label text-label-caps">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="section" id="testimonials">
        <div className="container">
          <div className="section-header">
            <h2 className="text-h1">What our <span className="text-gradient-emerald">clients</span> say</h2>
          </div>

          <div className="testimonials-grid">
            {[
              { quote: "HireMeBharat found me a VP role at a Series C startup that perfectly aligned with my transition goals. The concierge service was extraordinary.", name: "Sarah M.", role: "VP Engineering", type: "Employee" },
              { quote: "We filled three critical C-suite positions in under 6 weeks. The AI matching quality saved us months of traditional headhunting.", name: "James K.", role: "CEO, TechVentures", type: "Employer" },
              { quote: "The market intelligence alone is worth it. I knew my exact market value and negotiated a 30% increase with confidence.", name: "Priya D.", role: "Head of Product", type: "Employee" },
            ].map((t, i) => (
              <div key={i} className="testimonial-card glass-card">
                <div className="testimonial-stars">{'★'.repeat(5)}</div>
                <p className="text-body-md testimonial-quote">"{t.quote}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.name[0]}</div>
                  <div>
                    <p className="text-h3" style={{ fontSize: 16 }}>{t.name}</p>
                    <p className="text-caption" style={{ color: 'var(--color-on-surface-variant)' }}>{t.role} · {t.type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="cta-section">
        <div className="container cta-content">
          <h2 className="text-hero" style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}>
            Ready to transform<br />your <span className="text-gradient-emerald">recruitment?</span>
          </h2>
          <p className="text-body-lg" style={{ color: 'var(--color-on-surface-variant)', maxWidth: 560, margin: '0 auto' }}>
            Join thousands of executives and companies who've already elevated their hiring experience.
          </p>
          <div className="cta-buttons">
            <Link to="/register" className="btn btn-primary btn-lg">Get Started Free</Link>
            <a href="#features" className="btn btn-secondary btn-lg">Learn More</a>
          </div>
        </div>
      </section>
    </div>
  );
}

