import { useState, useEffect, useRef } from 'react';
import AddressAutocomplete from './AddressAutocomplete';
import CityStateAutocomplete from './CityStateAutocomplete';
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
  return { ...base, ...initial, propertyTypes };
};

const SearchFilters = ({ onFilterChange, initialFilters = {} }) => {
  const [filters, setFilters] = useState(() => normalizeInitial(initialFilters));
  const [draft, setDraft] = useState(() => normalizeInitial(initialFilters));
  const [locationInput, setLocationInput] = useState(initialFilters.query || '');
  const [openDropdown, setOpenDropdown] = useState(null);
  const barRef = useRef(null);

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

  const togglePropertyType = (value) => {
    const current = draft.propertyTypes || [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    updateDraft('propertyTypes', next);
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
                  key={o.value || 'all'}
                  type="button"
                  className={`search-filters-option ${draft.propertyType === o.value ? 'active' : ''}`}
                  onClick={() => updateDraft('propertyType', o.value)}
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
            className={`search-filters-trigger ${openDropdown === 'more' ? 'open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'more' ? null : 'more'); }}
          >
            More
            <span className="search-filters-chevron">▼</span>
          </button>
          {openDropdown === 'more' && (
            <div className="search-filters-panel search-filters-panel--wide" onClick={(e) => e.stopPropagation()}>
              <div className="search-filters-panel-row">
                <label>City</label>
                <CityStateAutocomplete
                  value={draft.city}
                  onCityChange={(v) => updateDraft('city', v)}
                  onCityStateSelect={({ city, state }) => updateDraftMulti({ city, state })}
                  placeholder="City"
                  className="search-filters-input"
                />
              </div>
              <div className="search-filters-panel-row">
                <label>State</label>
                <input
                  type="text"
                  value={draft.state}
                  onChange={(e) => updateDraft('state', e.target.value.toUpperCase())}
                  placeholder="e.g. CA"
                  maxLength="2"
                  className="search-filters-input"
                />
              </div>
              <div className="search-filters-panel-row">
                <label>Listed Status</label>
                <select
                  value={draft.listedStatus || 'all'}
                  onChange={(e) => updateDraft('listedStatus', e.target.value)}
                  className="search-filters-input"
                >
                  <option value="all">All Properties</option>
                  <option value="listed">Listed Only</option>
                  <option value="not_listed">Not Listed Only</option>
                </select>
              </div>
              <div className="search-filters-panel-row">
                <label>Sort</label>
                <select
                  value={`${draft.orderBy}_${draft.orderDirection}`}
                  onChange={(e) => {
                    const [orderBy, orderDirection] = e.target.value.split('_');
                    updateDraftMulti({ orderBy, orderDirection });
                  }}
                  className="search-filters-input"
                >
                  <option value="createdAt_desc">Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
              <div className="search-filters-panel-row">
                <label>
                  <input
                    type="checkbox"
                    checked={draft.showUnderContract !== false}
                    onChange={(e) => updateDraft('showUnderContract', e.target.checked)}
                  />
                  Show properties under contract
                </label>
              </div>
              <button type="button" className="search-filters-apply" onClick={handleApply}>
                Apply
              </button>
              <button type="button" className="search-filters-reset" onClick={handleReset}>
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;
