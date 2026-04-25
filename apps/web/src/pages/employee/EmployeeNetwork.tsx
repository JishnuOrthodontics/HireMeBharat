export default function EmployeeNetwork() {
  const connections = [
    { name: 'Marcus Chen', title: 'CTO at DataFlow', initials: 'MC', mutual: 12 },
    { name: 'Elena Vasquez', title: 'VP Engineering at Stripe', initials: 'EV', mutual: 8 },
    { name: 'David Park', title: 'Director of AI at Meta', initials: 'DP', mutual: 15 },
    { name: 'Aisha Rahman', title: 'Head of Platform at Figma', initials: 'AR', mutual: 6 },
    { name: 'James Torres', title: 'SVP Product at Coinbase', initials: 'JT', mutual: 9 },
    { name: 'Sophie Liu', title: 'Engineering Manager at Google', initials: 'SL', mutual: 11 },
  ];

  const suggestions = [
    { name: 'Rachel Kim', title: 'CTO at Stealth Startup', initials: 'RK', reason: 'Similar background' },
    { name: 'Omar Hassan', title: 'VP Eng at Runway', initials: 'OH', reason: 'AI expertise match' },
    { name: 'Lisa Chen', title: 'Director at TechCrunch', initials: 'LC', reason: 'Industry insights' },
  ];

  return (
    <>
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Your Network</span>
          <span style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>{connections.length} connections</span>
        </div>
        <div className="dash-card-body">
          <div className="emp-network-grid">
            {connections.map((c, i) => (
              <div key={i} className="dash-card emp-network-card glass-card-hover">
                <div className="emp-network-avatar">{c.initials}</div>
                <p className="emp-network-name">{c.name}</p>
                <p className="emp-network-title">{c.title}</p>
                <p className="emp-network-mutual">{c.mutual} mutual connections</p>
                <button className="btn btn-secondary" style={{ marginTop: 12, fontSize: 13, padding: '6px 16px', width: '100%' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
                  Message
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Suggested Connections</span>
        </div>
        <div className="dash-card-body">
          <div className="emp-network-grid">
            {suggestions.map((s, i) => (
              <div key={i} className="dash-card emp-network-card glass-card-hover">
                <div className="emp-network-avatar" style={{ background: 'linear-gradient(135deg, var(--color-secondary), #f0d060)' }}>{s.initials}</div>
                <p className="emp-network-name">{s.name}</p>
                <p className="emp-network-title">{s.title}</p>
                <p className="emp-network-mutual">{s.reason}</p>
                <button className="btn btn-primary" style={{ marginTop: 12, fontSize: 13, padding: '6px 16px', width: '100%' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
