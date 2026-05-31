import { useState, useEffect } from 'react';
import { getMyOffers, respondToOffer, type JobOfferApi } from '../../lib/jobsApi';
import '../jobs/Jobs.css';

export default function EmployeeOffers() {
  const [offers, setOffers] = useState<JobOfferApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOffers()
      .then(res => setOffers(res.offers))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  async function handleRespond(offerId: string, accept: boolean) {
    const msg = accept
      ? 'Are you sure you want to accept this offer?'
      : 'Are you sure you want to reject this offer?';
    if (!window.confirm(msg)) return;
    try {
      const res = await respondToOffer(offerId, accept);
      setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: res.status as any } : o));
    } catch (err) {
      console.error(err);
    }
  }

  function formatSalary(salary: number, currency: string): string {
    if (!salary) return 'Not specified';
    if (currency === 'INR') return `₹${(salary / 100000).toFixed(1)}L/yr`;
    return `$${Math.round(salary / 1000)}k/yr`;
  }

  return (
    <div className="jobs-offers-page">
      <div className="jobs-page-header">
        <h2>
          <span className="material-symbols-outlined" style={{ fontSize: 24, marginRight: 8, verticalAlign: -4, color: 'var(--color-secondary)' }}>card_giftcard</span>
          Job Offers
        </h2>
        <span style={{ fontSize: 14, color: 'var(--color-on-surface-variant)' }}>
          {offers.filter(o => o.status === 'PENDING').length} pending
        </span>
      </div>

      {loading ? (
        Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="jobs-offer-card">
            <div className="jobs-skeleton" style={{ height: 20, width: '50%', marginBottom: 12 }} />
            <div className="jobs-skeleton" style={{ height: 16, width: '30%', marginBottom: 16 }} />
            <div className="jobs-skeleton" style={{ height: 60, width: '100%' }} />
          </div>
        ))
      ) : offers.length === 0 ? (
        <div className="jobs-empty">
          <span className="material-symbols-outlined">card_giftcard</span>
          <h3>No offers yet</h3>
          <p>Keep applying and you'll receive offers from interested employers!</p>
        </div>
      ) : (
        offers.map(offer => (
          <div key={offer.id} className="jobs-offer-card animate-fade-in">
            <div className="jobs-offer-header">
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
                  {offer.jobTitle}
                </div>
                <div style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>
                  {offer.company}
                </div>
              </div>
              <span className={`jobs-status-badge ${offer.status.toLowerCase()}`}>
                {offer.status.charAt(0) + offer.status.slice(1).toLowerCase()}
              </span>
            </div>

            <div className="jobs-offer-salary">
              {formatSalary(offer.salary, offer.salaryCurrency)}
            </div>

            {offer.offerDetails && (
              <div className="jobs-offer-details">{offer.offerDetails}</div>
            )}

            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--color-on-surface-variant)', marginTop: 8 }}>
              {offer.startDate && (
                <span>Start: {new Date(offer.startDate).toLocaleDateString()}</span>
              )}
              {offer.expiresAt && (
                <span>Expires: {new Date(offer.expiresAt).toLocaleDateString()}</span>
              )}
            </div>

            {offer.status === 'PENDING' && (
              <div className="jobs-offer-actions">
                <button className="btn btn-primary" onClick={() => handleRespond(offer.id, true)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                  Accept Offer
                </button>
                <button className="btn btn-secondary" onClick={() => handleRespond(offer.id, false)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>cancel</span>
                  Decline
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
