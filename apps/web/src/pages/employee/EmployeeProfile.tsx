export default function EmployeeProfile() {
  return (
    <>
      {/* Profile Header */}
      <div className="dash-card">
        <div className="emp-profile-banner">
          <div className="emp-profile-avatar-lg">AK</div>
        </div>
        <div className="emp-profile-info">
          <h1 className="emp-profile-name-lg">Alex Kumar</h1>
          <p className="emp-profile-headline">Senior Engineering Leader · Building high-impact engineering orgs</p>
          <p className="emp-profile-location">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
            San Francisco Bay Area · Open to relocation
          </p>
          <div className="emp-profile-actions">
            <button className="btn btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}>Edit Profile</button>
            <button className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 20px' }}>Share</button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="dash-card">
        <h2 className="emp-section-title">About</h2>
        <div className="dash-card-body">
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-on-surface)' }}>
            Engineering leader with 12+ years of experience building and scaling high-performance engineering teams. 
            Passionate about creating developer platforms that multiply team velocity, and fostering cultures where 
            engineers do the best work of their careers.
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-on-surface)', marginTop: 12 }}>
            Previously led Platform Engineering at Google (100+ engineers) and was founding Head of Engineering at 
            a Y Combinator startup (acquired). Deep expertise in distributed systems, ML infrastructure, and 
            organizational design.
          </p>
        </div>
      </div>

      {/* Experience */}
      <div className="dash-card">
        <h2 className="emp-section-title">Experience</h2>
        {[
          { logo: '🟢', title: 'Senior Staff Engineer / Platform Lead', company: 'Google', dates: 'Jan 2020 – Present · 5 yrs', desc: 'Leading a team of 100+ engineers building core developer platform infrastructure. Drove 40% reduction in deployment time across all teams.' },
          { logo: '🟡', title: 'Head of Engineering', company: 'Stripe', dates: 'Mar 2017 – Dec 2019 · 3 yrs', desc: 'Built and scaled the payments infrastructure team from 5 to 45 engineers. Led the company\'s first SOC2 compliance initiative.' },
          { logo: '🔵', title: 'Founding Engineer', company: 'DataSync (YC W15, acq.)', dates: 'Jun 2014 – Feb 2017 · 3 yrs', desc: 'First engineering hire. Built the entire data pipeline from scratch. Company was acquired by Salesforce.' },
        ].map((exp, i) => (
          <div key={i} className="emp-exp-item">
            <div className="emp-exp-logo">{exp.logo}</div>
            <div>
              <p className="emp-exp-title">{exp.title}</p>
              <p className="emp-exp-company">{exp.company}</p>
              <p className="emp-exp-dates">{exp.dates}</p>
              <p className="emp-exp-desc">{exp.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Skills */}
      <div className="dash-card">
        <h2 className="emp-section-title">Skills & Expertise</h2>
        <div className="emp-skills-grid">
          {[
            'Distributed Systems', 'Machine Learning', 'Team Leadership', 'System Design',
            'Kubernetes', 'Go', 'Python', 'TypeScript', 'Platform Engineering',
            'Technical Strategy', 'M&A Integration', 'Mentorship',
          ].map(skill => (
            <span key={skill} className="emp-skill-chip">{skill}</span>
          ))}
        </div>
      </div>

      {/* Education */}
      <div className="dash-card">
        <h2 className="emp-section-title">Education</h2>
        <div className="emp-exp-item">
          <div className="emp-exp-logo">🎓</div>
          <div>
            <p className="emp-exp-title">M.S. Computer Science</p>
            <p className="emp-exp-company">Stanford University</p>
            <p className="emp-exp-dates">2012 – 2014</p>
          </div>
        </div>
        <div className="emp-exp-item">
          <div className="emp-exp-logo">🎓</div>
          <div>
            <p className="emp-exp-title">B.S. Computer Science</p>
            <p className="emp-exp-company">UC Berkeley</p>
            <p className="emp-exp-dates">2008 – 2012</p>
          </div>
        </div>
      </div>
    </>
  );
}
