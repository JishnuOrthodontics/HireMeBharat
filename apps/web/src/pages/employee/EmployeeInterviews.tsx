import { useState, useEffect } from 'react';
import { getMyInterviews, type JobInterviewApi } from '../../lib/jobsApi';
import '../jobs/Jobs.css';

export default function EmployeeInterviews() {
  const [interviews, setInterviews] = useState<JobInterviewApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyInterviews()
      .then(res => setInterviews(res.interviews))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  function parseDate(dateStr?: string | null) {
    if (!dateStr) return { day: '--', month: '---', time: '' };
    const d = new Date(dateStr);
    return {
      day: String(d.getDate()),
      month: d.toLocaleString('default', { month: 'short' }),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  return (
    <div className="jobs-interviews-page">
      <div className="jobs-page-header">
        <h2>
          <span className="material-symbols-outlined" style={{ fontSize: 24, marginRight: 8, verticalAlign: -4, color: '#ce93d8' }}>event</span>
          My Interviews
        </h2>
        <span style={{ fontSize: 14, color: 'var(--color-on-surface-variant)' }}>
          {interviews.length} upcoming
        </span>
      </div>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="jobs-interview-card">
            <div className="jobs-skeleton" style={{ width: 60, height: 60, borderRadius: 8 }} />
            <div style={{ flex: 1 }}>
              <div className="jobs-skeleton" style={{ height: 16, width: '50%', marginBottom: 8 }} />
              <div className="jobs-skeleton" style={{ height: 14, width: '40%' }} />
            </div>
          </div>
        ))
      ) : interviews.length === 0 ? (
        <div className="jobs-empty">
          <span className="material-symbols-outlined">event</span>
          <h3>No upcoming interviews</h3>
          <p>When employers schedule interviews, they'll appear here.</p>
        </div>
      ) : (
        interviews.map(interview => {
          const date = parseDate(interview.scheduledAt);
          return (
            <div key={interview.id} className="jobs-interview-card animate-fade-in">
              <div className="jobs-interview-date-badge">
                <span className="day">{date.day}</span>
                <span className="month">{date.month}</span>
              </div>
              <div className="jobs-interview-info">
                <div className="jobs-interview-title">{interview.jobTitle}</div>
                <div className="jobs-interview-meta">
                  <span>{interview.company}</span>
                  <span>🕐 {date.time}</span>
                  <span>{interview.type}</span>
                  <span>{interview.duration}</span>
                </div>
                {interview.notes && (
                  <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginTop: 6 }}>
                    {interview.notes}
                  </p>
                )}
              </div>
              {interview.meetingLink && (
                <a
                  href={interview.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>videocam</span>
                  Join
                </a>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
