import { useState } from 'react';

const candidates = [
  { initials: 'ET', name: 'E. Thompson', title: 'SVP Engineering · ex-Meta, Dropbox', score: 94, skills: ['Machine Learning', 'Scale-ups', 'M&A', 'Exec Leadership'], comp: '$280k - $320k', stage: 'Interview', role: 'VP Engineering' },
  { initials: 'MC', name: 'M. Chen', title: 'Head of AI · ex-Google Brain', score: 91, skills: ['AI/ML', 'Research', 'Team Building', 'Python'], comp: '$250k - $300k', stage: 'Screening', role: 'Head of AI' },
  { initials: 'SW', name: 'S. Williams', title: 'Director of Eng · Stripe', score: 87, skills: ['Payments', 'Distributed Systems', 'Go', 'Leadership'], comp: '$220k - $270k', stage: 'Interview', role: 'Director of Eng' },
  { initials: 'PD', name: 'P. Davis', title: 'Staff+ Engineer · Netflix', score: 84, skills: ['Streaming', 'Microservices', 'Java', 'Kubernetes'], comp: '$230k - $260k', stage: 'Sourced', role: 'Senior Architect' },
  { initials: 'LH', name: 'L. Hernandez', title: 'VP Data Science · Uber', score: 82, skills: ['Data Science', 'ML Ops', 'Strategy', 'R'], comp: '$260k - $310k', stage: 'Offer', role: 'VP Data Science' },
  { initials: 'JW', name: 'J. Wu', title: 'Principal Engineer · Amazon', score: 79, skills: ['AWS', 'Microservices', 'System Design', 'Java'], comp: '$240k - $280k', stage: 'Screening', role: 'Senior Architect' },
];

const stages = ['All', 'Sourced', 'Screening', 'Interview', 'Offer', 'Hired'];

export default function EmployerCandidates() {
  const [activeTab, setActiveTab] = useState('All');

  const filtered = activeTab === 'All'
    ? candidates
    : candidates.filter(c => c.stage === activeTab);

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <span className="dash-card-title">Candidate Pipeline</span>
        <span style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>{candidates.length} candidates</span>
      </div>

      <div className="empr-filter-tabs">
        {stages.map(tab => (
          <button
            key={tab}
            className={`empr-filter-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.map((c, i) => (
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
              <button className="btn btn-gold" style={{ fontSize: 12, padding: '5px 14px' }}>Review</button>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 14px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>event</span>
                Schedule
              </button>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 14px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chat</span>
                Message
              </button>
            </div>
          </div>
          <div className="empr-cand-right">
            <span className={`dash-match-score ${c.score >= 90 ? 'high' : c.score >= 80 ? 'medium' : 'low'}`}>
              {c.score}%
            </span>
            <span className={`dash-status ${c.stage.toLowerCase() === 'interview' ? 'active' : c.stage.toLowerCase() === 'offer' ? 'pending' : 'closed'}`}>
              {c.stage}
            </span>
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.3 }}>group_off</span>
          <p style={{ marginTop: 12 }}>No candidates in this stage</p>
        </div>
      )}
    </div>
  );
}
