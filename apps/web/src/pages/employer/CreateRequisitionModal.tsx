import { useMemo, useState } from 'react';
import { createEmployerRequisition, type EmployerRequisitionStatus } from '../../lib/employerApi';

type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';

interface CreateRequisitionModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
  defaultStatus?: EmployerRequisitionStatus;
}

interface FormState {
  title: string;
  department: string;
  location: string;
  description: string;
  employmentType: EmploymentType;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  requirementsText: string;
  status: EmployerRequisitionStatus;
}

const initialState: FormState = {
  title: '',
  department: '',
  location: '',
  description: '',
  employmentType: 'FULL_TIME',
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'USD',
  requirementsText: '',
  status: 'DRAFT',
};

function validate(form: FormState): string | null {
  if (form.title.trim().length < 3 || form.title.trim().length > 160) return 'Title must be 3-160 characters.';
  if (form.department.trim().length < 2 || form.department.trim().length > 120) return 'Department must be 2-120 characters.';
  if (form.location.trim().length < 2 || form.location.trim().length > 160) return 'Location must be 2-160 characters.';
  if (form.description.trim().length < 10 || form.description.trim().length > 5000) return 'Description must be 10-5000 characters.';
  if (form.salaryCurrency.trim().length < 3 || form.salaryCurrency.trim().length > 8) return 'Currency must be 3-8 characters.';

  const salaryMin = form.salaryMin.trim() === '' ? 0 : Number(form.salaryMin);
  const salaryMax = form.salaryMax.trim() === '' ? 0 : Number(form.salaryMax);
  if (Number.isNaN(salaryMin) || salaryMin < 0) return 'Salary min must be a number greater than or equal to 0.';
  if (Number.isNaN(salaryMax) || salaryMax < 0) return 'Salary max must be a number greater than or equal to 0.';

  const requirements = form.requirementsText
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean);
  if (requirements.length > 50) return 'Requirements can have at most 50 lines.';
  if (requirements.some((r) => r.length > 200)) return 'Each requirement must be 200 characters or fewer.';

  return null;
}

export default function CreateRequisitionModal({
  open,
  onClose,
  onCreated,
  defaultStatus = 'DRAFT',
}: CreateRequisitionModalProps) {
  const [form, setForm] = useState<FormState>({ ...initialState, status: defaultStatus });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const requirementsPreviewCount = useMemo(
    () => form.requirementsText.split('\n').map((r) => r.trim()).filter(Boolean).length,
    [form.requirementsText]
  );

  if (!open) return null;

  const patch = (next: Partial<FormState>) => setForm((prev) => ({ ...prev, ...next }));

  const submit = async () => {
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const requirements = form.requirementsText
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean);
      const salaryMin = form.salaryMin.trim() === '' ? 0 : Number(form.salaryMin);
      const salaryMax = form.salaryMax.trim() === '' ? 0 : Number(form.salaryMax);

      await createEmployerRequisition({
        title: form.title.trim(),
        department: form.department.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
        employmentType: form.employmentType,
        requirements,
        salaryMin,
        salaryMax,
        salaryCurrency: form.salaryCurrency.trim().toUpperCase(),
        status: form.status,
      });

      await onCreated();
      setForm({ ...initialState, status: defaultStatus });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create requisition');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="empr-modal-backdrop" onClick={onClose}>
      <div className="empr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="empr-modal-header">
          <h3>Post New Role</h3>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>

        <div className="empr-modal-body">
          <div className="empr-form-grid">
            <label className="empr-form-field">
              <span>Role Title*</span>
              <input className="glass-input" value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder="VP of Product Engineering" />
            </label>
            <label className="empr-form-field">
              <span>Department*</span>
              <input className="glass-input" value={form.department} onChange={(e) => patch({ department: e.target.value })} placeholder="Engineering" />
            </label>
            <label className="empr-form-field">
              <span>Location*</span>
              <input className="glass-input" value={form.location} onChange={(e) => patch({ location: e.target.value })} placeholder="San Francisco · Hybrid" />
            </label>
            <label className="empr-form-field">
              <span>Employment Type</span>
              <select className="glass-input" value={form.employmentType} onChange={(e) => patch({ employmentType: e.target.value as EmploymentType })}>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </label>
            <label className="empr-form-field">
              <span>Salary Min</span>
              <input className="glass-input" inputMode="numeric" value={form.salaryMin} onChange={(e) => patch({ salaryMin: e.target.value })} placeholder="220000" />
            </label>
            <label className="empr-form-field">
              <span>Salary Max</span>
              <input className="glass-input" inputMode="numeric" value={form.salaryMax} onChange={(e) => patch({ salaryMax: e.target.value })} placeholder="300000" />
            </label>
            <label className="empr-form-field">
              <span>Currency</span>
              <input className="glass-input" value={form.salaryCurrency} onChange={(e) => patch({ salaryCurrency: e.target.value })} placeholder="USD" />
            </label>
            <label className="empr-form-field">
              <span>Status</span>
              <select className="glass-input" value={form.status} onChange={(e) => patch({ status: e.target.value as EmployerRequisitionStatus })}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="FILLED">Filled</option>
                <option value="CLOSED">Closed</option>
              </select>
            </label>
          </div>

          <label className="empr-form-field">
            <span>Description*</span>
            <textarea className="glass-input" style={{ minHeight: 110 }} value={form.description} onChange={(e) => patch({ description: e.target.value })} placeholder="Describe the role, responsibilities, and goals." />
          </label>

          <label className="empr-form-field">
            <span>Requirements (one per line)</span>
            <textarea
              className="glass-input"
              style={{ minHeight: 100 }}
              value={form.requirementsText}
              onChange={(e) => patch({ requirementsText: e.target.value })}
              placeholder={'10+ years engineering leadership\nAI/ML hiring experience'}
            />
            <small style={{ color: 'var(--color-on-surface-variant)' }}>{requirementsPreviewCount} requirement(s)</small>
          </label>

          {error && <p style={{ color: 'var(--color-error)', marginTop: 6 }}>{error}</p>}
        </div>

        <div className="empr-modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-gold" onClick={submit} disabled={submitting}>
            {submitting ? 'Posting...' : 'Post Role'}
          </button>
        </div>
      </div>
    </div>
  );
}

