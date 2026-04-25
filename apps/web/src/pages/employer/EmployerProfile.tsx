export default function EmployerProfile() {
  return (
    <>
      {/* Company Header */}
      <div className="dash-card">
        <div className="empr-profile-banner">
          <div className="empr-profile-logo">TV</div>
        </div>
        <div className="empr-profile-info">
          <h1 className="empr-company-name">TechVentures Inc.</h1>
          <p className="empr-company-tagline">Building the future of intelligent automation</p>
          <div className="empr-company-meta">
            <span className="empr-company-meta-item">
              <span className="material-symbols-outlined">apartment</span>
              AI / Machine Learning
            </span>
            <span className="empr-company-meta-item">
              <span className="material-symbols-outlined">groups</span>
              450 employees
            </span>
            <span className="empr-company-meta-item">
              <span className="material-symbols-outlined">location_on</span>
              San Francisco, CA
            </span>
            <span className="empr-company-meta-item">
              <span className="material-symbols-outlined">rocket_launch</span>
              Series C · $180M raised
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-gold" style={{ fontSize: 13, padding: '8px 20px' }}>Edit Company</button>
            <button className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 20px' }}>Share Page</button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="dash-card">
        <h2 className="emp-section-title">About TechVentures</h2>
        <div className="dash-card-body">
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-on-surface)' }}>
            TechVentures is a leading AI company building next-generation intelligent automation solutions. 
            Founded in 2019, we've grown from a 5-person team to 450+ employees across 4 offices globally. 
            Our platform processes over 2 billion transactions daily for Fortune 500 enterprises.
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-on-surface)', marginTop: 12 }}>
            We're backed by top-tier investors and are on track for an IPO in 2027. We believe in building 
            diverse, world-class engineering teams and offer industry-leading compensation and benefits.
          </p>
        </div>
      </div>

      {/* Open Roles */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Open Positions</span>
          <span style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>6 active roles</span>
        </div>
        {[
          { title: 'VP of Product Engineering', dept: 'Engineering', location: 'San Francisco · Hybrid', candidates: 12 },
          { title: 'Head of AI/ML', dept: 'AI Research', location: 'New York · Remote', candidates: 8 },
          { title: 'Director of Engineering', dept: 'Platform', location: 'Seattle · Hybrid', candidates: 6 },
          { title: 'Senior Architect', dept: 'Infrastructure', location: 'Remote (US)', candidates: 4 },
        ].map((role, i) => (
          <div key={i} className="empr-req-card">
            <div className="empr-req-icon">
              <span className="material-symbols-outlined">work</span>
            </div>
            <div className="empr-req-info">
              <p className="empr-req-title">{role.title}</p>
              <div className="empr-req-meta">
                <span className="empr-req-meta-item">
                  <span className="material-symbols-outlined">apartment</span>
                  {role.dept}
                </span>
                <span className="empr-req-meta-item">
                  <span className="material-symbols-outlined">location_on</span>
                  {role.location}
                </span>
              </div>
            </div>
            <span className="empr-req-stage-chip has-count">{role.candidates} candidates</span>
          </div>
        ))}
      </div>

      {/* Culture */}
      <div className="dash-card">
        <h2 className="emp-section-title">Culture & Benefits</h2>
        <div className="dash-card-body">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              '🏠 Remote-friendly', '📈 Equity for all', '🏥 Premium healthcare',
              '🏖️ Unlimited PTO', '📚 $5k learning budget', '🎯 Quarterly offsites',
              '👶 16 weeks parental leave', '🏋️ Wellness stipend', '🍽️ Catered lunches',
            ].map(b => (
              <span key={b} className="emp-match-tag" style={{ padding: '6px 14px', fontSize: 13 }}>{b}</span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
