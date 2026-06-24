import { Link } from 'react-router-dom';
import {
  EMPLOYER_ENTERPRISE_FEATURES,
  EMPLOYER_JOB_PACKS,
  formatInr,
  type EmployerJobPackId,
} from '../../lib/employerPlans';
import './EmployerPricingPlans.css';

type EmployerPricingPlansProps = {
  /** When set, Buy Now calls this (logged-in employer checkout). */
  onBuyPack?: (packId: EmployerJobPackId) => void;
  buyBusy?: boolean;
};

export default function EmployerPricingPlans({
  onBuyPack,
  buyBusy = false,
}: EmployerPricingPlansProps) {
  return (
    <div className="employer-pricing-wrap">
      <div className="employer-pricing-grid">
        {EMPLOYER_JOB_PACKS.map((plan) => (
          <div
            key={plan.id}
            className={`employer-pricing-card glass-card ${plan.popular ? 'employer-pricing-card-popular' : ''}`}
          >
            {plan.popular ? <div className="employer-popular-badge">Most Popular</div> : null}
            <div className="employer-pricing-card-head">
              <h3 className="employer-plan-title">{plan.title}</h3>
              <p className="employer-plan-subtitle">{plan.subtitle}</p>
            </div>
            <ul className="employer-plan-features">
              <li>
                <span className="material-symbols-outlined">work</span>
                <span>
                  <strong>{plan.jobCredits} Job credits</strong>
                </span>
              </li>
              <li>
                <span className="material-symbols-outlined">calendar_month</span>
                <span>Use these credits in {plan.creditValidityDays} days</span>
              </li>
              <li>
                <span className="material-symbols-outlined">schedule</span>
                <span>Each job stays active for {plan.jobActiveDays} days</span>
              </li>
            </ul>
            <div className="employer-plan-pricing">
              <div className="employer-price-row">
                <span className="employer-price-current">₹{formatInr(plan.priceInr)}</span>
                <span className="employer-discount-tag">{plan.discountLabel}</span>
              </div>
              <span className="employer-price-was">₹{formatInr(plan.originalPriceInr)}</span>
            </div>
            <div className="employer-plan-cta">
              {onBuyPack ? (
                <button
                  type="button"
                  className="btn btn-primary w-100 employer-buy-btn"
                  disabled={buyBusy}
                  onClick={() => onBuyPack(plan.id)}
                >
                  {buyBusy ? 'Processing…' : 'Buy Now'}
                </button>
              ) : (
                <Link
                  to={`/register?role=employer&pack=${plan.id}`}
                  className="btn btn-primary w-100 employer-buy-btn"
                >
                  Buy Now
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="employer-enterprise-card glass-card">
        <div className="employer-enterprise-copy">
          <h3 className="employer-enterprise-title">Want a personalised plan?</h3>
          <p className="employer-enterprise-lead">
            Unlock limitless growth with advanced features and support. Contact our sales team for custom pricing.
          </p>
          <ul className="employer-enterprise-features">
            {EMPLOYER_ENTERPRISE_FEATURES.map((feature) => (
              <li key={feature}>
                <span className="material-symbols-outlined">check_circle</span>
                {feature}
              </li>
            ))}
          </ul>
          <Link to="/contact" className="btn btn-secondary employer-contact-sales-btn">
            Contact sales
          </Link>
        </div>
        <div className="employer-enterprise-visual" aria-hidden>
          <span className="material-symbols-outlined employer-enterprise-icon">touch_app</span>
        </div>
      </div>
    </div>
  );
}
