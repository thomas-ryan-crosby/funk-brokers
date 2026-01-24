import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPropertiesBySeller, archiveProperty, restoreProperty, deletePropertyPermanently } from '../services/propertyService';
import { getUserFavoriteIds, removeFromFavorites } from '../services/favoritesService';
import { getAllProperties } from '../services/propertyService';
import { getSavedSearches, removeSavedSearch, getPurchaseProfile } from '../services/profileService';
import PropertyCard from '../components/PropertyCard';
import './Dashboard.css';

const Dashboard = () => {
  const { user, userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('my-properties'); // 'my-properties' | 'favorites' | 'my-searches'
  const [myProperties, setMyProperties] = useState([]);
  const [favoriteProperties, setFavoriteProperties] = useState([]);
  const [mySearches, setMySearches] = useState([]);
  const [purchaseProfile, setPurchaseProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/sign-in');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDashboardData();
    }
  }, [isAuthenticated, user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load user's properties
      const properties = await getPropertiesBySeller(user.uid);
      setMyProperties(properties);

      // Load favorite properties
      const favoriteIds = await getUserFavoriteIds(user.uid);
      if (favoriteIds.length > 0) {
        // Fetch all properties and filter by favorite IDs
        const allProperties = await getAllProperties();
        const favorites = allProperties.filter((p) => favoriteIds.includes(p.id));
        setFavoriteProperties(favorites);
      } else {
        setFavoriteProperties([]);
      }

      // Load saved searches
      const searches = await getSavedSearches(user.uid);
      setMySearches(searches);

      // Load purchase profile for verified-buyer status
      const profile = await getPurchaseProfile(user.uid);
      setPurchaseProfile(profile);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (propertyId) => {
    try {
      await removeFromFavorites(user.uid, propertyId);
      setFavoriteProperties((prev) => prev.filter((p) => p.id !== propertyId));
    } catch (err) {
      console.error('Error removing favorite:', err);
      alert('Failed to remove favorite. Please try again.');
    }
  };

  const handleRemoveSearch = async (searchId) => {
    try {
      await removeSavedSearch(searchId);
      setMySearches((prev) => prev.filter((s) => s.id !== searchId));
    } catch (err) {
      console.error('Error removing search:', err);
      alert('Failed to remove search. Please try again.');
    }
  };

  const handleBrowseSearch = (filters) => {
    navigate('/browse', { state: { filters } });
  };

  const getStatusBadge = (p) => {
    if (p.archived) return <span className="status-badge status-archived">Archived</span>;
    const statusConfig = {
      active: { label: 'Active', class: 'status-active' },
      under_contract: { label: 'Under Contract', class: 'status-contract' },
      sold: { label: 'Sold', class: 'status-sold' },
      withdrawn: { label: 'Withdrawn', class: 'status-withdrawn' },
      draft: { label: 'Draft', class: 'status-draft' },
    };
    const status = p.status || 'active';
    const config = statusConfig[status] || { label: status, class: 'status-default' };
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  const activeList = myProperties.filter((p) => !p.archived);
  const archivedList = myProperties.filter((p) => p.archived);

  const handleArchive = async (propertyId) => {
    try {
      await archiveProperty(propertyId);
      loadDashboardData();
    } catch (err) {
      console.error(err);
      alert('Failed to archive. Please try again.');
    }
  };

  const handleRestore = async (propertyId) => {
    try {
      await restoreProperty(propertyId);
      loadDashboardData();
    } catch (err) {
      console.error(err);
      alert('Failed to restore. Please try again.');
    }
  };

  const handleDeletePermanently = async (propertyId) => {
    if (!window.confirm('Permanently delete this listing? This cannot be undone.')) return;
    try {
      await deletePropertyPermanently(propertyId);
      loadDashboardData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete. Please try again.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-state">Loading dashboard...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1>Welcome back, {userProfile?.name || user?.displayName || 'User'}!</h1>
            <p>Manage your properties and favorites</p>
          </div>
        </div>

        <div className="dashboard-process-ctas">
          <Link to="/create-search" className="btn btn-process btn-process-buy">
            Create a new search
          </Link>
          <Link to="/begin-sale" state={{ startFresh: true }} className="btn btn-process btn-process-sell">
            Begin home sale process
          </Link>
          {purchaseProfile?.buyerVerified ? (
            <span className="dashboard-verified-badge">✓ Verified buyer</span>
          ) : (
            <Link to="/verify-buyer" className="btn btn-outline">
              Become a verified buyer
            </Link>
          )}
        </div>

        {error && <div className="dashboard-error">{error}</div>}

        <div className="dashboard-tabs">
          <button
            className={`tab ${activeTab === 'my-properties' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-properties')}
          >
            My Properties ({activeList.length})
          </button>
          <button
            className={`tab ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            Favorites ({favoriteProperties.length})
          </button>
          <button
            className={`tab ${activeTab === 'my-searches' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-searches')}
          >
            My Searches ({mySearches.length})
          </button>
        </div>

        <div className="dashboard-content">
          {activeTab === 'my-properties' && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2>My Properties</h2>
                {activeList.length === 0 && archivedList.length === 0 && (
                  <p className="empty-message">
                    You haven't listed any properties yet.{' '}
                    <Link to="/begin-sale" state={{ startFresh: true }}>Begin home sale process</Link>
                  </p>
                )}
              </div>

              {activeList.length > 0 && (
                <div className="properties-list">
                  {activeList.map((property) => (
                    <div key={property.id} className="property-item">
                      <PropertyCard property={property} embedded />
                      <div className="property-actions">
                        {getStatusBadge(property)}
                        <div className="action-buttons">
                          <Link to={`/property/${property.id}`} className="action-btn btn btn-secondary" title="View">View</Link>
                          {property.status === 'active' && (
                            <Link to={`/property/${property.id}/edit`} className="action-btn btn btn-outline" title="Edit">Edit</Link>
                          )}
                          {!property.verified && (
                            <Link to={`/property/${property.id}/get-verified`} className="action-btn btn btn-outline" title="Verify">Verify</Link>
                          )}
                          <button type="button" className="action-btn btn btn-outline" title="Archive" onClick={() => handleArchive(property.id)}>Arch</button>
                          <button type="button" className="action-btn btn btn-danger" title="Delete" onClick={() => handleDeletePermanently(property.id)}>Del</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {archivedList.length > 0 && (
                <div className="archived-section">
                  <h3>Archived ({archivedList.length})</h3>
                  <p className="form-hint">Archived listings are hidden from browse. Restore to make them visible again.</p>
                  <div className="properties-list">
                    {archivedList.map((property) => (
                      <div key={property.id} className="property-item property-item-archived">
                        <PropertyCard property={property} embedded />
                        <div className="property-actions">
                          {getStatusBadge(property)}
                          <div className="action-buttons">
                            <Link to={`/property/${property.id}`} className="action-btn btn btn-secondary" title="View">View</Link>
                            {!property.verified && (
                              <Link to={`/property/${property.id}/get-verified`} className="action-btn btn btn-outline" title="Verify">Verify</Link>
                            )}
                            <button type="button" className="action-btn btn btn-outline" title="Restore" onClick={() => handleRestore(property.id)}>Rest</button>
                            <button type="button" className="action-btn btn btn-danger" title="Delete" onClick={() => handleDeletePermanently(property.id)}>Del</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2>Favorite Properties</h2>
                {favoriteProperties.length === 0 && (
                  <p className="empty-message">
                    You haven't favorited any properties yet.{' '}
                    <Link to="/browse">Browse properties</Link> to find your favorites.
                  </p>
                )}
              </div>

              {favoriteProperties.length > 0 && (
                <div className="properties-list">
                  {favoriteProperties.map((property) => (
                    <div key={property.id} className="property-item">
                      <PropertyCard property={property} embedded />
                      <div className="property-actions">
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="action-btn btn btn-outline"
                            title="Remove"
                            onClick={(e) => {
                              e.preventDefault();
                              handleRemoveFavorite(property.id);
                            }}
                          >
                            Rmv
                          </button>
                          <Link to={`/property/${property.id}`} className="action-btn btn btn-primary" title="View">View</Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'my-searches' && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2>My Searches</h2>
                {mySearches.length === 0 && (
                  <p className="empty-message">
                    <Link to="/create-search">Create a new search</Link> and click Browse to save it here.
                  </p>
                )}
              </div>

              {mySearches.length > 0 && (
                <div className="searches-list">
                  {mySearches.map((s) => (
                    <div key={s.id} className="search-item">
                      <div className="search-item-main">
                        <span className="search-item-name">{s.name || 'My search'}</span>
                        {s.createdAt && (
                          <span className="search-item-date">
                            Saved {s.createdAt instanceof Date ? s.createdAt.toLocaleDateString() : new Date(s.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="search-item-actions">
                        <button
                          type="button"
                          className="btn btn-small btn-primary"
                          onClick={() => handleBrowseSearch(s.filters || {})}
                        >
                          Browse
                        </button>
                        <button
                          type="button"
                          className="btn btn-small btn-outline"
                          onClick={() => handleRemoveSearch(s.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
