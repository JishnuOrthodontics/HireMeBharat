import { useState } from 'react';

const allMatches = [
  { icon: '🚀', title: 'VP of Product Engineering', company: 'Stealth AI Startup', score: 94, salary: '$240k - $300k', location: 'San Francisco', status: 'New', tags: ['AI/ML', 'Scale-ups'] },
  { icon: '🤖', title: 'Head of AI Infrastructure', company: 'NextGen Robotics', score: 91, salary: '$220k - $280k', location: 'New York', status: 'New', tags: ['ML Ops', 'Leadership'] },
  { icon: '⚡', title: 'CTO', company: 'FinTech Disruptor', score: 88, salary: '$260k - $320k', location: 'Austin', status: 'Applied', tags: ['Fintech', 'Full-Stack'] },
  { icon: '💎', title: 'Director of Engineering', company: 'Enterprise SaaS', score: 85, salary: '$210k - $260k', location: 'Seattle', status: 'Interview', tags: ['SaaS', 'Kubernetes'] },
  { icon: '🌐', title: 'VP Engineering', company: 'Global Marketplace', score: 82, salary: '$230k - $290k', location: 'Remote', status: 'Saved', tags: ['Marketplace', 'Microservices'] },
  { icon: '🔬', title: 'Principal Engineer', company: 'BioTech Innovations', score: 79, salary: '$200k - $250k', location: 'Boston', status: 'New', tags: ['Biotech', 'Systems'] },
  { icon: '🏦', title: 'SVP Engineering', company: 'Digital Bank', score: 76, salary: '$280k - $350k', location: 'Chicago', status: 'Declined', tags: ['Banking', 'Compliance'] },
];

const tabs = ['All', 'New', 'Applied', 'Interview', 'Saved', 'Declined'];

export default function EmployeeMatches() {
  const [activeTab, setActiveTab] = useState('All');

  const filtered = activeTab === 'All'
    ? allMatches
    : allMatches.filter(m => m.status === activeTab);

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <span className="dash-card-title">Your Matches</span>
        <span style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>{allMatches.length} total</span>
      </div>

      {/* Filter Tabs */}
      <div className="emp-filter-tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`emp-filter-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Match Cards */}
      {filtered.map((match, i) => (
        <div key={i} className="emp-match-card">
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
              {match.tags.map(t => <span key={t} className="emp-match-tag">{t}</span>)}
            </div>
          </div>
          <div className="emp-match-right">
            <span className={`dash-match-score ${match.score >= 90 ? 'high' : match.score >= 80 ? 'medium' : 'low'}`}>
              {match.score}%
            </span>
            <span className={`dash-status ${match.status.toLowerCase()}`}>{match.status}</span>
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.3 }}>search_off</span>
          <p style={{ marginTop: 12 }}>No matches in this category</p>
        </div>
      )}
    </div>
  );
}
