import { useEffect, useState } from 'react';
import { getEmployerOffers } from '../../lib/jobsApi';
import '../jobs/Jobs.css';

const TABS = ['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as const;
type StatusTab = typeof TABS[number];

export default function EmployerOfferManagement() {
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOffers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getEmployerOffers();
      setOffers(res.offers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load job offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const filteredOffers = offers.filter(o => {
    if (activeTab === 'ALL') return true;
    return o.status === activeTab;
  });

  return (
    <div className="jobs-listing-manage">
      <div className="jobs-page-header">
        <div>
          <h2>
            <span className="material-symbols-outlined" style={{ fontSize: 24, marginRight: 8, verticalAlign: -4, color: 'var(--color-secondary)' }}>card_membership</span>
            Job Offer Management
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>
            Monitor and track formal job offers dispatched to candidates. Review candidate acceptance status and details.
          </p>
        </div>
      </div>

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

      {loading && <p style={{ color: 'var(--color-on-surface-variant)' }}>Loading sent offers...</p>}
      {error && <p style={{ color: 'var(--color-error)' }}>{error}</p>}

      {!loading && !error && filteredOffers.length === 0 && (
        <div className="jobs-empty" style={{ background: 'var(--color-surface-card)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="material-symbols-outlined">mail_outline</span>
          <h3>No Job Offers Found</h3>
          <p>No job offers have been sent out in this category yet.</p>
        </div>
      )}

      {!loading && !error && filteredOffers.length > 0 && (
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredOffers.map(offer => {
            const formattedSalary = new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: offer.salaryCurrency || 'INR',
              maximumFractionDigits: 0
            }).format(offer.salary);

            return (
              <div key={offer.id} className="jobs-offer-card" style={{ padding: '24px' }}>
                <div className="jobs-offer-header" style={{ marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                      {offer.applicantName}
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>
                      {offer.applicantEmail}
                    </p>
                  </div>
                  <span className={`jobs-status-badge ${offer.status.toLowerCase()}`}>
                    {offer.status.toLowerCase()}
                  </span>
                </div>

                <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-default)', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Role Offered:</span>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-secondary)', marginTop: 2 }}>{offer.jobTitle}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Salary Package (CTC):</span>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary-container)', marginTop: 2 }}>{formattedSalary}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Proposed Start Date:</span>
                    <p style={{ fontSize: 13, color: 'var(--color-on-surface)', marginTop: 2 }}>
                      {offer.startDate ? new Date(offer.startDate).toLocaleDateString() : 'Immediate'}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Offer Sent:</span>
                    <p style={{ fontSize: 13, color: 'var(--color-on-surface)', marginTop: 2 }}>
                      {offer.createdAt ? new Date(offer.createdAt).toLocaleDateString() : 'recently'}
                    </p>
                  </div>
                </div>

                <h4 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', marginBottom: 6 }}>Offer Details</h4>
                <div className="jobs-offer-details" style={{ margin: 0, padding: 12, fontSize: 13 }}>
                  {offer.offerDetails}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: 12, color: 'var(--color-on-surface-variant)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                  <span>Offer ID: {offer.id}</span>
                  <span>
                    Valid until: <strong>{offer.expiresAt ? new Date(offer.expiresAt).toLocaleDateString() : 'N/A'}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
