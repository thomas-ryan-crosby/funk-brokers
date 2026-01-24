import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSaleProfile, setSaleProfile } from '../services/profileService';
import { SELLING_STEPS } from '../data/processSteps';
import AddressAutocomplete from '../components/AddressAutocomplete';
import './BeginSale.css';

const TOTAL_STEPS = 4;
const READINESS_OPTIONS = [
  'Improve curb appeal (lawn, landscaping, front door)',
  'Declutter and deep clean',
  'Address minor repairs (touch-ups, fixtures)',
  'Stage key rooms',
  'Enhance lighting (bulbs, natural light)',
];
const TIMELINE_OPTIONS = [
  { value: 'asap', label: 'As soon as possible' },
  { value: '3', label: 'Within 3 months' },
  { value: '6', label: 'Within 6 months' },
  { value: '12', label: 'Within 12 months' },
];
const CONDITION_OPTIONS = [
  { value: 'excellent', label: 'Excellent – move-in ready' },
  { value: 'good', label: 'Good – minor cosmetic updates' },
  { value: 'fair', label: 'Fair – some repairs needed' },
  { value: 'needs-work', label: 'Needs work – noticeable repairs' },
];

const BeginSale = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    ownershipConfirmed: false,
    condition: '',
    goals: '',
    targetPrice: '',
    timeline: '',
    readinessChecklist: [],
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/sign-in?redirect=/begin-sale');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadProfile();
    }
  }, [isAuthenticated, user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      if (location.state?.startFresh) {
        setLoading(false);
        return;
      }
      const profile = await getSaleProfile(user.uid);
      if (profile) {
        setForm((prev) => ({
          ...prev,
          address: profile.address || '',
          city: profile.city || '',
          state: profile.state || '',
          zipCode: profile.zipCode || '',
          ownershipConfirmed: !!profile.ownershipConfirmed,
          condition: profile.condition || '',
          goals: profile.goals || '',
          targetPrice: profile.targetPrice !== undefined ? String(profile.targetPrice) : '',
          timeline: profile.timeline || '',
          readinessChecklist: Array.isArray(profile.readinessChecklist) ? profile.readinessChecklist : [],
        }));
        if (profile.step && profile.step >= 1 && profile.step <= TOTAL_STEPS) {
          setStep(profile.step);
        }
      }
    } catch (err) {
      setError('Failed to load your sale profile.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveAndNext = async (next) => {
    setError(null);
    const toSave = {
      ...form,
      step: next,
      address: form.address?.trim(),
      city: form.city?.trim(),
      state: form.state?.trim(),
      zipCode: form.zipCode?.trim(),
    };
    try {
      setSaving(true);
      await setSaleProfile(user.uid, toSave);
      setStep(next);
    } catch (err) {
      setError('Failed to save. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const saveAndBack = async () => {
    setError(null);
    try {
      setSaving(true);
      await setSaleProfile(user.uid, { ...form, step: step - 1 });
      setStep((s) => s - 1);
    } catch (err) {
      setError('Failed to save. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleReadinessToggle = (item) => {
    setForm((prev) => ({
      ...prev,
      readinessChecklist: prev.readinessChecklist.includes(item)
        ? prev.readinessChecklist.filter((x) => x !== item)
        : [...prev.readinessChecklist, item],
    }));
  };

  const canProceed = () => {
    if (step === 1) {
      return form.address?.trim() && form.city?.trim() && form.state?.trim() && form.zipCode?.trim() && form.ownershipConfirmed;
    }
    if (step === 2) {
      return form.condition && form.targetPrice?.trim();
    }
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) {
      setError('Please complete all required fields.');
      return;
    }
    if (step < TOTAL_STEPS) {
      saveAndNext(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) saveAndBack();
  };

  const handleContinueToList = () => {
    const saleProfile = {
      address: form.address?.trim(),
      city: form.city?.trim(),
      state: form.state?.trim(),
      zipCode: form.zipCode?.trim(),
      targetPrice: form.targetPrice?.trim() ? parseFloat(form.targetPrice) : undefined,
      condition: form.condition,
      goals: form.goals,
      timeline: form.timeline,
      readinessChecklist: form.readinessChecklist,
    };
    try {
      sessionStorage.setItem('funk_saleProfile', JSON.stringify(saleProfile));
    } catch (e) { /* ignore */ }
    navigate('/list-property', { state: { saleProfile } });
  };

  if (authLoading || loading) {
    return (
      <div className="begin-sale-page">
        <div className="begin-sale-container">
          <div className="begin-sale-loading">Loading...</div>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const stepInfo = SELLING_STEPS[step - 1] || {};
  const isLast = step === TOTAL_STEPS;

  return (
    <div className="begin-sale-page">
      <div className="begin-sale-container">
        <h1>Begin your home sale</h1>
        <div className="begin-sale-stepper">Step {step} of {TOTAL_STEPS}</div>
        <h2 className="begin-sale-step-title">{stepInfo.title}</h2>
        {stepInfo.lead && <p className="begin-sale-lead">{stepInfo.lead}</p>}

        {error && <div className="begin-sale-error">{error}</div>}

        {step === 1 && (
          <div className="begin-sale-form">
            <div className="form-row">
              <div className="form-group full">
                <label>Street address *</label>
<AddressAutocomplete
                  value={form.address}
                  onAddressChange={(v) => handleChange('address', v)}
                  onAddressSelect={(obj) => setForm((prev) => ({ ...prev, ...obj }))}
                  placeholder="Start typing an address (e.g. 123 Main St)"
                  required
                />
              </div>
            </div>
            <div className="form-row form-row-multi">
              <div className="form-group">
                <label>City *</label>
                <input type="text" value={form.city} onChange={(e) => handleChange('city', e.target.value)} />
              </div>
              <div className="form-group">
                <label>State *</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
                  placeholder="e.g. CA"
                  maxLength={2}
                />
              </div>
              <div className="form-group">
                <label>ZIP code *</label>
                <input type="text" value={form.zipCode} onChange={(e) => handleChange('zipCode', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.ownershipConfirmed}
                  onChange={(e) => handleChange('ownershipConfirmed', e.target.checked)}
                />
                I confirm I am the owner or have authority to sell this home *
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="begin-sale-form">
            <div className="form-group">
              <label>Home condition *</label>
              <select value={form.condition} onChange={(e) => handleChange('condition', e.target.value)}>
                <option value="">Select condition</option>
                {CONDITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Your goals (optional)</label>
              <textarea
                value={form.goals}
                onChange={(e) => handleChange('goals', e.target.value)}
                placeholder="e.g. Maximize sale price, quick sale, flexibility on closing date"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Target or expected price ($) *</label>
              <input
                type="number"
                value={form.targetPrice}
                onChange={(e) => handleChange('targetPrice', e.target.value)}
                min={0}
                step={1000}
                placeholder="e.g. 450000"
              />
            </div>
            <div className="form-group">
              <label>When do you want to sell? *</label>
              <select value={form.timeline} onChange={(e) => handleChange('timeline', e.target.value)}>
                <option value="">Select timeline</option>
                {TIMELINE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="begin-sale-form">
            <p className="begin-sale-checklist-intro">Select items you plan to do or have done:</p>
            <div className="readiness-list">
              {READINESS_OPTIONS.map((item) => (
                <label key={item} className="readiness-item">
                  <input
                    type="checkbox"
                    checked={form.readinessChecklist.includes(item)}
                    onChange={() => handleReadinessToggle(item)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="begin-sale-summary">
            <div className="summary-block">
              <strong>Address:</strong> {[form.address, form.city, form.state, form.zipCode].filter(Boolean).join(', ')}
            </div>
            <div className="summary-block">
              <strong>Condition:</strong> {CONDITION_OPTIONS.find((o) => o.value === form.condition)?.label || form.condition || '—'}
            </div>
            {form.targetPrice && (
              <div className="summary-block">
                <strong>Target price:</strong> ${Number(form.targetPrice).toLocaleString()}
              </div>
            )}
            {form.timeline && (
              <div className="summary-block">
                <strong>Timeline:</strong> {TIMELINE_OPTIONS.find((o) => o.value === form.timeline)?.label || form.timeline}
              </div>
            )}
            {form.readinessChecklist?.length > 0 && (
              <div className="summary-block">
                <strong>Readiness:</strong>
                <ul>
                  {form.readinessChecklist.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="begin-sale-cta-copy">When you are ready, continue to add photos and publish your listing.</p>
            <button type="button" className="btn btn-primary btn-large" onClick={handleContinueToList}>
              Continue to List Property
            </button>
          </div>
        )}

        {!isLast && (
          <div className="begin-sale-actions">
            {step > 1 && (
              <button type="button" className="btn btn-secondary" onClick={handleBack} disabled={saving}>
                Back
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={handleNext} disabled={saving || !canProceed()}>
              {saving ? 'Saving...' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BeginSale;
