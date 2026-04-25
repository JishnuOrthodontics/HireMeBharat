export default function EmployerFeed() {
  return (
    <>
      {/* Post a Job */}
      <div className="dash-card">
        <div className="empr-post-job-card">
          <div className="dash-profile-avatar-placeholder" style={{ background: 'linear-gradient(135deg, var(--color-secondary), #f0d060)', color: '#1a1a2e', width: 40, height: 40, fontSize: 14 }}>TV</div>
          <div className="empr-post-job-input">Post a new requisition...</div>
          <button className="btn btn-gold" style={{ fontSize: 13, padding: '8px 16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Post
          </button>
        </div>
      </div>

      {/* Hiring Status Banner */}
      <div className="dash-card dash-card-padded" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(80,250,123,0.04))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: 28 }}>trending_up</span>
          <div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>Hiring Pipeline Update</p>
            <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>Weekly recruitment summary for TechVentures</p>
          </div>
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--color-secondary)' }}>8 new AI-matched candidates</strong> added to your pipeline this week. 
          E. Thompson (94% match for VP Engineering) is interview-ready. Your account manager has scheduled 3 finalist interviews for next week.
        </p>
      </div>

      {/* New Candidate Matches */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">New Candidate Matches</span>
          <a href="#" className="dash-card-action">View all candidates</a>
        </div>

        {[
          { initials: 'ET', name: 'E. Thompson', title: 'SVP Engineering · ex-Meta', score: 94, skills: ['Machine Learning', 'Scale-ups', 'M&A'], comp: '$280k - $320k', role: 'VP Engineering', time: '1 hour ago' },
          { initials: 'MC', name: 'M. Chen', title: 'Head of AI · ex-Google', score: 91, skills: ['AI/ML', 'Research', 'Team Building'], comp: '$250k - $300k', role: 'Head of AI', time: '3 hours ago' },
          { initials: 'SW', name: 'S. Williams', title: 'Director of Eng · Stripe', score: 87, skills: ['Payments', 'Distributed Systems', 'Go'], comp: '$220k - $270k', role: 'Director of Eng', time: '1 day ago' },
          { initials: 'PD', name: 'P. Davis', title: 'Staff+ Engineer · Netflix', score: 84, skills: ['Streaming', 'Microservices', 'Java'], comp: '$230k - $260k', role: 'Senior Architect', time: '2 days ago' },
        ].map((c, i) => (
          <div key={i} className="empr-cand-card">
            <div className="empr-cand-avatar">{c.initials}</div>
            <div className="empr-cand-info">
              <p className="empr-cand-name">{c.name}</p>
              <p className="empr-cand-headline">{c.title}</p>
              <div className="empr-cand-skills">
                {c.skills.map(s => <span key={s} className="emp-match-tag">{s}</span>)}
              </div>
              <div className="empr-cand-comp">
                <span>Expecting: {c.comp}</span>
                <span>For: {c.role}</span>
              </div>
              <div className="empr-cand-actions">
                <button className="btn btn-gold" style={{ fontSize: 12, padding: '5px 14px' }}>Review Profile</button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 14px' }}>Schedule Interview</button>
              </div>
            </div>
            <div className="empr-cand-right">
              <span className={`dash-match-score ${c.score >= 90 ? 'high' : c.score >= 80 ? 'medium' : 'low'}`}>
                {c.score}% Match
              </span>
              <span className="empr-req-posted">{c.time}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Recent Activity</span>
        </div>
        {[
          { icon: 'person_add', text: 'E. Thompson was shortlisted for VP Engineering', time: '1 hour ago' },
          { icon: 'event', text: 'Interview scheduled with M. Chen — Wednesday 10 AM', time: '3 hours ago' },
          { icon: 'auto_awesome', text: 'AI matched 3 new candidates to "Head of AI" requisition', time: 'Yesterday' },
          { icon: 'check_circle', text: 'S. Williams completed the technical assessment', time: '2 days ago' },
          { icon: 'analytics', text: 'Monthly hiring report is ready for review', time: '3 days ago' },
        ].map((a, i) => (
          <div key={i} className="empr-activity-item">
            <div className="empr-activity-icon">
              <span className="material-symbols-outlined">{a.icon}</span>
            </div>
            <div>
              <p className="empr-activity-text">{a.text}</p>
              <p className="empr-activity-time">{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
