import { useEffect, useRef, useState } from 'react';
import './AboutPage.css';

/* ============================================================
   Animated Counter Component
   ============================================================ */
function StatCounter({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
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

  return <div ref={ref} className="about-stat-number text-display">{count.toLocaleString()}{suffix}</div>;
}

export default function AboutPage() {
  return (
    <div className="about-page">
      {/* Background Liquid Blurs */}
      <div className="about-bg-effects">
        <div className="about-orb about-orb-1" />
        <div className="about-orb about-orb-2" />
        <div className="about-orb about-orb-3" />
        <div className="about-grid" />
      </div>

      <div className="container about-container">
        {/* ===== HERO SECTION ===== */}
        <section className="about-hero">
          <div className="about-hero-badge">
            <span className="about-badge-dot" />
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>diamond</span>
            Our Journey & Philosophy
          </div>

          <p className="about-motto-text text-gradient-gold">
            Life changes from now, Right place for dreaming high
          </p>

          <h1 className="text-hero text-glow-hero" style={{ marginTop: 12 }}>
            Curating Elite Careers in <span className="text-gradient-emerald">Bharat.</span>
          </h1>

          <p className="text-hero-sub about-hero-subtitle">
            HireMeBharat is not just another job portal or resume-parsing algorithm. We are a premium executive talent concierge that leverages AI precision and human expert guidance to connect elite leadership with visionary companies.
          </p>
        </section>

        {/* ===== MISSION & VISION ===== */}
        <section className="about-mission-section">
          <div className="about-mission-grid">
            <div className="mission-card glass-card">
              <span className="material-symbols-outlined mission-icon emerald">visibility</span>
              <h3 className="text-h3">Our Vision</h3>
              <p className="text-body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
                To redefine executive hiring across India by transitioning from transactional resume matching to deep relationship curation. We believe high-potential leaders deserve a bespoke search partner that truly understands their career trajectory.
              </p>
            </div>

            <div className="mission-card glass-card">
              <span className="material-symbols-outlined mission-icon gold">rocket_launch</span>
              <h3 className="text-h3">Our Mission</h3>
              <p className="text-body-md" style={{ color: 'var(--color-on-surface-variant)' }}>
                To empower companies in India's booming metropolitan tech hubs (Bangalore, Mumbai, Pune, Delhi NCR) with high-signal, zero-noise talent pipelines. We screen, vet, and align matches based on both skill sets and leadership philosophy.
              </p>
            </div>
          </div>
        </section>

        {/* ===== THE CONCIERGE ADVANTAGE ===== */}
        <section className="about-advantage-section">
          <div className="section-header">
            <span className="section-badge chip-emerald">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>award_star</span>
              Concierge Advantage
            </span>
            <h2 className="text-h1">Why we are <span className="text-gradient-emerald">different</span></h2>
            <p className="text-body-lg section-subtitle" style={{ maxWidth: 600, margin: '8px auto 0' }}>
              Unlike automated crawlers that flood recruiters with unqualified resumes, our private talent concierge handles the pipeline end-to-end.
            </p>
          </div>

          <div className="advantage-grid">
            {[
              {
                icon: 'psychology',
                title: 'High-Fidelity Matching',
                desc: 'Our proprietary engine scores matches across 200+ distinct parameters—spanning skills, years of experience, expectations, and cultural compatibility.'
              },
              {
                icon: 'shield_person',
                title: 'Vetted & Verified Profiles',
                desc: 'We verify every elite candidate profile and conduct behavioral compatibility briefs before any introductory meeting is scheduled.'
              },
              {
                icon: 'handshake',
                title: 'Concierge Escrow Service',
                desc: 'A dedicated, seasoned talent manager orchestrates the entire onboarding and interview pipeline, giving both sides absolute peace of mind.'
              }
            ].map((adv, idx) => (
              <div key={idx} className="advantage-card glass-card glass-card-hover">
                <div className="advantage-icon-wrap">
                  <span className="material-symbols-outlined">{adv.icon}</span>
                </div>
                <h3 className="text-h3">{adv.title}</h3>
                <p className="text-body-md" style={{ color: 'var(--color-on-surface-variant)' }}>{adv.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== STATS OVERVIEW ===== */}
        <section className="about-stats-section glass-card">
          <div className="about-stats-grid">
            <div className="about-stat-item">
              <StatCounter end={98} suffix="%" />
              <p className="about-stat-label text-label-caps">Client Retention Rate</p>
            </div>
            <div className="about-stat-item">
              <StatCounter end={2400} suffix="+" />
              <p className="about-stat-label text-label-caps">C-Suite Placements</p>
            </div>
            <div className="about-stat-item">
              <StatCounter end={30} suffix="L+" />
              <p className="about-stat-label text-label-caps">Avg Placement Package</p>
            </div>
            <div className="about-stat-item">
              <StatCounter end={12} suffix=" Days" />
              <p className="about-stat-label text-label-caps">Average Matching Speed</p>
            </div>
          </div>
        </section>

        {/* ===== MANAGEMENT ===== */}
        <section className="about-team-section about-management-section">
          <div className="section-header">
            <span className="section-badge chip-gold">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>corporate_fare</span>
              Our Management
            </span>
            <h2 className="text-h1">Leadership at <span className="text-gradient-gold">SYMA</span></h2>
            <p className="text-body-lg section-subtitle" style={{ maxWidth: 640, margin: '8px auto 0' }}>
              A family legacy in handicrafts, strengthened by professional HR and legal excellence.
            </p>
          </div>

          <div className="management-story glass-card">
            <p className="text-body-md management-story-lead">
              Mr. Syam Prasad G., an MBA graduate and son of Mr. Gangadharan, carries forward a lifetime of handicraft mastery.
              Mr. Gangadharan&apos;s experience in handicrafts is invaluable—he has spent his whole life nurturing this art form.
              Not only his sons, but many artisans trained under him have grown into self-entrepreneurs in this field.
            </p>
            <p className="text-body-md" style={{ color: 'var(--color-on-surface-variant)', marginTop: 16 }}>
              As a deep respect to his knowledge and to preserve it forever, Mr. Syam Prasad, along with his wife Adv. Maliny Syam,
              started <strong>SYMA Handicrafts &amp; Handlooms</strong>. It has been a family business for years, and both endeavour to
              reach new heights under the brand <strong>SYMA</strong>. Mr. Syam Prasad has been in the handicrafts business since he was
              15 years old and is a registered artisan under the Office of the Development Commissioner (Handicrafts), Government of India.
              With decades of corporate management experience, he brings professionalism to every attribute of the business.
              Adv. Maliny Syam—HR professional and advocate—stands beside him as partner in business and in vision.
            </p>
            <p className="text-body-md" style={{ color: 'var(--color-on-surface-variant)', marginTop: 16 }}>
              Through <strong>SYMA HR Services</strong>, the organization delivers perfection across every aspect of the HR domain.
              Legal proficiency ensures counsel at its best. Together, management and team do their best—and deliver the best.
              HireMeBharat extends that same commitment to elite talent and career curation across Bharat.
            </p>
          </div>

          <div className="team-grid">
            {[
              {
                name: 'Mr. Syam Prasad G.',
                role: 'Founder & Managing Partner',
                bio: 'MBA graduate and registered artisan (Government of India). In handicrafts since age 15, with decades of corporate management experience shaping every facet of SYMA Handicrafts & Handlooms.',
                avatarColor: 'var(--color-primary-gradient-start)',
                initial: 'SP',
              },
              {
                name: 'Adv. Maliny Syam',
                role: 'Co-Founder · HR & Legal Lead',
                bio: 'Advocate with MBA (HR), M.Sc. (Psychology), and LLB. Pioneer in building complete HR domains; ex-ITC and ex-Robert Bosch/MICO. Leads SYMA HR Services and legal excellence.',
                avatarColor: 'var(--color-secondary-gradient-start)',
                initial: 'MS',
              },
            ].map((member, idx) => (
              <div key={idx} className="team-card glass-card glass-card-hover">
                <div className="team-card-inner">
                  <div className="team-avatar" style={{ background: member.avatarColor }}>
                    {member.initial}
                  </div>
                  <h3 className="text-h3" style={{ marginTop: 20 }}>{member.name}</h3>
                  <p className="team-role text-gradient-gold">{member.role}</p>
                  <p className="team-bio text-body-sm" style={{ color: 'var(--color-on-surface-variant)', marginTop: 12 }}>
                    {member.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== OUR TEAM ===== */}
        <section className="about-team-section">
          <div className="section-header">
            <span className="section-badge chip-emerald">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>groups</span>
              Our Team
            </span>
            <h2 className="text-h1">The people who <span className="text-gradient-emerald">deliver</span></h2>
            <p className="text-body-lg section-subtitle" style={{ maxWidth: 520, margin: '8px auto 0' }}>
              Dedicated specialists across retail, finance, and customer experience.
            </p>
          </div>

          <div className="team-grid">
            {[
              {
                name: 'Mr. P.V. Mohan',
                role: 'Business & Artwork Guide',
                bio: 'With immense knowledge and experience in business and artwork, the guiding force behind SYMA Handicrafts & Handlooms. His commitment to SYMA is commendable—customers find the right product in stores headed by his leadership.',
                avatarColor: '#a78bfa',
                initial: 'PM',
              },
              {
                name: 'Mr. Madhan Kumar M.',
                role: 'Head, SYMA Accounting Services',
                bio: 'Accounting and finance are the backbone of any organization. Budgeting and managing cash flow decide survival and future growth. His unmatched accounting skills and broad experience fulfill diverse client needs.',
                avatarColor: '#38bdf8',
                initial: 'MK',
              },
            ].map((member, idx) => (
              <div key={idx} className="team-card glass-card glass-card-hover">
                <div className="team-card-inner">
                  <div className="team-avatar" style={{ background: member.avatarColor }}>
                    {member.initial}
                  </div>
                  <h3 className="text-h3" style={{ marginTop: 20 }}>{member.name}</h3>
                  <p className="team-role text-gradient-gold">{member.role}</p>
                  <p className="team-bio text-body-sm" style={{ color: 'var(--color-on-surface-variant)', marginTop: 12 }}>
                    {member.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
