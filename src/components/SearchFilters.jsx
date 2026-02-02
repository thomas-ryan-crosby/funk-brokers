import { useState, useEffect, useRef } from 'react';
import AddressAutocomplete from './AddressAutocomplete';
import './SearchFilters.css';

const PROPERTY_TYPES = [
  { value: 'single-family', label: 'Single Family' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'multi-family', label: 'Multi-Family' },
  { value: 'land', label: 'Land' },
];

const BEDS = ['', '1', '2', '3', '4', '5'];
const BATHS = ['', '1', '1.5', '2', '2.5', '3', '4'];

const PROPERTY_TIERS = [
  { value: 'basic', label: 'Claimed' },
  { value: 'complete', label: 'Complete' },
  { value: 'verified', label: 'Verified' },
  { value: 'enhanced', label: 'Enhanced' },
  { value: 'premium', label: 'Premium' },
  { value: 'elite', label: 'Elite' },
];

const COMMUNICATION_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'accepting', label: 'Accepting' },
  { value: 'not_accepting', label: 'Not accepting' },
];

const defaultFilters = () => ({
  query: '',
  minPrice: '',
  maxPrice: '',
  propertyTypes: [], // multi-select: empty = all types
  bedrooms: '',
  bathrooms: '',
  minSquareFeet: '',
  maxSquareFeet: '',
  city: '',
  state: '',
  listedStatus: 'all', // 'all', 'listed', 'not_listed'
  propertyTiers: [], // multi-select: empty = any tier
  communicationStatus: 'all',
  showUnderContract: true,
  orderBy: 'createdAt',
  orderDirection: 'desc',
});

const normalizeInitial = (initial = {}) => {
  const base = defaultFilters();
  const propertyTypes = Array.isArray(initial.propertyTypes)
    ? initial.propertyTypes
    : initial.propertyType
      ? [initial.propertyType]
      : [];
  const propertyTiers = Array.isArray(initial.propertyTiers)
    ? initial.propertyTiers
    : initial.propertyTier && initial.propertyTier !== 'all'
      ? [initial.propertyTier]
      : [];
  return { ...base, ...initial, propertyTypes, propertyTiers };
};

