import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getAllProperties, searchProperties } from '../services/propertyService';
import PropertyCard from '../components/PropertyCard';
import PropertyMap from '../components/PropertyMap';
import SearchFilters from '../components/SearchFilters';
import './Home.css';

const Home = () => {
  const location = useLocation();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(() => location.state?.filters || {});
  const [viewMode, setViewMode] = useState('list'); // 'map' | 'list'
  const [propertiesInMapView, setPropertiesInMapView] = useState([]);

  useEffect(() => {
    const hasFilters = Object.keys(filters).length > 0 && Object.values(filters).some((v) => v != null && v !== '');
    if (hasFilters) {
      loadPropertiesWithFilters();
    } else {
      loadProperties();
    }
  }, [filters]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllProperties();
      setProperties(data);
    } catch (err) {
      setError('Failed to load properties. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPropertiesWithFilters = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await searchProperties(filters);
      setProperties(data);
    } catch (err) {
      setError('Failed to search properties. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="home-page">
      <div className="home-hero">
        <h1>Find Your Dream Home</h1>
        <p>Buy and sell residential properties directly, without brokers</p>
      </div>

      <div className="home-filters-bar">
        <SearchFilters onFilterChange={handleFilterChange} initialFilters={filters} />
      </div>

      <div className="home-container">
        <div className="home-main">
          {loading && (
            <div className="loading-state">
              <p>Loading properties...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={loadProperties}>Try Again</button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="home-view-bar">
                <h2 className="home-view-count">
                  {viewMode === 'map' ? `${propertiesInMapView.length} in view` : `${properties.length} Properties Found`}
                </h2>
                <div className="home-view-toggle" role="tablist" aria-label="View mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'list'}
                    className={viewMode === 'list' ? 'active' : ''}
                    onClick={() => setViewMode('list')}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'map'}
                    className={viewMode === 'map' ? 'active' : ''}
                    onClick={() => setViewMode('map')}
                  >
                    Map
                  </button>
                </div>
              </div>
              {viewMode === 'map' && (
                <div className="home-map-split">
                  <div className="home-map-split__map">
                    <PropertyMap properties={properties} onPropertiesInView={setPropertiesInMapView} />
                  </div>
                  <div className="home-map-split__list">
                    {propertiesInMapView.length === 0 && (
                      <p className="home-map-split__empty">Pan or zoom the map to see properties in view.</p>
                    )}
                    {propertiesInMapView.map((property) => (
                      <PropertyCard key={property.id} property={property} compact />
                    ))}
                  </div>
                </div>
              )}
              {viewMode === 'list' && properties.length === 0 && (
                <div className="empty-state">
                  <p>No properties found. Try adjusting your filters.</p>
                </div>
              )}
              {viewMode === 'list' && properties.length > 0 && (
                <div className="properties-grid">
                  {properties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
