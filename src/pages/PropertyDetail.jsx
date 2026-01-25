import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPropertyById, updateProperty, archiveProperty, restoreProperty, deletePropertyPermanently } from '../services/propertyService';
import { addToFavorites, removeFromFavorites, isFavorited, getFavoriteCountForProperty } from '../services/favoritesService';
import { getListingTierProgress, getListingTierLabel } from '../utils/verificationScores';
import './PropertyDetail.css';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(null);
  const [commsUpdating, setCommsUpdating] = useState(false);

  const isOwner = !!(property && user && property.sellerId === user.uid);

  useEffect(() => {
    loadProperty();
  }, [id]);

  useEffect(() => {
    if (property && isAuthenticated && user) {
      checkFavoriteStatus();
    }
  }, [property, isAuthenticated, user]);

  useEffect(() => {
    if (property?.id && isOwner) {
      getFavoriteCountForProperty(property.id).then(setFavoriteCount);
    }
  }, [property?.id, isOwner]);

  const checkFavoriteStatus = async () => {
    if (!user || !property) return;
    try {
      const isFav = await isFavorited(user.uid, property.id);
      setFavorited(isFav);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      navigate('/sign-in?redirect=' + encodeURIComponent(`/property/${id}`));
      return;
    }

    setFavoriteLoading(true);
    try {
      if (favorited) {
        await removeFromFavorites(user.uid, property.id);
        setFavorited(false);
      } else {
        await addToFavorites(user.uid, property.id);
        setFavorited(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Failed to update favorite. Please try again.');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const loadProperty = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPropertyById(id);
      setProperty(data);
    } catch (err) {
      setError('Property not found or failed to load.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCommsToggle = async () => {
    if (!property || !isOwner || commsUpdating) return;
    const next = !(property.acceptingCommunications !== false);
    setCommsUpdating(true);
    try {
      await updateProperty(property.id, { acceptingCommunications: next });
      setProperty((p) => (p ? { ...p, acceptingCommunications: next } : p));
    } catch (err) {
      console.error(err);
      alert('Failed to update. Please try again.');
    } finally {
      setCommsUpdating(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatAddress = (property) => {
    const parts = [property.address, property.city, property.state, property.zipCode].filter(Boolean);
    return parts.join(', ');
  };

  if (loading) {
    return (
      <div className="property-detail-page">
        <div className="loading-state">Loading property details...</div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="property-detail-page">
        <div className="error-state">
          <p>{error || 'Property not found'}</p>
          <button onClick={() => navigate('/browse')} className="btn btn-primary">
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  if (property.archived && !isOwner) {
    return (
      <div className="property-detail-page">
        <div className="error-state">
          <p>This listing is no longer available.</p>
          <button onClick={() => navigate('/browse')} className="btn btn-primary">
            Browse Properties
          </button>
        </div>
      </div>
    );
  }

  const handleArchive = async () => {
    try {
      await archiveProperty(property.id);
      loadProperty();
    } catch (err) {
      console.error(err);
      alert('Failed to archive. Please try again.');
    }
  };

  const handleRestore = async () => {
    try {
      await restoreProperty(property.id);
      loadProperty();
    } catch (err) {
      console.error(err);
      alert('Failed to restore. Please try again.');
    }
  };

  const handleDeletePermanently = async () => {
    if (!window.confirm('Permanently delete this listing? This cannot be undone.')) return;
    try {
      await deletePropertyPermanently(property.id);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Failed to delete. Please try again.');
    }
  };

  return (
    <div className="property-detail-page">
      <div className="property-detail-container">
        <div className="property-detail-header">
          <h1>{formatPrice(property.price)}</h1>
          <p className="property-address">{formatAddress(property)}</p>
        </div>

        {property.photos && property.photos.length > 0 && (
          <div className="property-photos">
            <div className="property-main-photo">
              <img
                src={property.photos[selectedPhotoIndex]}
                alt={property.address}
              />
            </div>
            {property.photos.length > 1 && (
              <div className="property-photo-thumbnails">
                {property.photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`${property.address} - Photo ${index + 1}`}
                    className={selectedPhotoIndex === index ? 'active' : ''}
                    onClick={() => setSelectedPhotoIndex(index)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="property-detail-content">
          <div className="property-main-content">
            <div className="property-overview">
              <h2>Overview</h2>
              <div className="property-stats">
                <div className="stat">
                  <span className="stat-label">Bedrooms</span>
                  <span className="stat-value">{property.bedrooms}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Bathrooms</span>
                  <span className="stat-value">{property.bathrooms}</span>
                </div>
                {property.squareFeet && (
                  <div className="stat">
                    <span className="stat-label">Square Feet</span>
                    <span className="stat-value">
                      {property.squareFeet.toLocaleString()}
                    </span>
                  </div>
                )}
                {property.lotSize && (
                  <div className="stat">
                    <span className="stat-label">Lot Size</span>
                    <span className="stat-value">
                      {property.lotSize.toLocaleString()} sq ft
                    </span>
                  </div>
                )}
                {property.yearBuilt && (
                  <div className="stat">
                    <span className="stat-label">Year Built</span>
                    <span className="stat-value">{property.yearBuilt}</span>
                  </div>
                )}
                {property.propertyType && (
                  <div className="stat">
                    <span className="stat-label">Property Type</span>
                    <span className="stat-value">
                      {property.propertyType
                        .split('-')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {property.description && (
              <div className="property-description">
                <h2>Description</h2>
                <p>{property.description}</p>
              </div>
            )}

            {property.features && property.features.length > 0 && (
              <div className="property-features">
                <h2>Features</h2>
                <div className="features-list">
                  {property.features.map((feature, index) => (
                    <span key={index} className="feature-tag">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="property-sidebar">
            {isOwner ? (
              <div className="property-owner-actions">
                <p className="owner-stat">
                  {favoriteCount !== null
                    ? favoriteCount === 0
                      ? 'No favorites yet'
                      : `${favoriteCount} ${favoriteCount === 1 ? 'favorite' : 'favorites'}`
                    : '—'}
                </p>
                {property.archived && (
                  <p className="owner-archived-note">This listing is archived and hidden from browse.</p>
                )}
                {!property.archived && (
                  <Link to={`/property/${property.id}/edit`} className="btn btn-primary btn-large">
                    Edit Property
                  </Link>
                )}
                {property.archived ? (
                  <button type="button" className="btn btn-outline btn-large" onClick={handleRestore}>
                    Restore
                  </button>
                ) : (
                  <button type="button" className="btn btn-outline btn-large" onClick={handleArchive}>
                    Archive
                  </button>
                )}
                <button type="button" className="btn btn-danger btn-large" onClick={handleDeletePermanently}>
                  Delete Permanently
                </button>
              </div>
            ) : (
              <div className="property-actions">
                {property.acceptingCommunications !== false ? (
                  <Link to={`/submit-offer/${property.id}`} className="btn btn-primary btn-large">
                    Submit Offer
                  </Link>
                ) : (
                  <p className="property-comms-closed">This seller is not accepting offers or inquiries at this time.</p>
                )}
                <button 
                  className="btn btn-secondary btn-large"
                  onClick={() => {
                    alert('Tour scheduling coming soon! For now, please contact the seller directly.');
                  }}
                >
                  Schedule Tour
                </button>
                <button
                  className={`btn btn-outline btn-large ${favorited ? 'favorited' : ''}`}
                  onClick={handleFavoriteToggle}
                  disabled={favoriteLoading}
                >
                  {favoriteLoading ? '...' : favorited ? '★ Favorited' : '☆ Add to Favorites'}
                </button>
              </div>
            )}

            <div className="property-details-card">
              <h3>Property Details</h3>
              <div className="detail-row">
                <span className="detail-label">Price</span>
                <span className="detail-value">{formatPrice(property.price)}</span>
              </div>
              {property.hoaFee && (
                <div className="detail-row">
                  <span className="detail-label">HOA Fee</span>
                  <span className="detail-value">
                    {formatPrice(property.hoaFee)}/month
                  </span>
                </div>
              )}
              {property.propertyTax && (
                <div className="detail-row">
                  <span className="detail-label">Property Tax</span>
                  <span className="detail-value">
                    {formatPrice(property.propertyTax)}/year
                  </span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value">
                  {property.archived
                    ? 'Archived'
                    : property.status === 'active'
                    ? 'Active'
                    : property.status === 'under_contract'
                    ? 'Under Contract'
                    : property.status}
                </span>
              </div>
              <div className={`detail-row ${isOwner ? 'detail-row--comms' : ''}`}>
                <span className="detail-label">Communications</span>
                {isOwner ? (
                  <label className="comms-toggle-wrap">
                    <span className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={property.acceptingCommunications !== false}
                        onChange={handleCommsToggle}
                        disabled={commsUpdating}
                        aria-label="Accepting communications from buyers"
                      />
                      <span className="toggle-switch__track" aria-hidden />
                    </span>
                    <span className={`comms-toggle-label detail-value--comms-${property.acceptingCommunications !== false ? 'accepting' : 'not-accepting'}`}>
                      {property.acceptingCommunications !== false ? 'Accepting' : 'Not accepting'}
                    </span>
                  </label>
                ) : (
                  <span className={`detail-value detail-value--comms-${property.acceptingCommunications !== false ? 'accepting' : 'not-accepting'}`}>
                    {property.acceptingCommunications !== false ? 'Accepting communications' : 'Not accepting communications'}
                  </span>
                )}
              </div>
              {property.verified && (
                <div className="detail-row">
                  <span className="detail-label">Verification</span>
                  <span className="detail-value detail-value--verified">✓ Verified</span>
                </div>
              )}
            </div>

            {(() => {
              const prog = getListingTierProgress(property);
              return (
                <div className="property-tier-progress-card">
                  <h3>Listing tier</h3>
                  <div className="tier-current">
                    <span className={`tier-badge tier-badge--${prog.tier}`}>{getListingTierLabel(prog.tier)}</span>
                  </div>
                  {prog.nextTier && (
                    <>
                      <div className="tier-progress-row">
                        <span className="tier-progress-label">{prog.percentage}% to {prog.nextTier}</span>
                        <div className="tier-progress-track">
                          <div className="tier-progress-fill" style={{ width: `${prog.percentage}%` }} />
                        </div>
                      </div>
                      {prog.missingItems.length > 0 && (
                        <div className="tier-missing">
                          <span className="tier-missing-title">Missing to reach {prog.nextTier}:</span>
                          <ul className="tier-missing-list">
                            {prog.missingItems.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {isOwner && (
                        <Link to={`/property/${property.id}/get-verified`} className="tier-advance-btn">
                          Advance to next status
                        </Link>
                      )}
                    </>
                  )}
                  {!prog.nextTier && <p className="tier-complete">All requirements for Premium are met.</p>}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
