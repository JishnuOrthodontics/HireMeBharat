export interface CandidateProfile {
  userId: string;
  skills?: string[];
  yearsExperience?: number;
  expectedCtc?: number;
  expectedCurrency?: string;
  location?: string;
  openToRelocation?: boolean;
  headline?: string;
  about?: string;
  experience?: Array<{ title: string; company: string; years: number }>;
}

export interface JobListing {
  _id?: any;
  title: string;
  company?: string;
  location: string;
  employmentType?: string;
  description?: string;
  requirements?: string[];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  experienceMin?: number;
  experienceMax?: number;
  skills?: string[];
  department?: string;
  employerUid?: string;
}

export interface MatchBreakdown {
  skillsScore: number;
  experienceScore: number;
  salaryScore: number;
  locationScore: number;
  industryScore: number;
}

export interface ScoringResult {
  score: number;
  breakdown: MatchBreakdown;
}

/**
 * Normalizes a string (lowercase, trims whitespace, removes non-alphanumeric).
 */
function normalizeString(val: string): string {
  return String(val || '').trim().toLowerCase();
}

/**
 * Currency converter helper (uses a stable exchange rate: 1 USD = 85 INR)
 * Converts everything to USD for standardized comparison.
 */
function convertToUsd(amount: number, currency: string): number {
  const cur = normalizeString(currency).toUpperCase();
  if (cur === 'INR') return amount / 85;
  if (cur === 'EUR') return amount * 1.08;
  if (cur === 'GBP') return amount * 1.25;
  return amount; // default or USD
}

/**
 * 1. Skills Overlap Scoring (Weight: 25%)
 * Calculates percentage of required job skills possessed by the candidate.
 * Substring-tolerant (e.g. "React" matches "React.js").
 */
export function calculateSkillsScore(profileSkills: string[], jobSkills: string[]): number {
  if (!jobSkills || jobSkills.length === 0) return 100;
  if (!profileSkills || profileSkills.length === 0) return 0;

  const normalizedProfile = profileSkills.map(s => normalizeString(s)).filter(Boolean);
  const normalizedJob = jobSkills.map(s => normalizeString(s)).filter(Boolean);

  if (normalizedJob.length === 0) return 100;

  let matched = 0;
  for (const required of normalizedJob) {
    const isMatched = normalizedProfile.some(candSkill => 
      candSkill === required || 
      candSkill.includes(required) || 
      required.includes(candSkill)
    );
    if (isMatched) {
      matched++;
    }
  }

  return Math.round((matched / normalizedJob.length) * 100);
}

/**
 * 2. Experience Level Matching (Weight: 20%)
 * Fits candidate's years of experience against job min/max bounds.
 */
export function calculateExperienceScore(
  profileYears: number,
  jobMinYears: number,
  jobMaxYears: number
): number {
  const min = Math.max(0, jobMinYears || 0);
  const max = Math.max(0, jobMaxYears || 0);

  // If job doesn't specify experience requirements, candidate fits perfectly
  if (min === 0 && max === 0) return 100;

  // Perfect Fit
  if (profileYears >= min && (max === 0 || profileYears <= max)) {
    return 100;
  }

  // Under-qualified: scale linearly
  if (profileYears < min) {
    if (min === 0) return 100;
    return Math.round(Math.max(0, (profileYears / min) * 100));
  }

  // Over-qualified: apply mild buffer deduction (max 30% reduction down to 70)
  if (max > 0 && profileYears > max) {
    const excess = profileYears - max;
    return Math.round(Math.max(70, 100 - excess * 5));
  }

  return 100;
}

/**
 * 3. Salary Range Compatibility (Weight: 20%)
 * Matches expected compensation with job budget range.
 */
export function calculateSalaryScore(
  expectedCtc: number,
  expectedCurrency: string,
  salaryMin: number,
  salaryMax: number,
  salaryCurrency: string
): number {
  // If job has no max salary, it's open budget, return 100
  if (!salaryMax) return 100;
  // If candidate didn't specify expectations, assume acceptable
  if (!expectedCtc) return 100;

  const candUsd = convertToUsd(expectedCtc, expectedCurrency || 'USD');
  const jobMaxUsd = convertToUsd(salaryMax, salaryCurrency || 'INR');

  // Candidate expectations are within budget
  if (candUsd <= jobMaxUsd) return 100;

  // Over budget: degrade score based on percentage excess
  const excessRatio = (candUsd - jobMaxUsd) / jobMaxUsd;
  return Math.round(Math.max(0, 100 - excessRatio * 100));
}

