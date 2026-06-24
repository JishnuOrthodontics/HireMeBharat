export type EmployerJobPackId = '1M' | '3M' | '6M';

export interface EmployerJobPackPlan {
  id: EmployerJobPackId;
  title: string;
  subtitle: string;
  jobCredits: number;
  creditValidityDays: number;
  jobActiveDays: number;
  priceInr: number;
  originalPriceInr: number;
  discountLabel: string;
  popular?: boolean;
}

export const EMPLOYER_JOB_PACKS: EmployerJobPackPlan[] = [
  {
    id: '1M',
    title: '1 Month',
    subtitle: 'Ideal for small teams',
    jobCredits: 3,
    creditValidityDays: 30,
    jobActiveDays: 15,
    priceInr: 1949,
    originalPriceInr: 2097,
    discountLabel: '15% OFF',
  },
  {
    id: '3M',
    title: '3 Months',
    subtitle: 'Perfect for growing businesses',
    jobCredits: 6,
    creditValidityDays: 90,
    jobActiveDays: 15,
    priceInr: 3649,
    originalPriceInr: 4194,
    discountLabel: '19% OFF',
    popular: true,
  },
  {
    id: '6M',
    title: '6 Months',
    subtitle: 'Best fit for larger hiring needs',
    jobCredits: 13,
    creditValidityDays: 180,
    jobActiveDays: 15,
    priceInr: 7099,
    originalPriceInr: 9087,
    discountLabel: '28% OFF',
  },
];

export const EMPLOYER_ENTERPRISE_FEATURES = [
  'Dedicated account manager',
  'Multiple logins & reports',
  'Multimedia WhatsApp invites',
  'Company branding & boosting',
  'ATS integration',
  'Valid up to 360 days',
];

export function formatInr(amount: number): string {
  return amount.toLocaleString('en-IN');
}

export function getEmployerJobPack(id: EmployerJobPackId): EmployerJobPackPlan | undefined {
  return EMPLOYER_JOB_PACKS.find((p) => p.id === id);
}
