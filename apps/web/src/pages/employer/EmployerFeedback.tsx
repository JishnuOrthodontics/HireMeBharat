import { useState } from 'react';
import { submitFeedback } from '../../lib/jobsApi';
import '../jobs/Jobs.css';

export default function EmployerFeedback() {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (rating === 0) { setError('Please select a rating'); return; }
    if (feedback.trim().length < 5) { setError('Please provide at least a few words of feedback'); return; }
    setSubmitting(true);
    setError('');
    try {
      await submitFeedback({ rating, feedback: feedback.trim() });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="jobs-feedback-page">
        <div className="jobs-empty" style={{ padding: '80px 24px' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-primary-container)', fontSize: 64 }}>check_circle</span>
          <h3>Thank you for your feedback!</h3>
          <p>Your input helps us improve the platform for employers and job seekers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="jobs-feedback-page">
      <div className="jobs-page-header">
        <h2>
          <span className="material-symbols-outlined" style={{ fontSize: 24, marginRight: 8, verticalAlign: -4, color: 'var(--color-secondary)' }}>rate_review</span>
          Platform Feedback
        </h2>
      </div>

      <div className="jobs-feedback-form">
        <p style={{ fontSize: 15, color: 'var(--color-on-surface-variant)', marginBottom: 20 }}>
          How would you rate your overall recruitment experience on HireMeBharat?
        </p>

        <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--color-on-surface-variant)' }}>Your Rating</div>
        <div className="jobs-rating-stars">
          {[1, 2, 3, 4, 5].map(star => (
            <span
              key={star}
              className={`material-symbols-outlined jobs-rating-star ${star <= rating ? 'active' : ''}`}
              onClick={() => setRating(star)}
            >
              {star <= rating ? 'star' : 'star'}
            </span>
          ))}
        </div>

        <div className="jobs-apply-field">
          <label>Tell us about your experience</label>
          <textarea
            rows={5}
            placeholder="What parts of the candidate review and job listing creation went well? What could we improve?"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'var(--color-surface-container)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-default)',
              color: 'var(--color-on-surface)',
              fontSize: 14,
              resize: 'vertical',
            }}
          />
        </div>

        {error && (
          <p style={{ color: 'var(--color-error)', fontSize: 14, marginBottom: 12 }}>{error}</p>
        )}

        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  );
}
