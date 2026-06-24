import { Link } from 'react-router-dom';
import {
  EMPLOYEE_PREMIUM_FEATURES,
  EMPLOYEE_PREMIUM_PLANS,
  formatInr,
  type EmployeePremiumPlanId,
} from '../../lib/employeePlans';
import './EmployeePricingPlans.css';

type EmployeePricingPlansProps = {
  onUpgrade?: (planId: EmployeePremiumPlanId) => void;
  buyBusy?: boolean;
  activePremiumPlan?: EmployeePremiumPlanId | null;
  isPremiumActive?: boolean;
};

function FeatureMark({ included }: { included: boolean }) {
  return included ? (
    <span className="emp-premium-check" aria-label="Included">
      <span className="material-symbols-outlined">check</span>
    </span>
  ) : (
    <span className="emp-premium-cross" aria-label="Not included">
      <span className="material-symbols-outlined">close</span>
    </span>
  );
}

export default function EmployeePricingPlans({
  onUpgrade,
  buyBusy = false,
  activePremiumPlan = null,
  isPremiumActive = false,
}: EmployeePricingPlansProps) {
  const sixMonth = EMPLOYEE_PREMIUM_PLANS.find((p) => p.id === '6M')!;
  const oneYear = EMPLOYEE_PREMIUM_PLANS.find((p) => p.id === '1Y')!;

  return (
    <div className="emp-premium-wrap">
      <div className="emp-premium-headline glass-card">
        <span className="emp-premium-crown" aria-hidden>
          👑
        </span>
        <h3 className="emp-premium-title">
          Upgrade to Premium Membership &amp; increase your chances of getting shortlisted
        </h3>
      </div>

      <div className="emp-premium-table-wrap glass-card">
        <table className="emp-premium-table">
          <thead>
            <tr>
              <th className="emp-premium-th-features">Features</th>
              <th className="emp-premium-th-col">Free Jobs</th>
              <th className="emp-premium-th-col emp-premium-th-highlight">
                {sixMonth.popular ? <span className="emp-premium-most-chosen">Most chosen</span> : null}
                {sixMonth.title}
              </th>
              <th className="emp-premium-th-col">{oneYear.title}</th>
            </tr>
            <tr className="emp-premium-price-row">
              <th />
              <th className="emp-premium-price-cell">
                <span className="emp-premium-price-free">Free</span>
              </th>
              <th className="emp-premium-price-cell emp-premium-price-highlight">
                <span className="emp-premium-price">₹{formatInr(sixMonth.priceInr)}</span>
                {sixMonth.perMonthLabel ? (
                  <span className="emp-premium-per-month">({sixMonth.perMonthLabel})</span>
                ) : null}
              </th>
              <th className="emp-premium-price-cell">
                <span className="emp-premium-price">₹{formatInr(oneYear.priceInr)}</span>
                {oneYear.originalPriceInr ? (
                  <span className="emp-premium-price-was">₹{formatInr(oneYear.originalPriceInr)}</span>
                ) : null}
              </th>
            </tr>
          </thead>
          <tbody>
            {EMPLOYEE_PREMIUM_FEATURES.map((feature) => (
              <tr key={feature.label}>
                <td className="emp-premium-feature-label">{feature.label}</td>
                <td className="emp-premium-mark-cell">
                  <FeatureMark included={feature.free} />
                </td>
                <td className="emp-premium-mark-cell emp-premium-mark-highlight">
                  <FeatureMark included={feature.premium} />
                </td>
                <td className="emp-premium-mark-cell">
                  <FeatureMark included={feature.premium} />
                </td>
              </tr>
            ))}
            <tr className="emp-premium-cta-row">
              <td />
              <td className="emp-premium-cta-cell">
                {onUpgrade ? (
                  !isPremiumActive ? (
                    <span className="emp-premium-current-label">Current plan</span>
                  ) : (
                    <span className="emp-premium-current-label">—</span>
                  )
                ) : (
                  <Link to="/register?role=employee" className="btn btn-ghost emp-premium-cta-ghost">
                    Get started
                  </Link>
                )}
              </td>
              <td className="emp-premium-cta-cell emp-premium-cta-highlight">
                {onUpgrade ? (
                  <button
                    type="button"
                    className="btn btn-primary emp-premium-cta-solid"
                    disabled={buyBusy || (isPremiumActive && activePremiumPlan === '6M')}
                    onClick={() => onUpgrade('6M')}
                  >
                    {isPremiumActive && activePremiumPlan === '6M' ? 'Active plan' : buyBusy ? 'Processing…' : 'Upgrade Now'}
                  </button>
                ) : (
                  <Link to="/register?role=employee&plan=premium6" className="btn btn-primary emp-premium-cta-solid">
                    Upgrade Now
                  </Link>
                )}
              </td>
              <td className="emp-premium-cta-cell">
                {onUpgrade ? (
                  <button
                    type="button"
                    className="btn btn-secondary emp-premium-cta-outline"
                    disabled={buyBusy || (isPremiumActive && activePremiumPlan === '1Y')}
                    onClick={() => onUpgrade('1Y')}
                  >
                    {isPremiumActive && activePremiumPlan === '1Y' ? 'Active plan' : buyBusy ? 'Processing…' : 'Upgrade Now'}
                  </button>
                ) : (
                  <Link to="/register?role=employee&plan=premium1y" className="btn btn-secondary emp-premium-cta-outline">
                    Upgrade Now
                  </Link>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
