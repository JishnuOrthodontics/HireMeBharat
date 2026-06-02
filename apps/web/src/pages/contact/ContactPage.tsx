import { useState } from 'react';
import './ContactPage.css';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    role: 'employer' as 'employer' | 'employee',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (name: string, value: string) => {
    if (!value.trim() && name !== 'company') {
      return 'This field is required';
    }
    if (name === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please enter a valid email';
    }
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleRoleChange = (role: 'employer' | 'employee') => {
    setFormData((prev) => ({ ...prev, role }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    Object.entries(formData).forEach(([key, value]) => {
      if (key !== 'company') {
        const error = validateField(key, value);
        if (error) newErrors[key] = error;
      }
    });

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
        setTimeout(() => setIsSubmitted(false), 5000);
      }, 1500);
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-bg-effects">
        <div className="contact-orb contact-orb-1" />
        <div className="contact-orb contact-orb-2" />
        <div className="contact-orb contact-orb-3" />
        <div className="contact-grid" />
      </div>

      <div className="container contact-container">
        <section className="contact-hero">
          <div className="contact-hero-badge">
            <span className="contact-badge-dot" />
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>mail</span>
            Get in Touch
          </div>

          <p className="contact-motto-text text-gradient-gold">
            Life changes from now, Right place for dreaming high
          </p>

          <h1 className="text-hero text-glow-hero" style={{ marginTop: 12 }}>
            Our concierge team is <span className="text-gradient-emerald">standing by</span>
          </h1>

          <p className="text-hero-sub contact-hero-subtitle">
            Have questions about our executive talent concierge? We're here to help you navigate your career or hiring journey.
          </p>
        </section>

        <div className="contact-main-grid">
          <div className="contact-form-wrapper glass-card">
            <h2 className="text-h3" style={{ marginBottom: 24 }}>Send us a message</h2>

            <form onSubmit={handleSubmit} className="contact-form">
              <div className="contact-input-group">
                <label htmlFor="name" className="contact-label">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className={`contact-input glass-input ${errors.name ? 'error' : ''}`}
                />
                {errors.name && <span className="contact-error">{errors.name}</span>}
              </div>

              <div className="contact-input-group">
                <label htmlFor="company" className="contact-label">Company (optional)</label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Your company name"
                  className="contact-input glass-input"
                />
              </div>

              <div className="contact-input-group">
                <label htmlFor="email" className="contact-label">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={`contact-input glass-input ${errors.email ? 'error' : ''}`}
                />
                {errors.email && <span className="contact-error">{errors.email}</span>}
              </div>

              <div className="contact-input-group">
                <label className="contact-label">I am</label>
                <div className="contact-role-switcher">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('employer')}
                    className={`role-switch-btn ${formData.role === 'employer' ? 'active employer' : ''}`}
                  >
                    <span className="material-symbols-outlined">business_center</span>
                    Employer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange('employee')}
                    className={`role-switch-btn ${formData.role === 'employee' ? 'active employee' : ''}`}
                  >
                    <span className="material-symbols-outlined">person_search</span>
                    Employee
                  </button>
                </div>
              </div>

              <div className="contact-input-group">
                <label htmlFor="message" className="contact-label">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="How can we help you?"
                  rows={5}
                  className={`contact-textarea glass-input ${errors.message ? 'error' : ''}`}
                />
                {errors.message && <span className="contact-error">{errors.message}</span>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary w-100 contact-submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    Sending...
                  </>
                ) : isSubmitted ? (
                  <>
                    <span className="contact-checkmark">✓</span>
                    Message Sent!
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">send</span>
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="contact-details-wrapper">
            <div className="contact-details-card glass-card">
              <h3 className="text-h3" style={{ marginBottom: 24 }}>Bangalore HQ</h3>

              <div className="contact-detail-item">
                <span className="material-symbols-outlined">location_on</span>
                <div>
                  <p className="text-body-md" style={{ marginBottom: 4 }}>HireMeBharat Private Limited</p>
                  <p className="text-caption" style={{ color: 'var(--color-on-surface-variant)' }}>
                    24, Residency Road, Ashok Nagar<br />
                    Bangalore, Karnataka 560025<br />
                    India
                  </p>
                </div>
              </div>

              <div className="contact-detail-item">
                <span className="material-symbols-outlined">phone</span>
                <div>
                  <p className="text-body-md" style={{ marginBottom: 4 }}>Private Concierge Hotline</p>
                  <p className="text-caption" style={{ color: 'var(--color-on-surface-variant)' }}>
                    +91 80 4090 1234
                  </p>
                </div>
              </div>

              <div className="contact-detail-item">
                <span className="material-symbols-outlined">email</span>
                <div>
                  <p className="text-body-md" style={{ marginBottom: 4 }}>Direct Email</p>
                  <p className="text-caption" style={{ color: 'var(--color-on-surface-variant)' }}>
                    concierge@hiremebharat.org
                  </p>
                </div>
              </div>
            </div>

            <div className="contact-status-badge">
              <span className="status-indicator" />
              <span className="text-caption">Available 24/7 for premium members</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}