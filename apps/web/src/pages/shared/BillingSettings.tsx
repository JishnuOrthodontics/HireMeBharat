import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as billingApi from '../../lib/billingApi';
import './BillingSettings.css';

export default function BillingSettings() {
  const navigate = useNavigate();

  // 1. Fetch current status
  const { data: status, isLoading: loadingStatus } = useQuery({
    queryKey: ['billing', 'status'],
    queryFn: billingApi.getBillingStatus,
  });

  // 2. Fetch history
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['billing', 'history'],
    queryFn: billingApi.getBillingHistory,
  });

  // 3. Portal mutation
  const portalMutation = useMutation({
    mutationFn: billingApi.createPortalSession,
    onSuccess: (res) => {
      // Redirect to Stripe hosted billing portal
      window.location.href = res.portalUrl;
    },
  });

  const isLoading = loadingStatus || loadingHistory;

  if (isLoading) {
    return (
      <div className="billing-loading">
        <div className="spinner" />
        <p>Loading billing dashboard...</p>
      </div>
    );
  }

  const activePlan = status?.plan || 'FREE';
  const role = status?.userRole || 'EMPLOYEE';
  const isEmployer = role === 'EMPLOYER';
  const credits = status?.credits || 0;
  const expiresAt = status?.expiresAt;

  const handleManageBilling = () => {
    portalMutation.mutate();
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="billing-settings animate-fade-in">
      <div className="billing-settings-header">
        <h2>Subscription & Billing Settings</h2>
        <p>Manage your billing profiles, active subscriptions, candidate unlock credits, and payment invoices.</p>
      </div>

      <div className="billing-cards-grid">
        {/* Card 1: Plan Details */}
        <div className="billing-details-card glass-card">
          <div className="card-top">
            <span className="card-kicker">Current Tier</span>
            <div className="plan-title-row">
              <h3>{activePlan === 'PRO' ? 'Employer Pro' : activePlan === 'PREMIUM' ? 'Candidate Premium' : 'Free Tier'}</h3>
              <span className={`plan-badge ${activePlan.toLowerCase()}`}>{activePlan}</span>
            </div>
            {activePlan !== 'FREE' && expiresAt && (
              <p className="renewal-text">
                Your plan is active and will renew on <strong>{formatDate(expiresAt)}</strong>.
              </p>
            )}
            {activePlan === 'FREE' && (
              <p className="renewal-text">
                Upgrade to unlock high-end candidate match scores, unlimited job postings, and dynamic search ranking boosts.
              </p>
            )}
          </div>
          <div className="card-actions">
            {activePlan === 'FREE' ? (
              <button className="btn btn-primary w-100" onClick={() => navigate(`/${role.toLowerCase()}/pricing`)}>
                View Upgrade Tiers
              </button>
            ) : (
              <button
                className="btn btn-ghost w-100"
                disabled={portalMutation.isPending}
                onClick={handleManageBilling}
              >
                {portalMutation.isPending ? 'Redirecting to Portal...' : 'Manage Payment / Cancel'}
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Credits Balance (Employer only) */}
        {isEmployer && (
          <div className="billing-details-card glass-card">
            <div className="card-top">
              <span className="card-kicker">Candidate Unlock Balance</span>
              <div className="plan-title-row">
                <h3>{credits} Credits</h3>
                <span className="plan-badge credits">Credits</span>
              </div>
              <p className="renewal-text">
                Unlock credits are spent to view full Candidate details (resumes, emails, contact profiles) without upgrading.
              </p>
            </div>
            <div className="card-actions">
              <button className="btn btn-primary w-100" onClick={() => navigate('/employer/pricing')}>
                Buy Credit Packs
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction History Section */}
      <div className="transaction-history-section">
        <h3>Invoice & Transaction History</h3>
        <p className="history-subtitle">Review all your previous platform purchases and active subscriptions receipts.</p>

        <div className="table-container glass-card">
          {(!history?.transactions || history.transactions.length === 0) ? (
            <div className="history-empty">
              <span className="material-symbols-outlined empty-icon">receipt_long</span>
              <p>No transaction history found.</p>
            </div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <div className="tx-desc-cell">
                        <span className="material-symbols-outlined tx-icon">
                          {tx.type === 'SUBSCRIPTION' ? 'autorenew' : tx.type === 'CREDITS' ? 'database' : 'campaign'}
                        </span>
                        <span>{tx.description}</span>
                      </div>
                    </td>
                    <td>{formatDate(tx.createdAt)}</td>
                    <td>{formatPrice(tx.amount)}</td>
                    <td>
                      <span className="status-badge success">Success</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
