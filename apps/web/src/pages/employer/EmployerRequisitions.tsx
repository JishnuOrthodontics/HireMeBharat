import { useState } from 'react';

const requisitions = [
  { title: 'VP of Product Engineering', dept: 'Engineering', location: 'San Francisco · Hybrid', salary: '$240k - $300k', status: 'ACTIVE', candidates: 12, interviews: 3, posted: '5 days ago', featured: true },
  { title: 'Head of AI/ML', dept: 'AI Research', location: 'New York · Remote', salary: '$220k - $280k', status: 'ACTIVE', candidates: 8, interviews: 1, posted: '1 week ago', featured: false },
  { title: 'Director of Engineering', dept: 'Platform', location: 'Seattle · Hybrid', salary: '$200k - $260k', status: 'ACTIVE', candidates: 6, interviews: 2, posted: '2 weeks ago', featured: false },
  { title: 'Senior Architect', dept: 'Infrastructure', location: 'Remote (US)', salary: '$190k - $240k', status: 'ACTIVE', candidates: 4, interviews: 0, posted: '3 weeks ago', featured: false },
  { title: 'VP of Data Science', dept: 'Data', location: 'Austin · On-site', salary: '$250k - $310k', status: 'PAUSED', candidates: 15, interviews: 4, posted: '1 month ago', featured: false },
  { title: 'CTO', dept: 'Executive', location: 'San Francisco · On-site', salary: '$300k - $400k', status: 'FILLED', candidates: 22, interviews: 6, posted: '2 months ago', featured: false },
];

const tabs = ['All', 'Active', 'Paused', 'Filled', 'Draft'];

export default function EmployerRequisitions() {
  const [activeTab, setActiveTab] = useState('All');

  const filtered = activeTab === 'All'
    ? requisitions
    : requisitions.filter(r => r.status === activeTab.toUpperCase());

  return (
    <>
      <div className="dash-card">
        <div className="dash-card-header">
          <span className="dash-card-title">Requisitions</span>
          <button className="btn btn-gold" style={{ fontSize: 13, padding: '6px 16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            New Requisition
          </button>
        </div>

        <div className="empr-filter-tabs">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`empr-filter-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {filtered.map((req, i) => (
          <div key={i} className="empr-req-card">
            <div className="empr-req-icon">
              <span className="material-symbols-outlined">work</span>
            </div>
            <div className="empr-req-info">
              <p className="empr-req-title">{req.title}</p>
              <div className="empr-req-meta">
                <span className="empr-req-meta-item">
                  <span className="material-symbols-outlined">apartment</span>
                  {req.dept}
                </span>
                <span className="empr-req-meta-item">
                  <span className="material-symbols-outlined">location_on</span>
                  {req.location}
                </span>
                <span className="empr-req-meta-item">
                  <span className="material-symbols-outlined">payments</span>
                  {req.salary}
                </span>
              </div>
              <div className="empr-req-pipeline">
                <span className={`empr-req-stage-chip ${req.candidates > 0 ? 'has-count' : ''}`}>
                  {req.candidates} candidates
                </span>
                <span className={`empr-req-stage-chip ${req.interviews > 0 ? 'has-count' : ''}`}>
                  {req.interviews} interviews
                </span>
              </div>
            </div>
            <div className="empr-req-right">
              <span className={`dash-status ${req.status.toLowerCase()}`}>{req.status}</span>
              <span className="empr-req-posted">{req.posted}</span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.3 }}>search_off</span>
            <p style={{ marginTop: 12 }}>No requisitions in this category</p>
          </div>
        )}
      </div>
    </>
  );
}
