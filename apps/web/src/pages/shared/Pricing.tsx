import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import EmployerPricingPlans from '../../components/pricing/EmployerPricingPlans';
import type { EmployerJobPackId } from '../../lib/employerPlans';
import * as billingApi from '../../lib/billingApi';
import './Pricing.css';

export default function Pricing() {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();
  const rawRole = userProfile?.role || 'EMPLOYEE';
  const isEmployer = rawRole === 'EMPLOYER';

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [sandboxModal, setSandboxModal] = useState<{
    open: boolean;
    payload: billingApi.CheckoutPayload | null;
  }>({ open: false, payload: null });

  // 1. Fetch current status
  const { data: status, isLoading } = useQuery({
    queryKey: ['billing', 'status'],
    queryFn: billingApi.getBillingStatus,
  });

  // 2. Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: billingApi.createCheckoutSession,
    onSuccess: (res) => {
      if (res.mode === 'sandbox') {
        // Trigger simulated checkout modal
        const parsedUrl = new URL(res.checkoutUrl);
        const type = parsedUrl.searchParams.get('type') as any;
        const plan = parsedUrl.searchParams.get('plan') as any;
        const cycle = parsedUrl.searchParams.get('cycle') as any;
        const credits = parsedUrl.searchParams.get('credits') ? parseInt(parsedUrl.searchParams.get('credits')!, 10) : undefined;
        const jobId = parsedUrl.searchParams.get('jobId') || undefined;
        const employerPlanId = (parsedUrl.searchParams.get('pack') || undefined) as EmployerJobPackId | undefined;

        setSandboxModal({
          open: true,
          payload: { type, plan, cycle, creditsAmount: credits, jobId, employerPlanId },
        });
      } else {
        // Redirect to Stripe checkout page
        window.location.href = res.checkoutUrl;
      }
    },
  });

  // 3. Sandbox Simulation Mutation
  const sandboxMutation = useMutation({
    mutationFn: billingApi.simulateSandboxCheckout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['billing', 'history'] });
      // Invalidate summaries
      if (isEmployer) {
        queryClient.invalidateQueries({ queryKey: ['employer', 'dashboardSummary'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['employee', 'dashboardSummary'] });
      }
      setSandboxModal({ open: false, payload: null });
    },
  });

  if (isLoading) {
    return (
      <div className="pricing-loading">
        <div className="spinner" />
        <p>Loading billing details...</p>
      </div>
    );
  }

  const activePlan = status?.plan || 'FREE';

  const handleSelectPlan = (planName: 'PRO' | 'PREMIUM') => {
    checkoutMutation.mutate({
      type: 'SUBSCRIPTION',
      plan: planName,
      cycle: billingCycle,
    });
  };

  const handleBuyJobPack = (employerPlanId: EmployerJobPackId) => {
    checkoutMutation.mutate({
      type: 'JOB_PACK',
      employerPlanId,
    });
  };

  const handleBuyCredits = (amount: number) => {
    checkoutMutation.mutate({
      type: 'CREDITS',
      creditsAmount: amount,
    });
  };

  const executeSimulatedPayment = () => {
    if (sandboxModal.payload) {
      sandboxMutation.mutate(sandboxModal.payload);
    }
  };

  return (
    <div className={`pricing-container animate-fade-in ${isEmployer ? 'pricing-container-employer' : ''}`}>
      <div className="pricing-header">
        <span className="pricing-kicker">Transparent Monetization</span>
        <h1 className="pricing-title">Find Your Perfect Plan</h1>
        <p className="pricing-subtitle">
          {isEmployer
            ? 'Choose a job credit pack—each credit publishes one role and keeps it active for 15 days.'
            : 'Unlock high-performance tools, priority candidate pipelines, and automated AI assistance.'}
        </p>

        {!isEmployer && (
        <div className="cycle-toggle-wrap">
          <button
            className={`cycle-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            className={`cycle-toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly <span className="save-badge">Save 20%</span>
          </button>
        </div>
        )}
      </div>

      {isEmployer ? (
        <>
          {status?.jobCredits != null && status.jobCredits > 0 ? (
            <p className="pricing-job-credits-banner">
              You have <strong>{status.jobCredits}</strong> job credit{status.jobCredits === 1 ? '' : 's'}
              {status.jobCreditsExpiresAt
                ? ` · use by ${new Date(status.jobCreditsExpiresAt).toLocaleDateString('en-IN')}`
                : ''}
            </p>
          ) : null}
          <EmployerPricingPlans
            onBuyPack={handleBuyJobPack}
            buyBusy={checkoutMutation.isPending}
          />
        </>
      ) : (
      <div className="pricing-grid">
        {/* Tier 1: Free Tier */}
        <div className="pricing-card glass-card">
          <div className="card-header">
            <h3 className="plan-name">Free Plan</h3>
            <p className="plan-tagline">Essential platform entry to search and browse.</p>
            <div className="plan-price">
              <span className="currency">₹</span>
              <span className="amount">0</span>
              <span className="period">/mo</span>
            </div>
          </div>
          <div className="plan-features">
            <ul>
              <li>
                <span className="material-symbols-outlined check-icon">done</span>
                Standard job search and applications
              </li>
              <li>
                <span className="material-symbols-outlined check-icon">done</span>
                Complete professional profile strength
              </li>
              <li>
                <span className="material-symbols-outlined check-icon">done</span>
                Standard email notifications
              </li>
              <li className="disabled">
                <span className="material-symbols-outlined close-icon">close</span>
                Premium profile search ranking boost
              </li>
              <li className="disabled">
                <span className="material-symbols-outlined close-icon">close</span>
                Advanced stats and insights
              </li>
            </ul>
          </div>
          <div className="card-action">
            <button className="btn btn-ghost w-100" disabled={activePlan === 'FREE'}>
              {activePlan === 'FREE' ? 'Current Plan' : 'Downgrade'}
            </button>
          </div>
        </div>

        {/* Candidate Premium */}
          <div className="pricing-card glass-card premium-card">
            <div className="premium-glow" />
            <div className="popular-badge">High Recommendation</div>
            <div className="card-header">
              <h3 className="plan-name">Candidate Premium</h3>
              <p className="plan-tagline">Double your matches and stand out instantly.</p>
              <div className="plan-price">
                <span className="currency">₹</span>
                <span className="amount">{billingCycle === 'yearly' ? '999' : '1,499'}</span>
                <span className="period">/mo</span>
              </div>
              {billingCycle === 'yearly' && <p className="billing-frequency">Billed annually (₹11,988/yr)</p>}
            </div>
            <div className="plan-features">
              <ul>
                <li>
                  <span className="material-symbols-outlined check-icon text-gold">star</span>
                  <strong>2x higher ranking in recruiter search results</strong>
                </li>
                <li>
                  <span className="material-symbols-outlined check-icon text-gold">star</span>
                  <strong>Advanced salary comparison stats per match</strong>
                </li>
                <li>
                  <span className="material-symbols-outlined check-icon text-gold">star</span>
                  Pulsing Gold Premium ring on avatar
                </li>
                <li>
                  <span className="material-symbols-outlined check-icon text-gold">star</span>
                  Priority support responses
                </li>
                <li>
                  <span className="material-symbols-outlined check-icon text-gold">star</span>
                  Sarah Jenkins prioritized advice sessions
                </li>
              </ul>
            </div>
            <div className="card-action">
              <button
                className="btn btn-primary w-100 btn-gold-gradient"
                disabled={activePlan === 'PREMIUM'}
                onClick={() => handleSelectPlan('PREMIUM')}
              >
                {activePlan === 'PREMIUM' ? 'Active Subscription' : 'Upgrade to Premium'}
              </button>
            </div>
          </div>
      </div>
      )}

      {/* Recruiter candidate unlock credits */}
      {isEmployer && (
        <div className="credits-monetization-card glass-card">
          <div className="credits-info">
            <span className="material-symbols-outlined credits-icon">database</span>
            <div>
              <h3>Purchase Candidate Unlock Credits</h3>
              <p>Buy packs of credits to selectively unlock candidate contact details without committing to a Pro subscription.</p>
            </div>
          </div>
          <div className="credits-actions">
            <button className="btn btn-ghost" onClick={() => handleBuyCredits(5)}>Buy 5 Credits (₹1,999)</button>
            <button className="btn btn-primary" onClick={() => handleBuyCredits(15)}>Buy 15 Credits (₹5,999)</button>
          </div>
        </div>
      )}

      {/* Developer Sandbox Checkout Simulation Modal */}
      {sandboxModal.open && (
        <div className="sandbox-modal-backdrop">
          <div className="sandbox-modal glass-card animate-fade-in">
            <div className="sandbox-header">
              <span className="material-symbols-outlined sandbox-icon">shield_person</span>
              <h2>Developer Sandbox checkout</h2>
            </div>
            <p>
              Stripe credentials are not configured in your `.env`. You have entered the sandbox simulator mode.
            </p>

            <div className="sandbox-summary-box">
              <p className="summary-title">Transaction Details</p>
              <div className="summary-row">
                <span>Purchase Type:</span>
                <strong>{sandboxModal.payload?.type}</strong>
              </div>
              {sandboxModal.payload?.plan && (
                <div className="summary-row">
                  <span>Plan:</span>
                  <strong>{sandboxModal.payload.plan} ({sandboxModal.payload.cycle})</strong>
                </div>
              )}
              {sandboxModal.payload?.employerPlanId && (
                <div className="summary-row">
                  <span>Job pack:</span>
                  <strong>{sandboxModal.payload.employerPlanId}</strong>
                </div>
              )}
              {sandboxModal.payload?.creditsAmount && (
                <div className="summary-row">
                  <span>Credits Pack:</span>
                  <strong>{sandboxModal.payload.creditsAmount} Unlock Credits</strong>
                </div>
              )}
            </div>

            <div className="sandbox-actions">
              <button className="btn btn-ghost" onClick={() => setSandboxModal({ open: false, payload: null })}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-success-action"
                disabled={sandboxMutation.isPending}
                onClick={executeSimulatedPayment}
              >
                {sandboxMutation.isPending ? 'Processing Simulation...' : 'Simulate Stripe Payment Success'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
