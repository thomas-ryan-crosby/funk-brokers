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

  useEffect(() => {
    if (Object.keys(filters).length > 0) {
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

      <div className="home-container">
        <div className="home-sidebar">
          <SearchFilters onFilterChange={handleFilterChange} initialFilters={filters} />
        </div>

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
              <div className="home-map-wrap">
                <PropertyMap properties={properties} />
              </div>
              {properties.length === 0 && (
                <div className="empty-state">
                  <p>No properties found. Try adjusting your filters.</p>
                </div>
              )}
              {properties.length > 0 && (
                <>
                  <div className="properties-header">
                    <h2>{properties.length} Properties Found</h2>
                  </div>
                  <div className="properties-grid">
                    {properties.map((property) => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
