import { useState, useEffect, useRef } from 'react';
import CityStateAutocomplete from './CityStateAutocomplete';
import './SearchFilters.css';

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
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
  propertyType: '',
  bedrooms: '',
  bathrooms: '',
  city: '',
  state: '',
  orderBy: 'createdAt',
  orderDirection: 'desc',
});

const SearchFilters = ({ onFilterChange, initialFilters = {} }) => {
  const [filters, setFilters] = useState(() => ({ ...defaultFilters(), ...initialFilters }));
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

  const update = (next) => {
    setFilters(next);
    onFilterChange(next);
  };

  const handleChange = (field, value) => {
    update({ ...filters, [field]: value });
  };

  const handleLocationSearch = () => {
    update({ ...filters, query: locationInput.trim() });
  };

  const handleReset = () => {
    setLocationInput('');
    const reset = defaultFilters();
    setFilters(reset);
    onFilterChange(reset);
    setOpenDropdown(null);
  };

  const formatPrice = (v) =>
    v ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(v)) : '';

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

  const typeLabel = () => PROPERTY_TYPES.find((o) => o.value === filters.propertyType)?.label || 'Home Type';

  return (
    <div className="search-filters search-filters--top" ref={barRef}>
      <div className="search-filters-row">
        <div className="search-filters-location">
          <input
            type="text"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
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
                  value={filters.minPrice}
                  onChange={(e) => handleChange('minPrice', e.target.value)}
                />
              </div>
              <div className="search-filters-panel-row">
                <label>Max</label>
                <input
                  type="number"
                  placeholder="Any"
                  value={filters.maxPrice}
                  onChange={(e) => handleChange('maxPrice', e.target.value)}
                />
              </div>
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
                <select value={filters.bedrooms} onChange={(e) => handleChange('bedrooms', e.target.value)}>
                  <option value="">Any</option>
                  {BEDS.filter(Boolean).map((n) => (
                    <option key={n} value={n}>{n}+</option>
                  ))}
                </select>
              </div>
              <div className="search-filters-panel-row">
                <label>Baths</label>
                <select value={filters.bathrooms} onChange={(e) => handleChange('bathrooms', e.target.value)}>
                  <option value="">Any</option>
                  {BATHS.filter(Boolean).map((n) => (
                    <option key={n} value={n}>{n}+</option>
                  ))}
                </select>
              </div>
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
                  className={`search-filters-option ${filters.propertyType === o.value ? 'active' : ''}`}
                  onClick={() => { handleChange('propertyType', o.value); setOpenDropdown(null); }}
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
                  value={filters.city}
                  onCityChange={(v) => handleChange('city', v)}
                  onCityStateSelect={({ city, state }) => update({ ...filters, city, state })}
                  placeholder="City"
                  className="search-filters-input"
                />
              </div>
              <div className="search-filters-panel-row">
                <label>State</label>
                <input
                  type="text"
                  value={filters.state}
                  onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
                  placeholder="e.g. CA"
                  maxLength="2"
                  className="search-filters-input"
                />
              </div>
              <div className="search-filters-panel-row">
                <label>Sort</label>
                <select
                  value={`${filters.orderBy}_${filters.orderDirection}`}
                  onChange={(e) => {
                    const [orderBy, orderDirection] = e.target.value.split('_');
                    update({ ...filters, orderBy, orderDirection });
                  }}
                  className="search-filters-input"
                >
                  <option value="createdAt_desc">Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
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
