/* ===== Home Feed ===== */
export default function EmployeeFeed() {
  return (
    <>
      {/* Market Intelligence Banner */}
      <div className="dash-card dash-card-padded" style={{ background: 'linear-gradient(135deg, rgba(80,250,123,0.08), rgba(212,175,55,0.05))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-primary-container)', fontSize: 28 }}>query_stats</span>
          <div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>Market Intelligence Update</p>
            <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>Your weekly career market summary</p>
          </div>
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
          Engineering leadership demand is up <strong style={{ color: 'var(--color-primary-container)' }}>18% this quarter</strong>. 
          Companies in AI/ML are aggressively hiring VP-level candidates with your skill profile. Your concierge has identified 5 new opportunities this week.
        </p>
      </div>

      {/* New Matches Feed */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Curated Matches</span>
          <a href="#" className="dash-card-action">View all matches</a>
        </div>

        {[
          {
            icon: '🚀', title: 'VP of Product Engineering', company: 'Stealth AI Startup · Series C',
            score: 94, salary: '$240k - $300k + Equity', location: 'San Francisco · Hybrid',
            tags: ['AI/ML', 'Scale-ups', 'Platform'], time: '2 hours ago', featured: true,
          },
          {
            icon: '🤖', title: 'Head of AI Infrastructure', company: 'NextGen Robotics · Public',
            score: 91, salary: '$220k - $280k', location: 'New York · Remote',
            tags: ['ML Ops', 'Distributed Systems', 'Leadership'], time: '5 hours ago', featured: false,
          },
          {
            icon: '⚡', title: 'CTO', company: 'FinTech Disruptor · Series B',
            score: 88, salary: '$260k - $320k + Equity', location: 'Austin · On-site',
            tags: ['Full-Stack', 'Fintech', 'Team Building'], time: '1 day ago', featured: false,
          },
          {
            icon: '💎', title: 'Director of Engineering', company: 'Enterprise SaaS · Unicorn',
            score: 85, salary: '$210k - $260k', location: 'Seattle · Hybrid',
            tags: ['SaaS', 'B2B', 'Kubernetes'], time: '2 days ago', featured: false,
          },
          {
            icon: '🌐', title: 'VP Engineering, Core Platform', company: 'Global Marketplace · IPO Track',
            score: 82, salary: '$230k - $290k + RSU', location: 'Remote (US)',
            tags: ['Marketplace', 'Microservices', 'Mentorship'], time: '3 days ago', featured: false,
          },
        ].map((match, i) => (
          <div key={i} className={`emp-match-card ${match.featured ? 'emp-match-featured' : ''}`}>
            <div className="emp-match-logo">{match.icon}</div>
            <div className="emp-match-info">
              <p className="emp-match-title">{match.title}</p>
              <p className="emp-match-company">{match.company}</p>
              <div className="emp-match-meta">
                <span className="emp-match-meta-item">
                  <span className="material-symbols-outlined">location_on</span>
                  {match.location}
                </span>
                <span className="emp-match-meta-item">
                  <span className="material-symbols-outlined">payments</span>
                  {match.salary}
                </span>
              </div>
              <div className="emp-match-tags">
                {match.tags.map(tag => <span key={tag} className="emp-match-tag">{tag}</span>)}
              </div>
              <div className="emp-match-actions">
                <button className="btn btn-primary" style={{ fontSize: 13, padding: '6px 16px' }}>Express Interest</button>
                <button className="btn btn-ghost" style={{ fontSize: 13, padding: '6px 16px' }}>Save</button>
              </div>
            </div>
            <div className="emp-match-right">
              <span className={`dash-match-score ${match.score >= 90 ? 'high' : match.score >= 80 ? 'medium' : 'low'}`}>
                {match.score}% Match
              </span>
              <span className="emp-match-time">{match.time}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Activity / Insights */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Recent Activity</span>
        </div>
        {[
          { icon: 'visibility', text: 'Your profile was viewed by 3 recruiters this week', time: 'Today' },
          { icon: 'thumb_up', text: 'NextGen Robotics bookmarked your profile', time: 'Yesterday' },
          { icon: 'update', text: 'Your concierge updated your compensation benchmarks', time: '2 days ago' },
          { icon: 'school', text: 'New skill assessment available: System Design at Scale', time: '3 days ago' },
        ].map((a, i) => (
          <div key={i} className="dash-feed-item" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-primary-container)', marginTop: 2 }}>{a.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, lineHeight: 1.5 }}>{a.text}</p>
              <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
