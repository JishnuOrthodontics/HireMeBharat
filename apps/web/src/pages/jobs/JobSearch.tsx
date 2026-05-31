import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { searchJobListings, type JobListingApi } from '../../lib/jobsApi';
import './Jobs.css';

const JOB_TYPES = [
  { value: 'ALL', label: 'All Types' },
  { value: 'FULL_TIME', label: 'Full-Time' },
  { value: 'PART_TIME', label: 'Part-Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERNSHIP', label: 'Internship' },
];

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

export default function JobSearch() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [listings, setListings] = useState<JobListingApi[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(params.get('q') || '');
  const [location, setLocation] = useState(params.get('location') || '');
  const [type, setType] = useState(params.get('type') || 'ALL');
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [page, setPage] = useState(0);
  const limit = 12;

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchJobListings({
        q: keyword || undefined,
        location: location || undefined,
        type: type !== 'ALL' ? type : undefined,
        sort,
        limit,
        offset: page * limit,
      });
      setListings(res.listings);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, location, type, sort, page]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  function handleSearch() {
    setPage(0);
    const q = new URLSearchParams();
    if (keyword) q.set('q', keyword);
    if (location) q.set('location', location);
    if (type !== 'ALL') q.set('type', type);
    if (sort !== 'newest') q.set('sort', sort);
    setParams(q);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      {/* Hero Search */}
      <div className="jobs-hero">
        <h1>
          Find Your <span className="text-gradient-emerald">Dream Job</span>
        </h1>
        <p>Discover opportunities from top companies across India and beyond</p>

        <div className="jobs-search-bar">
          <input
            type="text"
            placeholder="Job title, keyword, or company..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <input
            type="text"
            placeholder="Location..."
            value={location}
            onChange={e => setLocation(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button className="jobs-search-btn" onClick={handleSearch}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, marginRight: 4 }}>search</span>
            Search
          </button>
        </div>

        {/* Type Filters */}
        <div className="jobs-filters">
          {JOB_TYPES.map(t => (
            <button
              key={t.value}
              className={`jobs-filter-chip ${type === t.value ? 'active' : ''}`}
              onClick={() => { setType(t.value); setPage(0); }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="jobs-results-header">
        <span className="jobs-results-count">
          {loading ? 'Searching...' : `${total} job${total !== 1 ? 's' : ''} found`}
        </span>
        <select
          className="jobs-sort-select"
          value={sort}
          onChange={e => { setSort(e.target.value); setPage(0); }}
        >
          <option value="newest">Newest First</option>
          <option value="salary_high">Highest Salary</option>
          <option value="salary_low">Lowest Salary</option>
        </select>
      </div>

      {/* Job Grid */}
      <div className="jobs-grid">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="job-card" style={{ minHeight: 220 }}>
              <div className="jobs-skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }} />
              <div className="jobs-skeleton" style={{ height: 20, width: '80%', marginBottom: 16 }} />
              <div className="jobs-skeleton" style={{ height: 14, width: '50%', marginBottom: 8 }} />
              <div className="jobs-skeleton" style={{ height: 14, width: '40%', marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <div className="jobs-skeleton" style={{ height: 24, width: 60, borderRadius: 12 }} />
                <div className="jobs-skeleton" style={{ height: 24, width: 70, borderRadius: 12 }} />
              </div>
            </div>
          ))
        ) : listings.length === 0 ? (
          <div className="jobs-empty" style={{ gridColumn: '1 / -1' }}>
            <span className="material-symbols-outlined">work_off</span>
            <h3>No jobs found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          listings.map((job, idx) => (
            <div
              key={job.id}
              className={`job-card ${job.featured ? 'featured' : ''}`}
              onClick={() => navigate(`/jobs/${job.id}`)}
              style={{ animationDelay: `${idx * 50}ms`, animation: 'fadeInUp 0.4s ease forwards', opacity: 0 }}
            >
              {job.featured && <span className="job-card-featured-badge">★ Featured</span>}
              <div className="job-card-header">
                <div className="job-card-logo">
                  {job.companyLogoUrl ? (
                    <img src={job.companyLogoUrl} alt={job.company} />
                  ) : (
                    (job.company || 'C').charAt(0)
                  )}
                </div>
                <div>
                  <div className="job-card-company">{job.company}</div>
                  <div className="job-card-title">{job.title}</div>
                </div>
              </div>

              <div className="job-card-meta">
                <span className="job-card-meta-item">
                  <span className="material-symbols-outlined">location_on</span>
                  {job.location || 'Remote'}
                </span>
                <span className="job-card-meta-item">
                  <span className="material-symbols-outlined">schedule</span>
                  {job.employmentType?.replace('_', '-') || 'Full-Time'}
                </span>
                {(job.experienceMin > 0 || job.experienceMax > 0) && (
                  <span className="job-card-meta-item">
                    <span className="material-symbols-outlined">trending_up</span>
                    {job.experienceMin}–{job.experienceMax} yrs
                  </span>
                )}
              </div>

              {job.skills.length > 0 && (
                <div className="job-card-skills">
                  {job.skills.slice(0, 4).map(s => (
                    <span key={s} className="chip chip-emerald">{s}</span>
                  ))}
                  {job.skills.length > 4 && (
                    <span className="chip">+{job.skills.length - 4}</span>
                  )}
                </div>
              )}

              <div className="job-card-footer">
                <span className="job-card-salary">{job.salaryLabel || 'Not disclosed'}</span>
                <span className="job-card-posted">{timeAgo(job.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="jobs-pagination">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            ← Previous
          </button>
          <span style={{ padding: '8px 16px', fontSize: 14, color: 'var(--color-on-surface-variant)' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