/**
 * 4. Location Preference Matching (Weight: 20%)
 * Compares job location and candidate location, respecting relocation settings.
 */
export function calculateLocationScore(
  profileLocation: string,
  jobLocation: string,
  openToRelocation: boolean
): number {
  const jLoc = normalizeString(jobLocation);
  const pLoc = normalizeString(profileLocation);

  // 100% remote job is perfect for everyone
  if (jLoc.includes('remote')) return 100;

  // Exact or direct substring match
  if (pLoc && (jLoc === pLoc || jLoc.includes(pLoc) || pLoc.includes(jLoc))) {
    return 100;
  }

  // Relocation settings
  if (openToRelocation) {
    return 85;
  }

  return 20;
}

/**
 * 5. Industry & Domain Affinity (Weight: 15%)
 * Calculates text overlap Jaccard similarity (ignoring stopwords) between candidate and job descriptions.
 */
export function calculateIndustryScore(
  profileHeadline: string,
  profileAbout: string,
  profileSkills: string[],
  jobTitle: string,
  jobDepartment: string,
  jobDescription: string
): number {
  const stopWords = new Set([
    'and', 'the', 'a', 'of', 'to', 'for', 'in', 'with', 'on', 'at', 'by', 'an', 'is', 'are', 'that', 
    'this', 'from', 'as', 'our', 'we', 'you', 'your', 'i', 'my', 'me', 'it', 'its', 'be', 'or', 'as'
  ]);

  const tokenize = (text: string): string[] => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 1 && !stopWords.has(token));
  };

  const jobText = `${jobTitle} ${jobDepartment || ''} ${jobDescription || ''}`;
  const candText = `${profileHeadline || ''} ${profileAbout || ''} ${(profileSkills || []).join(' ')}`;

  const jobTokens = new Set(tokenize(jobText));
  const candTokens = new Set(tokenize(candText));

  if (jobTokens.size === 0 || candTokens.size === 0) return 30; // Baseline score if text is missing

  // Jaccard similarity intersection / union
  let intersectionSize = 0;
  for (const t of jobTokens) {
    if (candTokens.has(t)) {
      intersectionSize++;
    }
  }

  const unionSize = jobTokens.size + candTokens.size - intersectionSize;
  const jaccard = intersectionSize / unionSize;

  // Natural language overlaps are sparse; scale Jaccard up nicely
  return Math.min(100, Math.round(jaccard * 400) + 30);
}

/**
 * Calculates overall weighted compatibility score.
 */
export function calculateMatchScore(profile: CandidateProfile, job: JobListing): ScoringResult {
  const skillsScore = calculateSkillsScore(profile.skills || [], job.skills || []);
  const experienceScore = calculateExperienceScore(
    profile.yearsExperience || 0,
    job.experienceMin || 0,
    job.experienceMax || 0
  );
  const salaryScore = calculateSalaryScore(
    profile.expectedCtc || 0,
    profile.expectedCurrency || 'USD',
    job.salaryMin || 0,
    job.salaryMax || 0,
    job.salaryCurrency || 'INR'
  );
  const locationScore = calculateLocationScore(
    profile.location || '',
    job.location || '',
    Boolean(profile.openToRelocation)
  );
  
  // Scans all experience titles in addition to headline and about
  const expTitles = (profile.experience || []).map(e => e.title).join(' ');
  const fullHeadline = `${profile.headline || ''} ${expTitles}`;
  
  const industryScore = calculateIndustryScore(
    fullHeadline,
    profile.about || '',
    profile.skills || [],
    job.title,
    job.department || '',
    job.description || ''
  );

  // Weights: Skills: 25%, Experience: 20%, Salary: 20%, Location: 20%, Industry: 15%
  const totalScore = Math.round(
    (skillsScore * 0.25) +
    (experienceScore * 0.20) +
    (salaryScore * 0.20) +
    (locationScore * 0.20) +
    (industryScore * 0.15)
  );

  return {
    score: Math.max(0, Math.min(100, totalScore)),
    breakdown: {
      skillsScore,
      experienceScore,
      salaryScore,
      locationScore,
      industryScore,
    }
  };
}
