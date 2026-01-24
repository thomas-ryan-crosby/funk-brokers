import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { addSavedSearch } from '../services/profileService';
import CityStateAutocomplete from '../components/CityStateAutocomplete';
import './CreateSearch.css';

const buildSearchName = (filters) => {
  const parts = [];
  if (filters.city && filters.state) parts.push(`${filters.city}, ${filters.state.toUpperCase()}`);
  else if (filters.city) parts.push(filters.city);
  else if (filters.state) parts.push(filters.state.toUpperCase());
  if (filters.minPrice || filters.maxPrice) {
    const lo = filters.minPrice ? `$${Number(filters.minPrice).toLocaleString()}` : 'Any';
    const hi = filters.maxPrice ? `$${Number(filters.maxPrice).toLocaleString()}` : 'Any';
    parts.push(`${lo} – ${hi}`);
  }
  if (filters.bedrooms) parts.push(`${filters.bedrooms}+ beds`);
  if (filters.bathrooms) parts.push(`${filters.bathrooms}+ baths`);
  if (filters.propertyType) {
    const labels = { 'single-family': 'Single Family', condo: 'Condo', townhouse: 'Townhouse', 'multi-family': 'Multi-Family', land: 'Land' };
    parts.push(labels[filters.propertyType] || filters.propertyType);
  }
  return parts.length ? parts.join(' • ') : 'My search';
};

const CreateSearch = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: '',
    city: '',
    state: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: '',
    propertyType: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/sign-in?redirect=/create-search');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const buildFilters = () => {
    const f = {};
    if (form.minPrice?.trim()) f.minPrice = form.minPrice.trim();
    if (form.maxPrice?.trim()) f.maxPrice = form.maxPrice.trim();
    if (form.propertyType) f.propertyType = form.propertyType;
    if (form.bedrooms) f.bedrooms = form.bedrooms;
    if (form.bathrooms) f.bathrooms = form.bathrooms;
    if (form.city?.trim()) f.city = form.city.trim();
    if (form.state?.trim()) f.state = form.state.trim();
    return f;
  };

  const handleBrowse = async () => {
    const filters = buildFilters();
    setError(null);
    setSaving(true);
    try {
      const name = form.name?.trim() || buildSearchName(filters);
      await addSavedSearch(user.uid, { name, filters });
      navigate('/browse', { state: { filters } });
    } catch (e) {
      setError('Could not save search. Please try again.');
      console.warn(e);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="create-search-page">
        <div className="create-search-container">
          <div className="create-search-loading">Loading...</div>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="create-search-page">
      <div className="create-search-container">
        <h1>Create a new search</h1>
        <p className="create-search-lead">Set your criteria below. Click Browse to save this search and view matching properties.</p>

        {error && <div className="create-search-error">{error}</div>}

        <div className="create-search-form">
          <div className="form-group">
            <label>Search name (optional)</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Downtown 2BR under 400k"
            />
          </div>

          <div className="form-row-multi">
            <div className="form-group">
              <label>City</label>
              <CityStateAutocomplete
                value={form.city}
                onCityChange={(v) => handleChange('city', v)}
                onCityStateSelect={({ city, state }) => setForm((prev) => ({ ...prev, city, state }))}
                placeholder="Start typing city or area"
              />
            </div>
            <div className="form-group">
              <label>State</label>
              <input type="text" value={form.state} onChange={(e) => handleChange('state', e.target.value.toUpperCase())} placeholder="e.g. CA" maxLength={2} />
            </div>
          </div>

          <div className="form-row-multi">
            <div className="form-group">
              <label>Min price ($)</label>
              <input type="number" value={form.minPrice} onChange={(e) => handleChange('minPrice', e.target.value)} min={0} step={1000} placeholder="Any" />
            </div>
            <div className="form-group">
              <label>Max price ($)</label>
              <input type="number" value={form.maxPrice} onChange={(e) => handleChange('maxPrice', e.target.value)} min={0} step={1000} placeholder="Any" />
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
        </div>

        <div className="create-search-actions">
          <button type="button" className="btn btn-primary btn-large" onClick={handleBrowse} disabled={saving}>
            {saving ? 'Saving...' : 'Browse'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSearch;
