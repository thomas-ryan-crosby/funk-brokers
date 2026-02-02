import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loadGooglePlaces } from '../utils/loadGooglePlaces';
import { resolveAddressToParcel } from '../services/parcelService';
import { claimProperty, getAllProperties, searchProperties } from '../services/propertyService';
import { addSavedSearch } from '../services/profileService';
import PropertyCard from '../components/PropertyCard';
import PropertyMap from '../components/PropertyMap';
import SearchFilters from '../components/SearchFilters';
import UnlistedPropertyModal from '../components/UnlistedPropertyModal';
import './Home.css';

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(() => location.state?.filters || {});
  const [viewMode, setViewMode] = useState('list'); // 'map' | 'list'
  const [propertiesInMapView, setPropertiesInMapView] = useState([]);
  const [unlistedParcel, setUnlistedParcel] = useState(null);
  const [unlistedLoading, setUnlistedLoading] = useState(false);
  const [selectedUnlistedParcel, setSelectedUnlistedParcel] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const unlistedRequestRef = useRef(0);

  useEffect(() => {
    // Always use searchProperties to support listedStatus filter
    loadPropertiesWithFilters();
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
      const query = String(filters.query || '').trim();
      if (!query || data.length > 0) {
        setUnlistedParcel(null);
        setUnlistedLoading(false);
      } else {
        await loadUnlistedForQuery(query);
      }
    } catch (err) {
      setError('Failed to search properties. Please try again.');
      console.error(err);
      setUnlistedParcel(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const fallbackUnlistedParcel = (query) => ({
    address: query,
    estimate: null,
    lastSaleDate: null,
    lastSalePrice: null,
    beds: null,
    baths: null,
    squareFeet: null,
  });

  const formatUnknown = (value) => (value == null || value === '' ? '?' : value);

  const formatLastSale = (date, price) => {
    const d = date ? String(date).slice(0, 10) : '';
    const p = price != null && Number.isFinite(price) ? `$${Number(price).toLocaleString()}` : '';
    if (!d && !p) return '?';
    if (d && p) return `${d} · ${p}`;
    return d || p || '?';
  };

  const loadUnlistedForQuery = async (query) => {
    if (!/\d/.test(query)) {
      setUnlistedParcel(null);
      setUnlistedLoading(false);
      return;
    }
    const requestId = unlistedRequestRef.current + 1;
    unlistedRequestRef.current = requestId;
    setUnlistedLoading(true);
    try {
      await loadGooglePlaces();
      if (!window.google?.maps?.Geocoder) {
        setUnlistedParcel(fallbackUnlistedParcel(query));
        return;
      }
      const geocoder = new window.google.maps.Geocoder();
      const { location } = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: query }, (results, status) => {
          if (status === 'OK' && results?.[0]?.geometry?.location) {
            resolve({ location: results[0].geometry.location });
          } else {
            reject(new Error('Geocode failed'));
          }
        });
      });
      if (requestId !== unlistedRequestRef.current) return;
      const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
      const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setUnlistedParcel(fallbackUnlistedParcel(query));
        return;
      }
      const delta = 0.003;
      const bounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(lat - delta, lng - delta),
        new window.google.maps.LatLng(lat + delta, lng + delta)
      );
      const { parcel } = await resolveAddressToParcel({ address: query, bounds });
      if (requestId !== unlistedRequestRef.current) return;
      const normalized = query.toLowerCase();
      const match = parcel && (parcel.address || '').toLowerCase().includes(normalized) ? parcel : parcel;
      setUnlistedParcel(match || fallbackUnlistedParcel(query));
    } catch (err) {
      console.error('Unlisted lookup failed:', err);
      setUnlistedParcel(fallbackUnlistedParcel(query));
    } finally {
      if (requestId === unlistedRequestRef.current) setUnlistedLoading(false);
    }
  };

  const handleClaimUnlisted = async (parcel) => {
    if (!isAuthenticated || !user?.uid) {
      setSelectedUnlistedParcel(null);
      navigate('/sign-up', { state: { returnTo: '/browse', message: 'Sign in to claim this property' } });
      return;
    }
    setClaiming(true);
    try {
      const propertyId = await claimProperty(parcel, user.uid);
      setSelectedUnlistedParcel(null);
      navigate(`/property/${propertyId}`, { state: { fromClaim: true } });
    } catch (err) {
      console.error('Claim property failed:', err);
      alert('Failed to claim property. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="home-page">
      <div className="home-filters-bar">
        <SearchFilters
          onFilterChange={handleFilterChange}
          initialFilters={filters}
          filters={filters}
          isAuthenticated={isAuthenticated}
          onSaveSearch={isAuthenticated ? async (name, filterSnapshot) => {
            await addSavedSearch(user.uid, { name, filters: filterSnapshot ?? filters });
          } : undefined}
        />
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
                  {unlistedLoading && <p>Searching public records for that address…</p>}
                  {!unlistedLoading && unlistedParcel && (
                    <div className="unlisted-search-card">
                      <div className="unlisted-search-card__header">
                        <div>
                          <h3>{unlistedParcel.address || 'Address unknown'}</h3>
                          <span className="unlisted-search-card__badge">Unclaimed</span>
                        </div>
                        <button
                          type="button"
                          className="unlisted-search-card__claim"
                          onClick={() => setSelectedUnlistedParcel(unlistedParcel)}
                        >
                          Claim property
                        </button>
                      </div>
                      <div className="unlisted-search-card__details">
                        <div>
                          <span>Funk Estimate</span>
                          <strong>{formatUnknown(unlistedParcel.estimate != null && Number.isFinite(unlistedParcel.estimate) ? `$${Number(unlistedParcel.estimate).toLocaleString()}` : null)}</strong>
                        </div>
                        <div>
                          <span>Last sale</span>
                          <strong>{formatLastSale(unlistedParcel.lastSaleDate, unlistedParcel.lastSalePrice)}</strong>
                        </div>
                      </div>
                      <p className="unlisted-search-card__note">
                        This address isn’t on OpenTo yet. Claiming lets you add it and manage the listing.
                      </p>
                    </div>
                  )}
                  {!unlistedLoading && !unlistedParcel && (
                    <p>No properties found. Try adjusting your filters.</p>
                  )}
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
      <UnlistedPropertyModal
        parcel={selectedUnlistedParcel}
        onClose={() => setSelectedUnlistedParcel(null)}
        onClaim={handleClaimUnlisted}
        claiming={claiming}
      />
    </div>
  );
};

export default Home;