const SearchFilters = ({ onFilterChange, initialFilters = {}, filters: currentFilters, onSaveSearch, isAuthenticated }) => {
  const [filters, setFilters] = useState(() => normalizeInitial(initialFilters));
  const [draft, setDraft] = useState(() => normalizeInitial(initialFilters));
  const [locationInput, setLocationInput] = useState(initialFilters.query || '');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const barRef = useRef(null);
  const appliedFilters = currentFilters ?? filters;

  useEffect(() => {
    const onDocClick = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) setOpenDropdown(null);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    if (openDropdown) setDraft({ ...filters });
  }, [openDropdown, filters]);

  const update = (next) => {
    setFilters(next);
    onFilterChange(next);
  };

  const updateDraft = (field, value) => setDraft((d) => ({ ...d, [field]: value }));
  const updateDraftMulti = (obj) => setDraft((d) => ({ ...d, ...obj }));

  const handleApply = () => {
    update(draft);
    setOpenDropdown(null);
  };

  const handleLocationSearch = () => {
    update({ ...filters, query: locationInput.trim() });
  };

  const handleReset = () => {
    setLocationInput('');
    const reset = defaultFilters();
    setFilters(reset);
    setDraft(reset);
    onFilterChange(reset);
    setOpenDropdown(null);
  };

  const formatPrice = (v) =>
    v ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(v)) : '';

  const formatLocationValue = (obj) => {
    if (!obj) return '';
    const formatted = [obj.address, obj.city, obj.state, obj.zipCode].filter(Boolean).join(', ');
    return formatted || obj.address || '';
  };

  const priceLabel = () => {
    const min = formatPrice(filters.minPrice);
    const max = formatPrice(filters.maxPrice);
    if (min && max) return `${min} - ${max}`;
    if (min) return `${min}+`;
    if (max) return `Up to ${max}`;
    return 'Price';
  };

  const bedsBathsLabel = () => {
    const b = filters.bedrooms ? `${filters.bedrooms}+ Beds` : '';
    const t = filters.bathrooms ? `${filters.bathrooms}+ Baths` : '';
    return [b, t].filter(Boolean).join(', ') || 'Beds & Baths';
  };

  const typeLabel = () => {
    const arr = filters.propertyTypes || [];
    if (arr.length === 0) return 'Home Type';
    if (arr.length === 1) return PROPERTY_TYPES.find((o) => o.value === arr[0])?.label || 'Home Type';
    return `${arr.length} types`;
  };

  const sqFtLabel = () => {
    const min = filters.minSquareFeet ? Number(filters.minSquareFeet).toLocaleString() : '';
    const max = filters.maxSquareFeet ? Number(filters.maxSquareFeet).toLocaleString() : '';
    if (min && max) return `${min} - ${max} sq ft`;
    if (min) return `${min}+ sq ft`;
    if (max) return `Up to ${max} sq ft`;
    return 'Square Ft';
  };

  const propertyTierLabel = () => {
    const arr = filters.propertyTiers || [];
    if (arr.length === 0) return 'Property Tier';
    if (arr.length === 1) return PROPERTY_TIERS.find((t) => t.value === arr[0])?.label ?? 'Property Tier';
    return `${arr.length} tiers`;
  };

  const hasActiveFilters = (f) => {
    const f2 = f ?? appliedFilters;
    if (!f2) return false;
    if (String(f2.query || '').trim()) return true;
    if (f2.minPrice || f2.maxPrice) return true;
    if (Array.isArray(f2.propertyTypes) && f2.propertyTypes.length > 0) return true;
    if (Array.isArray(f2.propertyTiers) && f2.propertyTiers.length > 0) return true;
    if (f2.bedrooms || f2.bathrooms || f2.minSquareFeet || f2.maxSquareFeet) return true;
    if (f2.city || f2.state) return true;
    if (f2.listedStatus && f2.listedStatus !== 'all') return true;
    if (f2.communicationStatus && f2.communicationStatus !== 'all') return true;
    return false;
  };

  const togglePropertyTier = (value) => {
    const current = draft.propertyTiers || [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    updateDraft('propertyTiers', next);
  };

  const listedStatusLabel = () => {
    const v = filters.listedStatus || 'all';
    if (v === 'listed') return 'Listed Only';
    if (v === 'not_listed') return 'Off Market';
    return 'Listed vs Off Market';
  };

  const communicationStatusLabel = () =>
    COMMUNICATION_OPTIONS.find((o) => o.value === (filters.communicationStatus || 'all'))?.label ?? 'Communication Status';

  const sortLabel = () => {
    const orderBy = filters.orderBy || 'createdAt';
    const dir = filters.orderDirection || 'desc';
    if (orderBy === 'createdAt' && dir === 'desc') return 'Newest';
    if (orderBy === 'price' && dir === 'asc') return 'Price: Low to High';
    if (orderBy === 'price' && dir === 'desc') return 'Price: High to Low';
    return 'Sort by';
  };

  const togglePropertyType = (value) => {
    const current = draft.propertyTypes || [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    updateDraft('propertyTypes', next);
  };

  const handleSaveSearch = async () => {
    const name = saveName.trim();
    if (!name || !onSaveSearch) return;
    setSaving(true);
    try {
      await onSaveSearch(name, appliedFilters);
      setShowSaveModal(false);
      setSaveName('');
    } catch (err) {
      console.error('Save search failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="search-filters search-filters--top" ref={barRef}>
      <div className="search-filters-row">
        <div className="search-filters-location">
          <AddressAutocomplete
            value={locationInput}
            onAddressChange={setLocationInput}
            onAddressSelect={(obj) => {
              const value = formatLocationValue(obj);
              setLocationInput(value);
              if (value.trim()) update({ ...filters, query: value.trim() });
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
            placeholder="Address, neighborhood, city, ZIP"
            className="search-filters-location-input"
            aria-label="Search by address, neighborhood, city, or ZIP"
          />
          <button
            type="button"
            className="search-filters-location-btn"
            onClick={handleLocationSearch}
            aria-label="Search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </div>

        <div className="search-filters-dropdown">
          <button
            type="button"
            className={`search-filters-trigger ${openDropdown === 'tier' ? 'open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'tier' ? null : 'tier'); }}
          >
            {propertyTierLabel()}
            <span className="search-filters-chevron">▼</span>
          </button>
          {openDropdown === 'tier' && (
            <div className="search-filters-panel" onClick={(e) => e.stopPropagation()}>
              {PROPERTY_TIERS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`search-filters-option ${(draft.propertyTiers || []).includes(t.value) ? 'active' : ''}`}
                  onClick={() => togglePropertyTier(t.value)}
                >
                  {t.label}
                </button>
              ))}
              <button type="button" className="search-filters-apply" onClick={handleApply}>
                Apply
              </button>
            </div>
          )}
        </div>

        <div className="search-filters-dropdown">
          <button
            type="button"
            className={`search-filters-trigger ${openDropdown === 'listed' ? 'open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'listed' ? null : 'listed'); }}
          >
            {listedStatusLabel()}
            <span className="search-filters-chevron">▼</span>
          </button>
          {openDropdown === 'listed' && (
            <div className="search-filters-panel" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={`search-filters-option ${(draft.listedStatus || 'all') === 'all' ? 'active' : ''}`}
                onClick={() => { update({ ...filters, listedStatus: 'all' }); setOpenDropdown(null); }}
              >
                All Properties
              </button>
              <button
                type="button"
                className={`search-filters-option ${draft.listedStatus === 'listed' ? 'active' : ''}`}
                onClick={() => { update({ ...filters, listedStatus: 'listed' }); setOpenDropdown(null); }}
              >
                Listed Only
              </button>
              <button
                type="button"
                className={`search-filters-option ${draft.listedStatus === 'not_listed' ? 'active' : ''}`}
                onClick={() => { update({ ...filters, listedStatus: 'not_listed' }); setOpenDropdown(null); }}
              >
                Off Market
              </button>
              <div className="search-filters-panel-row search-filters-panel-row--toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={draft.showUnderContract !== false}
                    onChange={(e) => updateDraft('showUnderContract', e.target.checked)}
                  />
                  Show under contract
                </label>
              </div>
              <button type="button" className="search-filters-apply" onClick={handleApply}>
                Apply
              </button>
            </div>
          )}
        </div>

        <div className="search-filters-dropdown">
          <button
            type="button"
            className={`search-filters-trigger ${openDropdown === 'comms' ? 'open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'comms' ? null : 'comms'); }}
          >
            {communicationStatusLabel()}
            <span className="search-filters-chevron">▼</span>
          </button>
          {openDropdown === 'comms' && (
            <div className="search-filters-panel" onClick={(e) => e.stopPropagation()}>
              {COMMUNICATION_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`search-filters-option ${(draft.communicationStatus || 'all') === o.value ? 'active' : ''}`}
                  onClick={() => { update({ ...filters, communicationStatus: o.value }); setOpenDropdown(null); }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="search-filters-dropdown">
          <button
            type="button"
            className={`search-filters-trigger ${openDropdown === 'price' ? 'open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'price' ? null : 'price'); }}
          >
            {priceLabel()}
            <span className="search-filters-chevron">▼</span>
          </button>
          {openDropdown === 'price' && (
            <div className="search-filters-panel" onClick={(e) => e.stopPropagation()}>
              <div className="search-filters-panel-row">
                <label>Min</label>
                <input
                  type="number"
                  placeholder="Any"
                  value={draft.minPrice}
                  onChange={(e) => updateDraft('minPrice', e.target.value)}
                />
              </div>
              <div className="search-filters-panel-row">
                <label>Max</label>
                <input
                  type="number"
                  placeholder="Any"
                  value={draft.maxPrice}
                  onChange={(e) => updateDraft('maxPrice', e.target.value)}
                />
              </div>
              <button type="button" className="search-filters-apply" onClick={handleApply}>
                Apply
              </button>
            </div>
          )}
        </div>

        <div className="search-filters-dropdown">
          <button
            type="button"
            className={`search-filters-trigger ${openDropdown === 'beds' ? 'open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'beds' ? null : 'beds'); }}
          >
            {bedsBathsLabel()}
            <span className="search-filters-chevron">▼</span>
          </button>
          {openDropdown === 'beds' && (
            <div className="search-filters-panel" onClick={(e) => e.stopPropagation()}>
              <div className="search-filters-panel-row">
                <label>Beds</label>
                <select value={draft.bedrooms} onChange={(e) => updateDraft('bedrooms', e.target.value)}>
                  <option value="">Any</option>
                  {BEDS.filter(Boolean).map((n) => (
                    <option key={n} value={n}>{n}+</option>
                  ))}
                </select>
              </div>
              <div className="search-filters-panel-row">
                <label>Baths</label>
                <select value={draft.bathrooms} onChange={(e) => updateDraft('bathrooms', e.target.value)}>
                  <option value="">Any</option>
                  {BATHS.filter(Boolean).map((n) => (
                    <option key={n} value={n}>{n}+</option>
                  ))}
                </select>
              </div>
              <button type="button" className="search-filters-apply" onClick={handleApply}>
                Apply
              </button>
            </div>
          )}
        </div>

        <div className="search-filters-dropdown">
          <button
            type="button"
            className={`search-filters-trigger ${openDropdown === 'type' ? 'open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'type' ? null : 'type'); }}
          >
            {typeLabel()}
            <span className="search-filters-chevron">▼</span>
          </button>
          {openDropdown === 'type' && (
            <div className="search-filters-panel" onClick={(e) => e.stopPropagation()}>
              {PROPERTY_TYPES.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`search-filters-option ${(draft.propertyTypes || []).includes(o.value) ? 'active' : ''}`}
                  onClick={() => togglePropertyType(o.value)}
                >
                  {o.label}
                </button>
              ))}
              <button type="button" className="search-filters-apply" onClick={handleApply}>
                Apply
              </button>
            </div>
          )}
        </div>

        <div className="search-filters-dropdown">
          <button
            type="button"
            className={`search-filters-trigger ${openDropdown === 'sqft' ? 'open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'sqft' ? null : 'sqft'); }}
          >
            {sqFtLabel()}
            <span className="search-filters-chevron">▼</span>
          </button>
          {openDropdown === 'sqft' && (
            <div className="search-filters-panel" onClick={(e) => e.stopPropagation()}>
              <div className="search-filters-panel-row">
                <label>Min sq ft</label>
                <input
                  type="number"
                  placeholder="Any"
                  min="0"
                  value={draft.minSquareFeet}
                  onChange={(e) => updateDraft('minSquareFeet', e.target.value)}
                />
              </div>
              <div className="search-filters-panel-row">
                <label>Max sq ft</label>
                <input
                  type="number"
                  placeholder="Any"
                  min="0"
                  value={draft.maxSquareFeet}
                  onChange={(e) => updateDraft('maxSquareFeet', e.target.value)}
                />
              </div>
              <button type="button" className="search-filters-apply" onClick={handleApply}>
                Apply
              </button>
            </div>
          )}
        </div>

        <div className="search-filters-dropdown">
          <button
            type="button"
            className={`search-filters-trigger ${openDropdown === 'sort' ? 'open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'sort' ? null : 'sort'); }}
          >
            {sortLabel()}
            <span className="search-filters-chevron">▼</span>
          </button>
          {openDropdown === 'sort' && (
            <div className="search-filters-panel" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={`search-filters-option ${(filters.orderBy || 'createdAt') === 'createdAt' && (filters.orderDirection || 'desc') === 'desc' ? 'active' : ''}`}
                onClick={() => { update({ ...filters, orderBy: 'createdAt', orderDirection: 'desc' }); setOpenDropdown(null); }}
              >
                Newest
              </button>
              <button
                type="button"
                className={`search-filters-option ${filters.orderBy === 'price' && filters.orderDirection === 'asc' ? 'active' : ''}`}
                onClick={() => { update({ ...filters, orderBy: 'price', orderDirection: 'asc' }); setOpenDropdown(null); }}
              >
                Price: Low to High
              </button>
              <button
                type="button"
                className={`search-filters-option ${filters.orderBy === 'price' && filters.orderDirection === 'desc' ? 'active' : ''}`}
                onClick={() => { update({ ...filters, orderBy: 'price', orderDirection: 'desc' }); setOpenDropdown(null); }}
              >
                Price: High to Low
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="search-filters-reset-inline"
          onClick={handleReset}
          aria-label="Reset all filters"
        >
          Reset filters
        </button>

        {isAuthenticated && onSaveSearch && hasActiveFilters() && (
          <button
            type="button"
            className="search-filters-save-search"
            onClick={() => { setSaveName(''); setShowSaveModal(true); }}
            aria-label="Save this search to your dashboard"
          >
            Save search
          </button>
        )}
      </div>

      {showSaveModal && (
        <div className="search-filters-save-modal-overlay" onClick={() => !saving && setShowSaveModal(false)} role="presentation">
          <div className="search-filters-save-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="save-search-title">
            <h2 id="save-search-title">Save search</h2>
            <p className="search-filters-save-modal-hint">Name this search to find it in your dashboard.</p>
            <input
              type="text"
              className="search-filters-save-modal-input"
              placeholder="e.g. Phoenix Verified listings"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveName.trim() && handleSaveSearch()}
              aria-label="Search name"
              autoFocus
            />
            <div className="search-filters-save-modal-actions">
              <button type="button" className="search-filters-apply" onClick={() => !saving && setShowSaveModal(false)} disabled={saving}>
                Cancel
              </button>
              <button
                type="button"
                className="search-filters-save-modal-save"
                onClick={handleSaveSearch}
                disabled={saving || !saveName.trim()}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
