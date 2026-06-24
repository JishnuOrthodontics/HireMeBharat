export type EmployeePremiumPlanId = '6M' | '1Y';

export type EmployeePremiumFeature = {
  label: string;
  free: boolean;
  premium: boolean;
};

export interface EmployeePremiumPlan {
  id: EmployeePremiumPlanId;
  title: string;
  priceInr: number;
  originalPriceInr?: number;
  perMonthLabel?: string;
  popular?: boolean;
  billingCycle: 'six_month' | 'one_year';
}

export const EMPLOYEE_PREMIUM_FEATURES: EmployeePremiumFeature[] = [
  { label: 'Apply to free jobs', free: true, premium: true },
  { label: 'Apply to Premium and Hot jobs', free: false, premium: true },
  { label: 'Appear above free job applicants', free: false, premium: true },
  { label: 'Career Role Fitment Assessment', free: false, premium: true },
  { label: 'Special access to Placement Drives, events, etc.', free: false, premium: true },
  { label: 'Premium Candidate Support', free: false, premium: true },
];

export const EMPLOYEE_PREMIUM_PLANS: EmployeePremiumPlan[] = [
  {
    id: '6M',
    title: 'Premium 6 Months',
    priceInr: 649,
    perMonthLabel: '₹108/mo',
    popular: true,
    billingCycle: 'six_month',
  },
  {
    id: '1Y',
    title: 'Premium 1 Year',
    priceInr: 899,
    originalPriceInr: 1298,
    billingCycle: 'one_year',
  },
];

export function formatInr(amount: number): string {
  return amount.toLocaleString('en-IN');
}

export function getEmployeePremiumPlan(id: EmployeePremiumPlanId): EmployeePremiumPlan | undefined {
  return EMPLOYEE_PREMIUM_PLANS.find((p) => p.id === id);
}
