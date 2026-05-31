import { useEffect, useState } from 'react';
import { getEmployerApplications, reviewApplication, makeJobOffer, type EmployerApplicationApi } from '../../lib/jobsApi';
import '../jobs/Jobs.css';

const TABS = ['ALL', 'PENDING', 'REVIEWED', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'REJECTED', 'WITHDRAWN'] as const;
type StatusTab = typeof TABS[number];

export default function EmployerApplicationReview() {
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
  const [applications, setApplications] = useState<EmployerApplicationApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  
  // Selected application for detail view
  const [selectedApp, setSelectedApp] = useState<EmployerApplicationApi | null>(null);
  
  // Interview notes state
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewNotes, setInterviewNotes] = useState('');

  // Offer modal state
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerDetails, setOfferDetails] = useState('');
  const [offerSalary, setOfferSalary] = useState('');
  const [offerCurrency, setOfferCurrency] = useState('INR');
  const [offerStartDate, setOfferStartDate] = useState('');
  const [offerExpiresDays, setOfferExpiresDays] = useState('7');

  const loadApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getEmployerApplications({
        status: activeTab === 'ALL' ? undefined : activeTab,
        limit: 100
      });
      setApplications(res.applications || []);
      // If we had a selected application, update it from fresh data
      if (selectedApp) {
        const updated = res.applications.find(a => a.id === selectedApp.id);
        if (updated) setSelectedApp(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [activeTab]);

  const handleStatusUpdate = async (appId: string, status: any, notes?: string) => {
    setBusyId(appId);
    try {
      await reviewApplication(appId, status, notes);
      await loadApplications();
      setInterviewOpen(false);
      setInterviewNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to update application status');
    } finally {
      setBusyId('');
    }
  };

  const handleOpenInterviewModal = () => {
    setInterviewNotes('');
    setInterviewOpen(true);
  };

  const handleOpenOfferModal = () => {
    setOfferDetails('');
    setOfferSalary('');
    setOfferCurrency('INR');
    setOfferStartDate('');
    setOfferExpiresDays('7');
    setOfferOpen(true);
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    if (!offerDetails.trim()) return alert('Offer details are required');
    if (!offerSalary.trim()) return alert('Salary is required');

    setBusyId(selectedApp.id);
    try {
      await makeJobOffer({
        applicationId: selectedApp.id,
        offerDetails: offerDetails.trim(),
        salary: Number(offerSalary),
        salaryCurrency: offerCurrency.trim().toUpperCase(),
        startDate: offerStartDate || undefined,
        expiresInDays: Number(offerExpiresDays),
      });
      setOfferOpen(false);
      await loadApplications();
    } catch (err: any) {
      alert(err.message || 'Failed to create job offer');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="jobs-listing-manage" style={{ maxWidth: '1200px' }}>
      <div className="jobs-page-header">
        <div>
          <h2>
            <span className="material-symbols-outlined" style={{ fontSize: 24, marginRight: 8, verticalAlign: -4, color: 'var(--color-secondary)' }}>groups</span>
            Review Applications
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>
            Track and process incoming candidate job applications, schedule video interviews, and send out job offers.
          </p>
        </div>
      </div>

      <div className="empr-filter-tabs" style={{ marginBottom: 20 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            className={`empr-filter-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab);
              setSelectedApp(null);
            }}
          >
            {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedApp ? '1fr 1.2fr' : '1fr', gap: 20, alignItems: 'start' }}>
        {/* Left Side: Application List */}
        <div>
          {loading && <p style={{ color: 'var(--color-on-surface-variant)' }}>Loading applications...</p>}
          {error && <p style={{ color: 'var(--color-error)' }}>{error}</p>}

          {!loading && !error && applications.length === 0 && (
            <div className="jobs-empty" style={{ background: 'var(--color-surface-card)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="material-symbols-outlined">person_search</span>
              <h3>No Applications Found</h3>
              <p>No candidates have applied under this category yet.</p>
            </div>
          )}

          {!loading && !error && applications.length > 0 && (
            <div style={{ display: 'grid', gap: 12 }}>
              {applications.map(app => (
                <div 
                  key={app.id} 
                  className={`jobs-app-card ${selectedApp?.id === app.id ? 'active-selection' : ''}`} 
                  onClick={() => setSelectedApp(app)}
                  style={{ 
                    padding: '16px', 
                    cursor: 'pointer',
                    borderColor: selectedApp?.id === app.id ? 'var(--color-secondary)' : undefined,
                    background: selectedApp?.id === app.id ? 'rgba(255,255,255,0.02)' : undefined,
                  }}
                >
                  <div 
                    className="jobs-app-logo" 
                    style={{ 
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--color-primary-container), var(--color-secondary))',
                      color: '#1a1a2e',
                      fontSize: '16px'
                    }}
                  >
                    {app.applicantPhotoURL ? (
                      <img src={app.applicantPhotoURL} alt={app.applicantName} style={{ borderRadius: '50%' }} />
                    ) : (
                      app.applicantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="jobs-app-info">
                    <h3 className="jobs-app-title" style={{ fontSize: 15 }}>{app.applicantName}</h3>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-secondary)', marginTop: 2 }}>{app.jobTitle}</p>
                    <p className="jobs-app-company" style={{ fontSize: 12 }}>
                      Applied {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'recently'}
                    </p>
                  </div>
                  <div className="jobs-app-right">
                    <span className={`jobs-status-badge ${app.status.toLowerCase()}`}>
                      {app.status.toLowerCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Detailed Profile View */}
        {selectedApp && (
          <div className="dash-card" style={{ padding: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div 
                className="jobs-app-logo" 
                style={{ 
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary-container), var(--color-secondary))',
                  color: '#1a1a2e',
                  fontSize: '22px',
                  lineHeight: '64px'
                }}
              >
                {selectedApp.applicantPhotoURL ? (
                  <img src={selectedApp.applicantPhotoURL} alt={selectedApp.applicantName} style={{ borderRadius: '50%' }} />
                ) : (
                  selectedApp.applicantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{selectedApp.applicantName}</h3>
                <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>{selectedApp.applicantEmail}</p>
                {selectedApp.applicantHeadline && (
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-primary-container)', marginTop: 4 }}>
                    {selectedApp.applicantHeadline}
                  </p>
                )}
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setSelectedApp(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Candidate Skills */}
            {selectedApp.applicantSkills && selectedApp.applicantSkills.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)' }}>Skills</h4>
                <div className="job-card-skills" style={{ marginTop: 6 }}>
                  {selectedApp.applicantSkills.map(s => (
                    <span key={s} className="jobs-filter-chip active" style={{ cursor: 'default', padding: '2px 10px', fontSize: '11px' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Job details link */}
            <div style={{ marginTop: 20, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-default)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Applying For Position:</span>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-secondary)', marginTop: 2 }}>{selectedApp.jobTitle}</p>
            </div>

            {/* Cover Letter */}
            {selectedApp.coverLetter && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)' }}>Cover Letter</h4>
                <p style={{ 
                  fontSize: 14, 
                  color: 'var(--color-on-surface)', 
                  lineHeight: 1.6, 
                  background: 'rgba(255,255,255,0.03)', 
                  padding: 14, 
                  borderRadius: 'var(--radius-default)',
                  marginTop: 6,
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedApp.coverLetter}
                </p>
              </div>
            )}

            {/* Resume */}
            {selectedApp.resumeUrl && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)' }}>Attached Resume</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, background: 'rgba(80,250,123,0.06)', border: '1px dashed rgba(80,250,123,0.2)', padding: 12, borderRadius: 'var(--radius-default)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-primary-container)', fontSize: 32 }}>description</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedApp.resumeFileName || 'Resume.pdf'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Submitted via platform</p>
                  </div>
                  <a 
                    href={selectedApp.resumeUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-gold" 
                    style={{ fontSize: 12, padding: '4px 12px' }}
                  >
                    View File
                  </a>
                </div>
              </div>
            )}

            {/* Pipeline Actions */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', marginBottom: 12 }}>Pipeline Operations</h4>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedApp.status === 'PENDING' && (
                  <button 
                    className="btn btn-ghost" 
                    onClick={() => handleStatusUpdate(selectedApp.id, 'REVIEWED')}
                    disabled={busyId === selectedApp.id}
                  >
                    Mark Reviewed
                  </button>
                )}

                {['PENDING', 'REVIEWED'].includes(selectedApp.status) && (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleStatusUpdate(selectedApp.id, 'SHORTLISTED')}
                    disabled={busyId === selectedApp.id}
                  >
                    Shortlist Candidate
                  </button>
                )}

                {['PENDING', 'REVIEWED', 'SHORTLISTED'].includes(selectedApp.status) && (
                  <button 
                    className="btn btn-gold" 
                    onClick={handleOpenInterviewModal}
                    disabled={busyId === selectedApp.id}
                  >
                    Schedule Interview
                  </button>
                )}

                {['SHORTLISTED', 'INTERVIEW'].includes(selectedApp.status) && (
                  <button 
                    className="btn btn-gold" 
                    onClick={handleOpenOfferModal}
                    disabled={busyId === selectedApp.id}
                  >
                    🎉 Make Job Offer
                  </button>
                )}

                {selectedApp.status !== 'REJECTED' && selectedApp.status !== 'OFFERED' && selectedApp.status !== 'WITHDRAWN' && (
                  <button 
                    className="btn btn-ghost" 
                    style={{ color: 'var(--color-error)' }}
                    onClick={() => handleStatusUpdate(selectedApp.id, 'REJECTED')}
                    disabled={busyId === selectedApp.id}
                  >
                    Reject Application
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Interview Modal */}
      {interviewOpen && selectedApp && (
        <div className="jobs-apply-modal-backdrop" onClick={() => setInterviewOpen(false)}>
          <div className="jobs-apply-modal" onClick={e => e.stopPropagation()}>
            <div className="jobs-apply-modal-header">
              <h3>Schedule Video Interview</h3>
              <button className="btn btn-ghost" onClick={() => setInterviewOpen(false)}>Close</button>
            </div>
            <div className="jobs-apply-modal-body">
              <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', marginBottom: 16 }}>
                Scheduling an interview will automatically create a video meeting link and slot the candidate in for an interview 3 days from now. Specify any guidelines or preparation instructions below.
              </p>
              <div className="jobs-apply-field">
                <label>Interview Instructions / Candidate Guidelines</label>
                <textarea 
                  rows={4} 
                  value={interviewNotes}
                  onChange={e => setInterviewNotes(e.target.value)}
                  placeholder="e.g. Please prepare a 10-minute presentation on your past projects. We will discuss system design."
                />
              </div>
            </div>
            <div className="jobs-apply-modal-footer">
              <button className="btn btn-ghost" onClick={() => setInterviewOpen(false)} disabled={busyId === selectedApp.id}>Cancel</button>
              <button 
                className="btn btn-gold" 
                onClick={() => handleStatusUpdate(selectedApp.id, 'INTERVIEW', interviewNotes)}
                disabled={busyId === selectedApp.id}
              >
                {busyId === selectedApp.id ? 'Scheduling...' : 'Schedule Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Make Offer Modal */}
      {offerOpen && selectedApp && (
        <div className="jobs-apply-modal-backdrop" onClick={() => setOfferOpen(false)}>
          <div className="jobs-apply-modal" onClick={e => e.stopPropagation()}>
            <div className="jobs-apply-modal-header">
              <h3>Send Formal Job Offer</h3>
              <button className="btn btn-ghost" onClick={() => setOfferOpen(false)}>Close</button>
            </div>
            <form onSubmit={handleCreateOffer}>
              <div className="jobs-apply-modal-body">
                <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', marginBottom: 16 }}>
                  You are making a formal job offer to <strong>{selectedApp.applicantName}</strong> for the role of <strong>{selectedApp.jobTitle}</strong>.
                </p>

                <div className="jobs-apply-field">
                  <label>Annual Salary Package (CTC)*</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input 
                      type="number" 
                      required 
                      value={offerSalary} 
                      onChange={e => setOfferSalary(e.target.value)} 
                      placeholder="1500000"
                      style={{ flex: 2 }}
                    />
                    <input 
                      type="text" 
                      required 
                      value={offerCurrency} 
                      onChange={e => setOfferCurrency(e.target.value)} 
                      placeholder="INR"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className="jobs-apply-field">
                  <label>Proposed Start Date</label>
                  <input 
                    type="date" 
                    value={offerStartDate} 
                    onChange={e => setOfferStartDate(e.target.value)} 
                  />
                </div>

                <div className="jobs-apply-field">
                  <label>Offer Validity (Days)*</label>
                  <input 
                    type="number" 
                    required 
                    value={offerExpiresDays} 
                    onChange={e => setOfferExpiresDays(e.target.value)} 
                    placeholder="7"
                  />
                </div>

                <div className="jobs-apply-field">
                  <label>Offer Details & Benefits Description*</label>
                  <textarea 
                    rows={6} 
                    required
                    value={offerDetails}
                    onChange={e => setOfferDetails(e.target.value)}
                    placeholder="Specify variables, stock options, insurance, work models, and overall welcome note..."
                  />
                </div>
              </div>
              <div className="jobs-apply-modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setOfferOpen(false)} disabled={busyId === selectedApp.id}>Cancel</button>
                <button type="submit" className="btn btn-gold" disabled={busyId === selectedApp.id}>
                  {busyId === selectedApp.id ? 'Sending...' : 'Send Job Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
