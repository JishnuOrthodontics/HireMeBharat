import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEmployerJobListings, createJobListing, patchJobListing, deleteJobListing, type JobListingApi } from '../../lib/jobsApi';
import { getBillingStatus } from '../../lib/billingApi';
import '../jobs/Jobs.css';

const TABS = ['ALL', 'ACTIVE', 'DRAFT', 'PAUSED', 'FILLED', 'CLOSED'] as const;
type StatusTab = typeof TABS[number];

export default function EmployerJobListings() {
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
  const [listings, setListings] = useState<JobListingApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  
  // Billing status
  const [billingStatus, setBillingStatus] = useState<any>(null);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<JobListingApi | null>(null);
  
  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDept, setFormDept] = useState('');
  const [formLoc, setFormLoc] = useState('');
  const [formType, setFormType] = useState<'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP'>('FULL_TIME');
  const [formDesc, setFormDesc] = useState('');
  const [formReqsText, setFormReqsText] = useState('');
  const [formBenefitsText, setFormBenefitsText] = useState('');
  const [formSalMin, setFormSalMin] = useState('');
  const [formSalMax, setFormSalMax] = useState('');
  const [formCurrency, setFormCurrency] = useState('INR');
  const [formExpMin, setFormExpMin] = useState('');
  const [formExpMax, setFormExpMax] = useState('');
  const [formSkillsText, setFormSkillsText] = useState('');
  const [formStatus, setFormStatus] = useState<string>('DRAFT');
  const [formFeatured, setFormFeatured] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [listingsRes, statusRes] = await Promise.all([
        getEmployerJobListings(),
        getBillingStatus().catch(() => null),
      ]);
      setListings(listingsRes.listings || []);
      if (statusRes) setBillingStatus(statusRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeListingsCount = listings.filter(l => l.status === 'ACTIVE').length;
  const jobCredits = Number(billingStatus?.jobCredits || 0);
  const isCapped = activeListingsCount >= 3 && billingStatus?.plan !== 'PRO' && jobCredits <= 0;

  const handleOpenCreateModal = () => {
    setEditingListing(null);
    setFormTitle('');
    setFormDept('');
    setFormLoc('');
    setFormType('FULL_TIME');
    setFormDesc('');
    setFormReqsText('');
    setFormBenefitsText('');
    setFormSalMin('');
    setFormSalMax('');
    setFormCurrency('INR');
    setFormExpMin('');
    setFormExpMax('');
    setFormSkillsText('');
    setFormStatus('DRAFT');
    setFormFeatured(false);
    setModalOpen(true);
  };

  const handleOpenEditModal = (listing: JobListingApi) => {
    setEditingListing(listing);
    setFormTitle(listing.title);
    setFormDept(listing.department);
    setFormLoc(listing.location);
    setFormType(listing.employmentType);
    setFormDesc(listing.description);
    setFormReqsText(listing.requirements ? listing.requirements.join('\n') : '');
    setFormBenefitsText(listing.benefits ? listing.benefits.join('\n') : '');
    setFormSalMin(String(listing.salaryMin || ''));
    setFormSalMax(String(listing.salaryMax || ''));
    setFormCurrency(listing.salaryCurrency || 'INR');
    setFormExpMin(String(listing.experienceMin || ''));
    setFormExpMax(String(listing.experienceMax || ''));
    setFormSkillsText(listing.skills ? listing.skills.join(', ') : '');
    setFormStatus(listing.status || 'DRAFT');
    setFormFeatured(listing.featured || false);
    setModalOpen(true);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === 'ACTIVE' && isCapped) {
      alert("You have reached the free tier limit of 3 active job listings. Please pause an existing job or upgrade to Pro to publish more active listings!");
      return;
    }
    setBusyId(id);
    try {
      await patchJobListing(id, { status: newStatus as any });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setBusyId('');
    }
  };

  const handleDelete = async (listing: JobListingApi) => {
    if (!window.confirm(`Are you sure you want to delete the job listing "${listing.title}"?`)) return;
    setBusyId(listing.id);
    try {
      await deleteJobListing(listing.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete job listing');
    } finally {
      setBusyId('');
    }
  };

  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return alert('Title is required');
    if (!formDept.trim()) return alert('Department is required');
    if (!formLoc.trim()) return alert('Location is required');
    if (!formDesc.trim()) return alert('Description is required');

    if (formStatus === 'ACTIVE' && isCapped) {
      const becomesActive = !editingListing || editingListing.status !== 'ACTIVE';
      if (becomesActive) {
        alert("You have reached the free tier limit of 3 active job listings. Please save as a Draft or upgrade to Pro to post active jobs!");
        return;
      }
    }

    const requirements = formReqsText.split('\n').map(r => r.trim()).filter(Boolean);
    const benefits = formBenefitsText.split('\n').map(b => b.trim()).filter(Boolean);
    const skills = formSkillsText.split(',').map(s => s.trim()).filter(Boolean);

    const payload: any = {
      title: formTitle.trim(),
      department: formDept.trim(),
      location: formLoc.trim(),
      employmentType: formType,
      description: formDesc.trim(),
      requirements,
      benefits,
      salaryMin: formSalMin.trim() ? Number(formSalMin) : 0,
      salaryMax: formSalMax.trim() ? Number(formSalMax) : 0,
      salaryCurrency: formCurrency.trim().toUpperCase(),
      experienceMin: formExpMin.trim() ? Number(formExpMin) : 0,
      experienceMax: formExpMax.trim() ? Number(formExpMax) : 0,
      skills,
      status: formStatus,
      featured: formFeatured,
    };

    try {
      if (editingListing) {
        await patchJobListing(editingListing.id, payload);
      } else {
        await createJobListing(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save job listing');
    }
  };

  const filteredListings = listings.filter(l => {
    if (activeTab === 'ALL') return true;
    return (l.status || '').toUpperCase() === activeTab;
  });

  return (
    <div className="jobs-listing-manage">
      <div className="jobs-page-header">
        <div>
          <h2>
            <span className="material-symbols-outlined" style={{ fontSize: 24, marginRight: 8, verticalAlign: -4, color: 'var(--color-secondary)' }}>work_outline</span>
            Manage Job Listings
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>
            Create and moderate your public-facing job board listings.
          </p>
        </div>
        <button className="btn btn-gold" onClick={handleOpenCreateModal}>
          <span className="material-symbols-outlined">add</span>
          New Job Listing
        </button>
      </div>

      {billingStatus && billingStatus.plan !== 'PRO' && (
        <div className="billing-limit-banner" style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(26,26,46,0.3))',
          border: '1px solid rgba(212,175,55,0.25)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 14, color: '#d4af37', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>info</span>
              Free Job Postings Capped
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', margin: '4px 0 0 0' }}>
              You are using <strong>{activeListingsCount} of 3</strong> free active listings. Buy a job credit pack to publish more roles (each credit = one job active for 15 days).
            </p>
          </div>
          <Link to="/employer/pricing" className="btn btn-gold" style={{ fontSize: 12, padding: '8px 16px' }}>
            View job packs
          </Link>
        </div>
      )}

      <div className="empr-filter-tabs" style={{ marginBottom: 20 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            className={`empr-filter-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--color-on-surface-variant)' }}>Loading listings...</p>}
      {error && <p style={{ color: 'var(--color-error)' }}>{error}</p>}

      {!loading && !error && filteredListings.length === 0 && (
        <div className="jobs-empty" style={{ background: 'var(--color-surface-card)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="material-symbols-outlined">search_off</span>
          <h3>No Job Listings Found</h3>
          <p>You haven't posted any job listings in this category yet.</p>
          {activeTab === 'ALL' && (
            <button className="btn btn-gold" style={{ marginTop: 16 }} onClick={handleOpenCreateModal}>
              Create Your First Job Listing
            </button>
          )}
        </div>
      )}

      {!loading && !error && filteredListings.length > 0 && (
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredListings.map(listing => (
            <div key={listing.id} className="jobs-app-card" style={{ padding: '24px', position: 'relative' }}>
              <div className="jobs-app-logo">
                <span className="material-symbols-outlined">work</span>
              </div>
              <div className="jobs-app-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 className="jobs-app-title" style={{ fontSize: 17 }}>{listing.title}</h3>
                  {listing.featured && (
                    <span className="job-card-featured-badge" style={{ position: 'static', padding: '2px 8px' }}>Featured</span>
                  )}
                </div>
                <p className="jobs-app-company" style={{ color: 'var(--color-primary-container)' }}>
                  {listing.department} · {listing.location} · {listing.employmentType.replace('_', ' ')}
                </p>
                <div className="job-card-meta" style={{ marginTop: 12 }}>
                  <span className="job-card-meta-item">
                    <span className="material-symbols-outlined">payments</span>
                    {listing.salaryLabel}
                  </span>
                  <span className="job-card-meta-item">
                    <span className="material-symbols-outlined">visibility</span>
                    {listing.viewCount || 0} views
                  </span>
                  <span className="job-card-meta-item">
                    <span className="material-symbols-outlined">group</span>
                    {listing.applicationCount || 0} applications
                  </span>
                </div>
              </div>
              
              <div className="jobs-app-right" style={{ justifyContent: 'center' }}>
                <span className={`jobs-status-badge ${listing.status?.toLowerCase() || 'draft'}`} style={{ textTransform: 'capitalize' }}>
                  {listing.status?.toLowerCase()}
                </span>
                
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button 
                    className="btn btn-ghost" 
                    style={{ fontSize: 12, padding: '4px 10px' }}
                    onClick={() => handleOpenEditModal(listing)}
                    disabled={busyId === listing.id}
                  >
                    Edit
                  </button>
                  
                  {listing.status !== 'ACTIVE' ? (
                    <button 
                      className="btn btn-ghost" 
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => handleStatusChange(listing.id, 'ACTIVE')}
                      disabled={busyId === listing.id}
                    >
                      Publish
                    </button>
                  ) : (
                    <button 
                      className="btn btn-ghost" 
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => handleStatusChange(listing.id, 'PAUSED')}
                      disabled={busyId === listing.id}
                    >
                      Pause
                    </button>
                  )}

                  <button 
                    className="btn btn-ghost" 
                    style={{ fontSize: 12, padding: '4px 10px', color: 'var(--color-error)' }}
                    onClick={() => handleDelete(listing)}
                    disabled={busyId === listing.id}
                  >
                    {busyId === listing.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {modalOpen && (
        <div className="jobs-apply-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="jobs-apply-modal" onClick={e => e.stopPropagation()} style={{ width: '700px' }}>
            <div className="jobs-apply-modal-header">
              <h3>{editingListing ? 'Edit Job Listing' : 'Post New Job Listing'}</h3>
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Close</button>
            </div>
            
            <form onSubmit={handleSaveListing}>
              <div className="jobs-apply-modal-body">


                <div className="empr-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="jobs-apply-field">
                    <label>Job Title*</label>
                    <input type="text" required value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Senior Frontend Engineer" />
                  </div>
                  <div className="jobs-apply-field">
                    <label>Department*</label>
                    <input type="text" required value={formDept} onChange={e => setFormDept(e.target.value)} placeholder="Product Engineering" />
                  </div>
                  <div className="jobs-apply-field">
                    <label>Location*</label>
                    <input type="text" required value={formLoc} onChange={e => setFormLoc(e.target.value)} placeholder="Bengaluru · Remote / Hybrid" />
                  </div>
                  <div className="jobs-apply-field">
                    <label>Employment Type</label>
                    <select className="glass-input" value={formType} onChange={e => setFormType(e.target.value as any)}>
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="INTERNSHIP">Internship</option>
                    </select>
                  </div>
                  <div className="jobs-apply-field">
                    <label>Salary Min</label>
                    <input type="number" value={formSalMin} onChange={e => setFormSalMin(e.target.value)} placeholder="1200000" />
                  </div>
                  <div className="jobs-apply-field">
                    <label>Salary Max</label>
                    <input type="number" value={formSalMax} onChange={e => setFormSalMax(e.target.value)} placeholder="1800000" />
                  </div>
                  <div className="jobs-apply-field">
                    <label>Currency</label>
                    <input type="text" value={formCurrency} onChange={e => setFormCurrency(e.target.value)} placeholder="INR" />
                  </div>
                  <div className="jobs-apply-field">
                    <label>Listing Status</label>
                    <select className="glass-input" value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="PAUSED">Paused</option>
                      <option value="FILLED">Filled</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                  <div className="jobs-apply-field">
                    <label>Experience Min (Years)</label>
                    <input type="number" value={formExpMin} onChange={e => setFormExpMin(e.target.value)} placeholder="3" />
                  </div>
                  <div className="jobs-apply-field">
                    <label>Experience Max (Years)</label>
                    <input type="number" value={formExpMax} onChange={e => setFormExpMax(e.target.value)} placeholder="6" />
                  </div>
                </div>

                <div className="jobs-apply-field" style={{ marginTop: 10 }}>
                  <label>Skills Required (comma-separated)</label>
                  <input type="text" value={formSkillsText} onChange={e => setFormSkillsText(e.target.value)} placeholder="React, TypeScript, Node.js, GraphQL" />
                </div>

                <div className="jobs-apply-field">
                  <label>Description*</label>
                  <textarea required rows={5} value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Describe the role, responsibilities, culture, and team structure..." />
                </div>

                <div className="jobs-apply-field">
                  <label>Requirements (one per line)</label>
                  <textarea rows={4} value={formReqsText} onChange={e => setFormReqsText(e.target.value)} placeholder="3+ years of professional React experience&#10;Strong understanding of CSS frameworks&#10;Familiarity with containerization (Docker)" />
                </div>

                <div className="jobs-apply-field">
                  <label>Benefits (one per line)</label>
                  <textarea rows={4} value={formBenefitsText} onChange={e => setFormBenefitsText(e.target.value)} placeholder="Comprehensive Health Insurance&#10;Flexible remote work hours&#10;Annual learning and development stipend" />
                </div>

                <div className="jobs-apply-field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <input type="checkbox" id="featured" checked={formFeatured} onChange={e => setFormFeatured(e.target.checked)} style={{ width: 'auto' }} />
                  <label htmlFor="featured" style={{ margin: 0, cursor: 'pointer' }}>Mark listing as Featured (shows prominently on search pages)</label>
                </div>
              </div>
              
              <div className="jobs-apply-modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-gold">
                  {editingListing ? 'Save Changes' : 'Post Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
