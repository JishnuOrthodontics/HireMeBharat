import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import EmployerPricingPlans from '../../components/pricing/EmployerPricingPlans';
import EmployeePricingPlans from '../../components/pricing/EmployeePricingPlans';
import type { EmployerJobPackId } from '../../lib/employerPlans';
import { getEmployeePremiumPlan, type EmployeePremiumPlanId } from '../../lib/employeePlans';
import * as billingApi from '../../lib/billingApi';
import './Pricing.css';

function employeePlanIdFromCycle(cycle: string | null | undefined): EmployeePremiumPlanId | null {
  if (cycle === 'six_month') return '6M';
  if (cycle === 'one_year' || cycle === 'yearly') return '1Y';
  return null;
}

export default function Pricing() {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();
  const rawRole = userProfile?.role || 'EMPLOYEE';
  const isEmployer = rawRole === 'EMPLOYER';

  const [sandboxModal, setSandboxModal] = useState<{
    open: boolean;
    payload: billingApi.CheckoutPayload | null;
  }>({ open: false, payload: null });

  const { data: status, isLoading } = useQuery({
    queryKey: ['billing', 'status'],
    queryFn: billingApi.getBillingStatus,
  });

  const checkoutMutation = useMutation({
    mutationFn: billingApi.createCheckoutSession,
    onSuccess: (res) => {
      if (res.mode === 'sandbox') {
        const parsedUrl = new URL(res.checkoutUrl);
        const type = parsedUrl.searchParams.get('type') as billingApi.CheckoutPayload['type'];
        const plan = parsedUrl.searchParams.get('plan') as billingApi.CheckoutPayload['plan'];
        const cycle = parsedUrl.searchParams.get('cycle') as billingApi.CheckoutPayload['cycle'];
        const credits = parsedUrl.searchParams.get('credits') ? parseInt(parsedUrl.searchParams.get('credits')!, 10) : undefined;
        const jobId = parsedUrl.searchParams.get('jobId') || undefined;
        const employerPlanId = (parsedUrl.searchParams.get('pack') || undefined) as EmployerJobPackId | undefined;

        setSandboxModal({
          open: true,
          payload: { type, plan, cycle, creditsAmount: credits, jobId, employerPlanId },
        });
      } else {
        window.location.href = res.checkoutUrl;
      }
    },
  });

  const sandboxMutation = useMutation({
    mutationFn: billingApi.simulateSandboxCheckout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['billing', 'history'] });
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
  const isPremiumActive = activePlan === 'PREMIUM';
  const activePremiumPlan = isPremiumActive ? employeePlanIdFromCycle(status?.cycle) : null;

  const handleUpgradeEmployee = (planId: EmployeePremiumPlanId) => {
    const pack = getEmployeePremiumPlan(planId);
    if (!pack) return;
    checkoutMutation.mutate({
      type: 'SUBSCRIPTION',
      plan: 'PREMIUM',
      cycle: pack.billingCycle,
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
    <div className={`pricing-container animate-fade-in ${isEmployer ? 'pricing-container-employer' : 'pricing-container-employee'}`}>
      <div className="pricing-header">
        <span className="pricing-kicker">Transparent Monetization</span>
        <h1 className="pricing-title">Find Your Perfect Plan</h1>
        <p className="pricing-subtitle">
          {isEmployer
            ? 'Choose a job credit pack—each credit publishes one role and keeps it active for 15 days.'
            : 'Upgrade to Premium and increase your chances of getting shortlisted.'}
        </p>
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
        <EmployeePricingPlans
          onUpgrade={handleUpgradeEmployee}
          buyBusy={checkoutMutation.isPending}
          isPremiumActive={isPremiumActive}
          activePremiumPlan={activePremiumPlan}
        />
      )}

      {isEmployer && (
        <div className="credits-monetization-card glass-card">
          <div className="credits-info">
            <span className="material-symbols-outlined credits-icon">database</span>
            <div>
              <h3>Purchase Candidate Unlock Credits</h3>
              <p>Buy packs of credits to selectively unlock candidate contact details.</p>
            </div>
          </div>
          <div className="credits-actions">
            <button className="btn btn-ghost" onClick={() => handleBuyCredits(5)}>Buy 5 Credits (₹1,999)</button>
            <button className="btn btn-primary" onClick={() => handleBuyCredits(15)}>Buy 15 Credits (₹5,999)</button>
          </div>
        </div>
      )}

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
