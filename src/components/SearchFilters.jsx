import { useState } from 'react';
import './SearchFilters.css';

const SearchFilters = ({ onFilterChange, initialFilters = {} }) => {
  const [filters, setFilters] = useState({
    minPrice: initialFilters.minPrice || '',
    maxPrice: initialFilters.maxPrice || '',
    propertyType: initialFilters.propertyType || '',
    bedrooms: initialFilters.bedrooms || '',
    bathrooms: initialFilters.bathrooms || '',
    city: initialFilters.city || '',
    state: initialFilters.state || '',
    orderBy: initialFilters.orderBy || 'createdAt',
    orderDirection: initialFilters.orderDirection || 'desc',
  });

  const handleChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      minPrice: '',
      maxPrice: '',
      propertyType: '',
      bedrooms: '',
      bathrooms: '',
      city: '',
      state: '',
      orderBy: 'createdAt',
      orderDirection: 'desc',
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div className="search-filters">
      <h3>Filter Properties</h3>
      <div className="filters-grid">
        <div className="filter-group">
          <label>Min Price</label>
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => handleChange('minPrice', e.target.value)}
            placeholder="Any"
          />
        </div>

        <div className="filter-group">
          <label>Max Price</label>
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => handleChange('maxPrice', e.target.value)}
            placeholder="Any"
          />
        </div>

        <div className="filter-group">
          <label>Property Type</label>
          <select
            value={filters.propertyType}
            onChange={(e) => handleChange('propertyType', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="single-family">Single Family</option>
            <option value="condo">Condo</option>
            <option value="townhouse">Townhouse</option>
            <option value="multi-family">Multi-Family</option>
            <option value="land">Land</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Bedrooms</label>
          <select
            value={filters.bedrooms}
            onChange={(e) => handleChange('bedrooms', e.target.value)}
          >
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5+</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Bathrooms</label>
          <select
            value={filters.bathrooms}
            onChange={(e) => handleChange('bathrooms', e.target.value)}
          >
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="1.5">1.5+</option>
            <option value="2">2+</option>
            <option value="2.5">2.5+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
        </div>

        <div className="filter-group">
          <label>City</label>
          <input
            type="text"
            value={filters.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="Any city"
          />
        </div>

        <div className="filter-group">
          <label>State</label>
          <input
            type="text"
            value={filters.state}
            onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
            placeholder="State (e.g., CA)"
            maxLength="2"
          />
        </div>

        <div className="filter-group">
          <label>Sort By</label>
          <select
            value={`${filters.orderBy}_${filters.orderDirection}`}
            onChange={(e) => {
              const [orderBy, orderDirection] = e.target.value.split('_');
              handleChange('orderBy', orderBy);
              handleChange('orderDirection', orderDirection);
            }}
          >
            <option value="createdAt_desc">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      <button type="button" onClick={handleReset} className="reset-filters-btn">
        Reset Filters
      </button>
    </div>
  );
};

export default SearchFilters;
