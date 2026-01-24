import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPurchaseProfile, setPurchaseProfile } from '../services/profileService';
import { BUYING_STEPS } from '../data/processSteps';
import './BeginPurchase.css';

const TOTAL_STEPS = 3;
const WHEN_TO_BUY_OPTIONS = [
  { value: 'asap', label: 'As soon as possible' },
  { value: '3', label: 'Within 3 months' },
  { value: '6', label: 'Within 6 months' },
  { value: '12', label: 'Within 12 months' },
];

const BeginPurchase = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    budgetMin: '',
    budgetMax: '',
    whenToBuy: '',
    preApproved: false,
    city: '',
    state: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: '',
    propertyType: '',
    mustHaves: '',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/sign-in?redirect=/begin-purchase');
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
      const profile = await getPurchaseProfile(user.uid);
      if (profile) {
        setForm((prev) => ({
          ...prev,
          budgetMin: profile.budgetMin !== undefined ? String(profile.budgetMin) : '',
          budgetMax: profile.budgetMax !== undefined ? String(profile.budgetMax) : '',
          whenToBuy: profile.whenToBuy || '',
          preApproved: !!profile.preApproved,
          city: profile.city || '',
          state: profile.state || '',
          minPrice: profile.minPrice !== undefined ? String(profile.minPrice) : (profile.budgetMin !== undefined ? String(profile.budgetMin) : ''),
          maxPrice: profile.maxPrice !== undefined ? String(profile.maxPrice) : (profile.budgetMax !== undefined ? String(profile.budgetMax) : ''),
          bedrooms: profile.bedrooms !== undefined ? String(profile.bedrooms) : '',
          bathrooms: profile.bathrooms !== undefined ? String(profile.bathrooms) : '',
          propertyType: profile.propertyType || '',
          mustHaves: profile.mustHaves || '',
        }));
        if (profile.step && profile.step >= 1 && profile.step <= TOTAL_STEPS) {
          setStep(profile.step);
        }
      }
    } catch (err) {
      setError('Failed to load your purchase profile.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveAndNext = async (next) => {
    setError(null);
    try {
      setSaving(true);
      await setPurchaseProfile(user.uid, { ...form, step: next });
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
      await setPurchaseProfile(user.uid, { ...form, step: step - 1 });
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

  const canProceed = () => {
    if (step === 1) {
      return (form.budgetMin?.trim() || form.budgetMax?.trim()) && form.whenToBuy;
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

  const buildFilters = () => {
    const f = {};
    const min = form.minPrice?.trim() || form.budgetMin?.trim();
    const max = form.maxPrice?.trim() || form.budgetMax?.trim();
    if (min) f.minPrice = min;
    if (max) f.maxPrice = max;
    if (form.propertyType) f.propertyType = form.propertyType;
    if (form.bedrooms) f.bedrooms = form.bedrooms;
    if (form.bathrooms) f.bathrooms = form.bathrooms;
    if (form.city?.trim()) f.city = form.city.trim();
    if (form.state?.trim()) f.state = form.state.trim();
    return f;
  };

  const handleFindHomes = () => {
    navigate('/browse', { state: { filters: buildFilters() } });
  };

  if (authLoading || loading) {
    return (
      <div className="begin-purchase-page">
        <div className="begin-purchase-container">
          <div className="begin-purchase-loading">Loading...</div>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const stepInfo = BUYING_STEPS[step - 1] || {};
  const isLast = step === TOTAL_STEPS;

  return (
    <div className="begin-purchase-page">
      <div className="begin-purchase-container">
        <h1>Begin your home purchase</h1>
        <div className="begin-purchase-stepper">Step {step} of {TOTAL_STEPS}</div>
        <h2 className="begin-purchase-step-title">{stepInfo.title}</h2>
        {stepInfo.lead && <p className="begin-purchase-lead">{stepInfo.lead}</p>}

        {error && <div className="begin-purchase-error">{error}</div>}

        {step === 1 && (
          <div className="begin-purchase-form">
            <div className="form-row-multi">
              <div className="form-group">
                <label>Budget minimum ($)</label>
                <input type="number" value={form.budgetMin} onChange={(e) => handleChange('budgetMin', e.target.value)} min={0} step={1000} placeholder="e.g. 200000" />
              </div>
              <div className="form-group">
                <label>Budget maximum ($) *</label>
                <input type="number" value={form.budgetMax} onChange={(e) => handleChange('budgetMax', e.target.value)} min={0} step={1000} placeholder="e.g. 450000" />
              </div>
            </div>
            <div className="form-group">
              <label>When do you want to buy? *</label>
              <select value={form.whenToBuy} onChange={(e) => handleChange('whenToBuy', e.target.value)}>
                <option value="">Select timeline</option>
                {WHEN_TO_BUY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={form.preApproved} onChange={(e) => handleChange('preApproved', e.target.checked)} />
                I have a pre-approval or am pre-approved for a mortgage
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="begin-purchase-form">
            <div className="form-row-multi">
              <div className="form-group">
                <label>City</label>
                <input type="text" value={form.city} onChange={(e) => handleChange('city', e.target.value)} placeholder="Any city" />
              </div>
              <div className="form-group">
                <label>State</label>
                <input type="text" value={form.state} onChange={(e) => handleChange('state', e.target.value.toUpperCase())} placeholder="e.g. CA" maxLength={2} />
              </div>
            </div>
            <div className="form-row-multi">
              <div className="form-group">
                <label>Min price ($)</label>
                <input type="number" value={form.minPrice} onChange={(e) => handleChange('minPrice', e.target.value)} min={0} step={1000} placeholder={form.budgetMin || 'Any'} />
              </div>
              <div className="form-group">
                <label>Max price ($)</label>
                <input type="number" value={form.maxPrice} onChange={(e) => handleChange('maxPrice', e.target.value)} min={0} step={1000} placeholder={form.budgetMax || 'Any'} />
              </div>
            </div>
            <div className="form-row-multi">
              <div className="form-group">
                <label>Bedrooms</label>
                <select value={form.bedrooms} onChange={(e) => handleChange('bedrooms', e.target.value)}>
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="5">5+</option>
                </select>
              </div>
              <div className="form-group">
                <label>Bathrooms</label>
                <select value={form.bathrooms} onChange={(e) => handleChange('bathrooms', e.target.value)}>
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="1.5">1.5+</option>
                  <option value="2">2+</option>
                  <option value="2.5">2.5+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                </select>
              </div>
              <div className="form-group">
                <label>Property type</label>
                <select value={form.propertyType} onChange={(e) => handleChange('propertyType', e.target.value)}>
                  <option value="">All types</option>
                  <option value="single-family">Single Family</option>
                  <option value="condo">Condo</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="multi-family">Multi-Family</option>
                  <option value="land">Land</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Must-haves and deal-breakers</label>
              <textarea value={form.mustHaves} onChange={(e) => handleChange('mustHaves', e.target.value)} placeholder="e.g. Garage, yard, move-in ready, specific school district" rows={3} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="begin-purchase-summary">
            <p className="begin-purchase-cta-copy">We will show you homes that match your criteria. You can save favorites and compare options.</p>
            <button type="button" className="btn btn-primary btn-large" onClick={handleFindHomes}>Find Homes</button>
          </div>
        )}

        {!isLast && (
          <div className="begin-purchase-actions">
            {step > 1 && (
              <button type="button" className="btn btn-secondary" onClick={handleBack} disabled={saving}>Back</button>
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

export default BeginPurchase;
