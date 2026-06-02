import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { searchJobListings, getJobAutocompleteSuggestions, type JobListingApi } from '../../lib/jobsApi';
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
  const currentLoc = useLocation();
  
  // Core states
  const [listings, setListings] = useState<JobListingApi[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Search parameters states
  const [keyword, setKeyword] = useState(params.get('q') || '');
  const [location, setLocation] = useState(params.get('location') || '');
  const [type, setType] = useState(params.get('type') || 'ALL');
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [page, setPage] = useState(0);
  const limit = 12;

  // Autocomplete suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Facet filtering states
  const [selectedSkills, setSelectedSkills] = useState<string>('');
  const [selectedSalaryMin, setSelectedSalaryMin] = useState<number | undefined>(undefined);
  const [selectedSalaryMax, setSelectedSalaryMax] = useState<number | undefined>(undefined);
  const [selectedExperienceMin, setSelectedExperienceMin] = useState<number | undefined>(undefined);

  // Dynamic Facets returned by backend Atlas Search Meta
  const [facets, setFacets] = useState<{
    locations: { label: string; count: number }[];
    skills: { label: string; count: number }[];
    employmentTypes: { label: string; count: number }[];
    salaryRanges: { id: string; label: string; count: number }[];
    experienceLevels: { id: string; label: string; count: number }[];
  }>({
    locations: [],
    skills: [],
    employmentTypes: [],
    salaryRanges: [],
    experienceLevels: []
  });

  // Fetch dynamic listings and facets
  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchJobListings({
        q: keyword || undefined,
        location: location || undefined,
        type: type !== 'ALL' ? type : undefined,
        salaryMin: selectedSalaryMin || undefined,
        salaryMax: selectedSalaryMax || undefined,
        skills: selectedSkills || undefined,
        sort,
        limit,
        offset: page * limit,
      });
      setListings(res.listings || []);
      setTotal(res.total || 0);
      if (res.facets) {
        setFacets(res.facets);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, location, type, sort, page, selectedSalaryMin, selectedSalaryMax, selectedSkills]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Autocomplete typing logic (250ms debounce)
  useEffect(() => {
    if (!keyword.trim()) {
      setSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await getJobAutocompleteSuggestions(keyword);
        setSuggestions(res.suggestions || []);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [keyword]);

  // Click outside autocomplete dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSearch() {
    setPage(0);
    setShowSuggestions(false);
    const q = new URLSearchParams();
    if (keyword) q.set('q', keyword);
    if (location) q.set('location', location);
    if (type !== 'ALL') q.set('type', type);
    if (sort !== 'newest') q.set('sort', sort);
    setParams(q);
  }

  const handleSuggestionClick = (val: string) => {
    setKeyword(val);
    setShowSuggestions(false);
    setPage(0);
    const q = new URLSearchParams();
    q.set('q', val);
    if (location) q.set('location', location);
    if (type !== 'ALL') q.set('type', type);
    setParams(q);
  };

  const handleResetFilters = () => {
    setPage(0);
    setKeyword('');
    setLocation('');
    setType('ALL');
    setSelectedSkills('');
    setSelectedSalaryMin(undefined);
    setSelectedSalaryMax(undefined);
    setSelectedExperienceMin(undefined);
    setParams(new URLSearchParams());
  };

  const toggleSkill = (skill: string) => {
    setPage(0);
    setSelectedSkills(prev => (prev === skill ? '' : skill));
  };

  const toggleLocation = (loc: string) => {
    setPage(0);
    setLocation(prev => (prev === loc ? '' : loc));
  };

  const toggleSalary = (minVal: number, maxVal: number) => {
    setPage(0);
    if (selectedSalaryMin === minVal && selectedSalaryMax === maxVal) {
      setSelectedSalaryMin(undefined);
      setSelectedSalaryMax(undefined);
    } else {
      setSelectedSalaryMin(minVal);
      setSelectedSalaryMax(maxVal);
    }
  };

  const toggleExperience = (minVal: number) => {
    setPage(0);
    if (selectedExperienceMin === minVal) {
      setSelectedExperienceMin(undefined);
    } else {
      setSelectedExperienceMin(minVal);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      {/* Hero Search */}
      <div className="jobs-hero">
        <h1>
          Find Your <span className="text-gradient-emerald">Dream Job</span>
        </h1>
        <p>Discover opportunities with native Atlas Search technology</p>

        <div className="jobs-search-bar">
          <div className="jobs-search-bar-container" ref={dropdownRef}>
            <input
              type="text"
              placeholder="Job title, keyword, or company..."
              value={keyword}
              onChange={e => {
                setKeyword(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="jobs-autocomplete-dropdown">
                {suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    className="jobs-autocomplete-item"
                    onClick={() => handleSuggestionClick(s)}
                  >
                    <span className="material-symbols-outlined icon">search</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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

      {/* Main Content: 2-Column Layout */}
      <div className="jobs-main-content">
        
        {/* Left Column: Interactive Facets Sidebar */}
        <aside className="jobs-sidebar-facets">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Filter Results</h3>
            <button className="btn-facet-reset" onClick={handleResetFilters} style={{ width: 'auto', border: 'none', padding: '4px 8px' }}>
              Reset All
            </button>
          </div>

          {/* Locations Facet */}
          {facets.locations.length > 0 && (
            <div className="facet-group">
              <h4 className="facet-title">
                <span className="material-symbols-outlined">location_on</span>
                Top Locations
              </h4>
              <div className="facet-list">
                {facets.locations.map((loc) => (
                  <div
                    key={loc.label}
                    className={`facet-item ${location === loc.label ? 'active' : ''}`}
                    onClick={() => toggleLocation(loc.label)}
                  >
                    <span>{loc.label}</span>
                    <span className="facet-count">{loc.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills Facet */}
          {facets.skills.length > 0 && (
            <div className="facet-group">
              <h4 className="facet-title">
                <span className="material-symbols-outlined">star</span>
                Skills Required
              </h4>
              <div className="facet-list">
                {facets.skills.map((s) => (
                  <div
                    key={s.label}
                    className={`facet-item ${selectedSkills === s.label ? 'active' : ''}`}
                    onClick={() => toggleSkill(s.label)}
                  >
                    <span>{s.label}</span>
                    <span className="facet-count">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Salary Ranges Facet */}
          {facets.salaryRanges.length > 0 && (
            <div className="facet-group">
              <h4 className="facet-title">
                <span className="material-symbols-outlined">payments</span>
                Salary Ranges
              </h4>
              <div className="facet-list">
                {facets.salaryRanges.map((range) => {
                  const boundaries: Record<string, [number, number]> = {
                    '0': [0, 500000],
                    '500000': [500000, 1000000],
                    '1000000': [1000000, 2000000],
                    '2000000': [2000000, 3000000],
                    '3000000': [3000000, 10000000],
                  };
                  const bounds = boundaries[range.id];
                  const isActive = bounds && selectedSalaryMin === bounds[0] && selectedSalaryMax === bounds[1];
                  return (
                    <div
                      key={range.id}
                      className={`facet-item ${isActive ? 'active' : ''}`}
                      onClick={() => bounds && toggleSalary(bounds[0], bounds[1])}
                    >
                      <span>{range.label}</span>
                      <span className="facet-count">{range.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Experience Levels Facet */}
          {facets.experienceLevels.length > 0 && (
            <div className="facet-group">
              <h4 className="facet-title">
                <span className="material-symbols-outlined">trending_up</span>
                Experience Levels
              </h4>
              <div className="facet-list">
                {facets.experienceLevels.map((lvl) => {
                  const minExp = Number(lvl.id);
                  const isActive = selectedExperienceMin === minExp;
                  return (
                    <div
                      key={lvl.id}
                      className={`facet-item ${isActive ? 'active' : ''}`}
                      onClick={() => toggleExperience(minExp)}
                    >
                      <span>{lvl.label}</span>
                      <span className="facet-count">{lvl.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Right Column: Listings Grid & Pagination */}
        <div className="jobs-results-column" style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* Results Header */}
          <div className="jobs-results-header" style={{ maxWidth: 'none', margin: '0 0 16px', padding: 0 }}>
            <span className="jobs-results-count">
              {loading ? 'Searching...' : `${total} job${total !== 1 ? 's' : ''} found`}
            </span>
            <select
              className="jobs-sort-select"
              value={sort}
              onChange={e => { setSort(e.target.value); setPage(0); }}
            >
              {keyword ? <option value="newest">Relevance Match</option> : null}
              <option value="newest">Newest First</option>
              <option value="salary_high">Highest Salary</option>
              <option value="salary_low">Lowest Salary</option>
            </select>
          </div>

          {/* Job Grid */}
          <div className="jobs-grid" style={{ maxWidth: 'none', margin: 0, padding: '0 0 32px' }}>
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
                <p>Try adjusting your search filters or clear the sidebar facets.</p>
                <button className="btn btn-gold" style={{ marginTop: 16 }} onClick={handleResetFilters}>
                  Clear All Filters
                </button>
              </div>
            ) : (
              listings.map((job, idx) => (
                <div
                  key={job.id}
                  className={`job-card ${job.featured ? 'featured' : ''}`}
                  onClick={() => {
                    const isEmployeeDashboard = currentLoc.pathname.startsWith('/employee');
                    navigate(isEmployeeDashboard ? `/employee/jobs/${job.id}` : `/jobs/${job.id}`);
                  }}
                  style={{ animationDelay: `${idx * 40}ms`, animation: 'fadeInUp 0.4s ease forwards', opacity: 0 }}
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
            <div className="jobs-pagination" style={{ margin: '16px 0 0' }}>
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
      </div>
    </div>
  );
}
