import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchPropertyDetail } from '../data/firestoreLayer';
import { getPropertyById, updateProperty, archiveProperty, restoreProperty, deletePropertyPermanently } from '../services/propertyService';
import { addToFavorites, removeFromFavorites, isFavorited, getFavoriteCountForProperty, getFavoritesForProperty } from '../services/favoritesService';
import { getPreListingChecklist, isPreListingChecklistComplete } from '../services/preListingChecklistService';
import { calculateListingReadiness } from '../services/listingProgressService';
import { getListingTierProgress, getListingTierLabel } from '../utils/verificationScores';
import { createPing } from '../services/pingService';
import { getPostsForPropertyOrAddress } from '../services/postService';
import { getPropertySnapshot } from '../services/parcelService';
import { normalizeAttomSnapshot } from '../utils/attomSnapshotNormalizer';
import metrics from '../utils/metrics';
import PingOwnerModal from '../components/PingOwnerModal';
import './PropertyDetail.css';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userProfile, isAuthenticated } = useAuth();
  const propertyDetailStartRef = useRef(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(null);
  const [favoritesList, setFavoritesList] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [commsUpdating, setCommsUpdating] = useState(false);
  const [availableForSaleUpdating, setAvailableForSaleUpdating] = useState(false);
  const [acceptingOffersUpdating, setAcceptingOffersUpdating] = useState(false);
  const [listingReadiness, setListingReadiness] = useState(0);
  const [checklistComplete, setChecklistComplete] = useState(false);
  const [pingOpen, setPingOpen] = useState(false);
  const [pingSending, setPingSending] = useState(false);
  const [propertyPosts, setPropertyPosts] = useState([]);
  const [propertyPostsLoading, setPropertyPostsLoading] = useState(false);
  const [snapshotSections, setSnapshotSections] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  const isOwner = !!(property && user && property.sellerId === user.uid);

  // Listing readiness: use checklist completion when available, else property-based %
  useEffect(() => {
    if (!property || !isOwner) return;
    const readiness = calculateListingReadiness(property);
    setListingReadiness(readiness);
  }, [property, isOwner]);

  useEffect(() => {
    if (!property?.id || !isOwner) return;
    getPreListingChecklist(property.id).then((c) => setChecklistComplete(!!isPreListingChecklistComplete(c))).catch(() => setChecklistComplete(false));
  }, [property?.id, isOwner]);

  useEffect(() => {
    loadProperty();
  }, [id]);

  useEffect(() => {
    if (!property?.id) return;
    const loadPosts = async () => {
      try {
        setPropertyPostsLoading(true);
        const address = formatAddress(property);
        console.info('[PropertyPosts] loading', { propertyId: property.id, address });
        const posts = await getPostsForPropertyOrAddress(property.id, address);
        console.info('[PropertyPosts] loaded', { count: posts.length, propertyId: property.id });
        setPropertyPosts(posts);
      } catch (err) {
        console.error('Failed to load property posts', err);
        setPropertyPosts([]);
      } finally {
        setPropertyPostsLoading(false);
      }
    };
    loadPosts();
  }, [property?.id]);

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

  useEffect(() => {
    // Prefer stored snapshot from claim-time ATTOM fetch
    if (property?.attomSnapshot) {
      const sections = property.attomSnapshot;
      setSnapshotSections(Object.keys(sections).some((k) => sections[k] != null) ? sections : null);
      setSnapshotLoading(false);
      return;
    }
    // Fallback: live fetch for legacy properties without stored snapshot
    if (!property?.attomId || property.latitude == null || property.longitude == null) {
      setSnapshotSections(null);
      return;
    }
    let cancelled = false;
    setSnapshotLoading(true);
    getPropertySnapshot({
      attomId: property.attomId,
      latitude: property.latitude,
      longitude: property.longitude,
    })
      .then((res) => {
        if (cancelled) return;
        const payload = res?.payload ?? res;
        const sections = normalizeAttomSnapshot(payload || {});
        setSnapshotSections(Object.keys(sections).some((k) => sections[k] != null) ? sections : null);
      })
      .catch(() => {
        if (!cancelled) setSnapshotSections(null);
      })
      .finally(() => {
        if (!cancelled) {
          setSnapshotLoading(false);
          const start = propertyDetailStartRef.current;
          if (start) metrics.recordLatency('propertyDetail', Date.now() - start);
        }
      });
    return () => { cancelled = true; };
  }, [property?.attomSnapshot, property?.attomId, property?.latitude, property?.longitude]);

  const loadFavoritesList = async () => {
    if (!property?.id || !isOwner || favoritesLoading) return;
    setFavoritesLoading(true);
    try {
      const list = await getFavoritesForProperty(property.id);
      setFavoritesList(list);
    } catch (err) {
      console.error('Error loading favorites list:', err);
      setFavoritesList([]);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const handleOpenFavorites = async () => {
    await loadFavoritesList();
    setFavoritesOpen(true);
  };

  const formatFavoriteDate = (v) => {
    const d = v?.toDate ? v.toDate() : new Date(v || 0);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatPostDate = (v) => {
    const d = v?.toDate ? v.toDate() : new Date(v || 0);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFavoriteDisplayName = (fav) => {
    const profile = fav?.userProfile;
    if (profile?.anonymousProfile) return profile.publicUsername || 'Anonymous';
    return profile?.publicUsername || profile?.name || 'Unknown';
  };

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
      const data = await fetchPropertyDetail(id);
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

  const handleAvailableForSaleToggle = async () => {
    if (!property || !isOwner || availableForSaleUpdating) return;
    const next = !(property.availableForSale !== false);
    
    // If turning ON (making available for sale), check pre-listing checklist
    if (next && user?.uid) {
      try {
        const checklist = await getPreListingChecklist(property.id);
        if (!isPreListingChecklistComplete(checklist)) {
          navigate(`/pre-listing-checklist`, { 
            state: { 
              propertyId: property.id,
              returnTo: `/property/${property.id}`,
              propertyLocation: property.latitude && property.longitude ? {
                lat: property.latitude,
                lng: property.longitude
              } : null
            }
          });
          return;
        }
      } catch (err) {
        console.error('Error checking checklist:', err);
        navigate(`/pre-listing-checklist`, { 
          state: { 
            returnTo: `/property/${property.id}`,
            propertyLocation: property.latitude && property.longitude ? {
              lat: property.latitude,
              lng: property.longitude
            } : null
          } 
        });
        return;
      }
    }
    
    setAvailableForSaleUpdating(true);
    try {
      const updates = {
        availableForSale: next,
        status: next ? 'active' : 'not_listed',
      };
      await updateProperty(property.id, updates);
      const updated = await getPropertyById(property.id);
      setProperty(updated);
    } catch (err) {
      console.error(err);
      alert('Failed to update. Please try again.');
    } finally {
      setAvailableForSaleUpdating(false);
    }
  };

  const handleAcceptingOffersToggle = async () => {
    if (!property || !isOwner || acceptingOffersUpdating) return;
    const next = !(property.acceptingOffers === true);
    setAcceptingOffersUpdating(true);
    try {
      await updateProperty(property.id, { acceptingOffers: next });
      setProperty((p) => (p ? { ...p, acceptingOffers: next } : p));
    } catch (err) {
      console.error(err);
      alert('Failed to update. Please try again.');
    } finally {
      setAcceptingOffersUpdating(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatCommissionRange = (price) => {
    if (price == null || !Number.isFinite(Number(price))) return null;
    const low = Number(price) * 0.05;
    const high = Number(price) * 0.06;
    const fmt = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
    return `${fmt.format(low)}–${fmt.format(high)}`;
  };

  const formatAddress = (property) => {
    const parts = [property.address, property.city, property.state, property.zipCode].filter(Boolean);
    return parts.join(', ');
  };

  const formatDate = (v) => {
    if (v == null || v === '') return '—';
    const d = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? new Date(v) : new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatNumber = (v, opts = {}) => {
    if (v == null || !Number.isFinite(Number(v))) return '—';
    return Number(v).toLocaleString('en-US', opts);
  };

  const propTypeLabel = (v) =>
    (v || '')
      .split(/[-_\s]+/)
      .map((w) => w && w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ') || '—';

  const getSenderDisplayName = () => {
    if (userProfile?.anonymousProfile) return userProfile?.publicUsername || 'Anonymous';
    return userProfile?.name || user?.displayName || 'User';
  };

  const handlePingOwner = () => {
    if (!isAuthenticated) {
      navigate('/sign-in?redirect=' + encodeURIComponent(`/property/${id}`));
      return;
    }
    setPingOpen(true);
  };

  const handleSendPing = async ({ reasonType, note }) => {
    if (!user?.uid || !property?.sellerId || pingSending) return;
    setPingSending(true);
    try {
      await createPing({
        propertyId: property.id,
        propertyAddress: formatAddress(property),
        sellerId: property.sellerId,
        senderId: user.uid,
        senderName: getSenderDisplayName(),
        reasonType,
        note,
      });
      setPingOpen(false);
    } catch (err) {
      console.error('Failed to send ping', err);
      alert('Failed to send ping. Please try again.');
    } finally {
      setPingSending(false);
    }
  };

  const commissionRange = formatCommissionRange(property?.price);

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
          <button
            type="button"
            className="property-detail-back"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            ← Back
          </button>
          <h1>{formatPrice(property.price)}</h1>
          <p className="property-address">{formatAddress(property)}</p>
          {(property.estimatedWorth != null && Number.isFinite(Number(property.estimatedWorth))) || (property.makeMeMovePrice != null && Number.isFinite(Number(property.makeMeMovePrice))) ? (
            <p className="property-value-make-me">
              {property.estimatedWorth != null && Number.isFinite(Number(property.estimatedWorth)) && <span>Your value: {formatPrice(property.estimatedWorth)}</span>}
              {property.estimatedWorth != null && property.makeMeMovePrice != null && ' · '}
              {property.makeMeMovePrice != null && Number.isFinite(Number(property.makeMeMovePrice)) && <span>Make me move price: {formatPrice(property.makeMeMovePrice)}</span>}
            </p>
          ) : null}
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
                <button
                  type="button"
                  className="owner-stat owner-stat-button"
                  onClick={favoriteCount > 0 ? handleOpenFavorites : undefined}
                  disabled={!favoriteCount || favoriteCount === 0}
                >
                  {favoriteCount !== null
                    ? favoriteCount === 0
                      ? 'No favorites yet'
                      : `${favoriteCount} ${favoriteCount === 1 ? 'favorite' : 'favorites'}`
                    : '—'}
                </button>
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
                {property.acceptingCommunications === false ? (
                  <p className="property-comms-closed">This seller is not accepting offers or inquiries at this time.</p>
                ) : (
                  <>
                    <button
                      className="btn btn-outline btn-large"
                      onClick={handlePingOwner}
                    >
                      Ping owner
                    </button>
                    {(property.availableForSale !== false || property.acceptingOffers === true) ? (
                      <Link to={`/submit-offer/${property.id}`} className="btn btn-primary btn-large">
                        Submit Offer
                      </Link>
                    ) : (
                      <button type="button" className="btn btn-primary btn-large btn-disabled" disabled>
                        Submit Offer
                        <span className="btn-note">Not currently listed for sale</span>
                      </button>
                    )}
                    {property.availableForSale !== false && (
                      <button
                        className="btn btn-secondary btn-large"
                        onClick={() => {
                          alert('Tour scheduling coming soon! For now, please contact the seller directly.');
                        }}
                      >
                        Schedule Tour
                      </button>
                    )}
                    {property.sellerId && (
                      <Link
                        to={`/messages?to=${encodeURIComponent(property.sellerId)}&propertyId=${encodeURIComponent(property.id)}`}
                        state={{ otherUserName: property.sellerName || 'Seller', propertyAddress: formatAddress(property) }}
                        className="btn btn-outline btn-large"
                      >
                        Message seller
                      </Link>
                    )}
                    {property.sellerId && (
                      <Link
                        to={`/user/${property.sellerId}`}
                        className="btn btn-outline btn-large"
                      >
                        View seller profile
                      </Link>
                    )}
                    <button
                      className={`btn btn-outline btn-large ${favorited ? 'favorited' : ''}`}
                      onClick={handleFavoriteToggle}
                      disabled={favoriteLoading}
                    >
                      {favoriteLoading ? '...' : favorited ? '★ Favorited' : '☆ Add to Favorites'}
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="property-details-card">
              <h3>Property Details</h3>
              <div className="detail-row">
                <span className="detail-label">Price</span>
                <span className="detail-value">{formatPrice(property.price)}</span>
              </div>
              {(property.estimatedWorth != null && Number.isFinite(Number(property.estimatedWorth))) && (
                <div className="detail-row">
                  <span className="detail-label">Your value</span>
                  <span className="detail-value">{formatPrice(property.estimatedWorth)}</span>
                </div>
              )}
              {(property.makeMeMovePrice != null && Number.isFinite(Number(property.makeMeMovePrice))) && (
                <div className="detail-row">
                  <span className="detail-label">Make me move price</span>
                  <span className="detail-value">{formatPrice(property.makeMeMovePrice)}</span>
                </div>
              )}
              {commissionRange && (
                <div className="detail-row">
                  <span className="detail-label">Typical agent commission (5–6%)</span>
                  <span className="detail-value">{commissionRange}</span>
                </div>
              )}
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
                    : property.status === 'not_listed'
                    ? 'Off Market'
                    : property.status === 'active'
                    ? 'Active'
                    : property.status === 'under_contract'
                    ? 'Under Contract'
                    : property.status === 'sold'
                    ? 'Sold'
                    : property.status === 'withdrawn'
                    ? 'Withdrawn'
                    : property.status}
                </span>
              </div>
              <div className={`detail-row ${isOwner ? 'detail-row--comms' : ''}`}>
                <span className="detail-label">Available for sale</span>
                {isOwner ? (
                  <div className="available-for-sale-control">
                    <div className="available-for-sale-toggle-wrapper">
                      <label className="comms-toggle-wrap">
                        <span className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={property.availableForSale !== false}
                            onChange={handleAvailableForSaleToggle}
                            disabled={availableForSaleUpdating}
                            aria-label="Listed for sale on the platform"
                          />
                          <span className="toggle-switch__track" aria-hidden />
                        </span>
                        <span className={`comms-toggle-label detail-value--comms-${property.availableForSale !== false ? 'accepting' : 'not-accepting'}`}>
                          {property.availableForSale !== false ? 'Yes' : 'No'}
                        </span>
                      </label>
                      {property.availableForSale === false && (listingReadiness > 0 || checklistComplete) && (
                        <span className="listing-readiness-badge">
                          {checklistComplete ? '100% Ready' : `${listingReadiness}% Ready`}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-small edit-checklist-btn"
                      onClick={() => {
                        navigate('/pre-listing-checklist', {
                          state: {
                            propertyId: property.id,
                            returnTo: `/property/${property.id}`,
                            propertyLocation: property.latitude && property.longitude ? {
                              lat: property.latitude,
                              lng: property.longitude
                            } : null
                          }
                        });
                      }}
                    >
                      Edit Checklist
                    </button>
                  </div>
                ) : (
                  <span className="detail-value">
                    {property.availableForSale !== false ? 'Listed for sale' : 'Not currently for sale'}
                  </span>
                )}
              </div>
              <div className={`detail-row ${isOwner ? 'detail-row--comms' : ''}`}>
                <span className="detail-label">Accepting offers</span>
                {isOwner ? (
                  <label className="comms-toggle-wrap">
                    <span className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={property.acceptingOffers === true}
                        onChange={handleAcceptingOffersToggle}
                        disabled={acceptingOffersUpdating}
                        aria-label="Allow buyers to submit a PSA/offer even when not formally listed"
                      />
                      <span className="toggle-switch__track" aria-hidden />
                    </span>
                    <span className={`comms-toggle-label detail-value--comms-${property.acceptingOffers === true ? 'accepting' : 'not-accepting'}`}>
                      {property.acceptingOffers === true ? 'Yes' : 'No'}
                    </span>
                  </label>
                ) : (
                  <span className="detail-value">
                    {property.acceptingOffers === true ? 'Yes — buyers can submit an offer' : 'No'}
                  </span>
                )}
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
            </div>

            {/* A–G: Physical, Ownership, Mortgage, Sales, Valuation, Tax, Distress */}
            {snapshotLoading && (
              <div className="property-details-card property-detail-section-card">
                <p className="detail-section-loading">Loading public records…</p>
              </div>
            )}
            {!snapshotLoading && (
              <>
                {/* A) Physical Characteristics — snapshot or property fallback */}
                {(snapshotSections?.physical || property.bedrooms != null || property.squareFeet != null || property.propertyType || property.yearBuilt) && (
                  <div className="property-details-card property-detail-section-card">
                    <h3>Physical Characteristics</h3>
                    {(() => {
                      const ph = snapshotSections?.physical;
                      return (
                        <>
                          <div className="detail-row"><span className="detail-label">Property type</span><span className="detail-value">{propTypeLabel(ph?.propertyType || property.propertyType)}</span></div>
                          {(ph?.livingAreaSqft ?? property.squareFeet) != null && <div className="detail-row"><span className="detail-label">Living area</span><span className="detail-value">{formatNumber(ph?.livingAreaSqft ?? property.squareFeet)} sq ft</span></div>}
                          {(ph?.lotSizeSqft ?? property.lotSize) != null && <div className="detail-row"><span className="detail-label">Lot size</span><span className="detail-value">{formatNumber(ph?.lotSizeSqft ?? property.lotSize)} sq ft</span></div>}
                          {(ph?.yearBuilt ?? property.yearBuilt) != null && <div className="detail-row"><span className="detail-label">Year built</span><span className="detail-value">{ph?.yearBuilt ?? property.yearBuilt}</span></div>}
                          {(ph?.beds ?? property.bedrooms) != null && <div className="detail-row"><span className="detail-label">Beds</span><span className="detail-value">{ph?.beds ?? property.bedrooms}</span></div>}
                          {(ph?.baths ?? property.bathrooms) != null && <div className="detail-row"><span className="detail-label">Baths</span><span className="detail-value">{ph?.baths ?? property.bathrooms}</span></div>}
                          {ph?.constructionType && <div className="detail-row"><span className="detail-label">Construction type</span><span className="detail-value">{ph.constructionType}</span></div>}
                          {ph?.stories != null && <div className="detail-row"><span className="detail-label">Stories</span><span className="detail-value">{ph.stories}</span></div>}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* B) Ownership & Deed */}
                {snapshotSections?.ownership && (
                  <div className="property-details-card property-detail-section-card">
                    <h3>Ownership &amp; Deed Events</h3>
                    {snapshotSections.ownership.currentOwnerNames?.length > 0 && (
                      <div className="detail-row">
                        <span className="detail-label">Current owner(s)</span>
                        <span className="detail-value detail-value-list">{snapshotSections.ownership.currentOwnerNames.join(', ')}</span>
                      </div>
                    )}
                    {snapshotSections.ownership.lastTransferDate && <div className="detail-row"><span className="detail-label">Last transfer date</span><span className="detail-value">{formatDate(snapshotSections.ownership.lastTransferDate)}</span></div>}
                    {snapshotSections.ownership.lastDeedType && <div className="detail-row"><span className="detail-label">Last deed type</span><span className="detail-value">{snapshotSections.ownership.lastDeedType}</span></div>}
                    {snapshotSections.ownership.lastRecordingDate && <div className="detail-row"><span className="detail-label">Last recording date</span><span className="detail-value">{formatDate(snapshotSections.ownership.lastRecordingDate)}</span></div>}
                    {snapshotSections.ownership.lastSalePrice != null && <div className="detail-row"><span className="detail-label">Last sale price</span><span className="detail-value">{formatPrice(snapshotSections.ownership.lastSalePrice)}</span></div>}
                    {snapshotSections.ownership.ownershipChain?.length > 0 && (
                      <div className="detail-section-list">
                        <span className="detail-label">Ownership chain</span>
                        <ul className="detail-value-list-ul">
                          {snapshotSections.ownership.ownershipChain.map((e, i) => (
                            <li key={i}>
                              {e.seller && <span>{e.seller}</span>} → {e.buyer && <span>{e.buyer}</span>}
                              {e.saleDate && <span> · {formatDate(e.saleDate)}</span>}
                              {e.price != null && <span> · {formatPrice(e.price)}</span>}
                              {e.deedType && <span> · {e.deedType}</span>}
                              {e.recordingDate && <span> · Rec. {formatDate(e.recordingDate)}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* C) Mortgage & Financing */}
                {snapshotSections?.mortgage && (
                  <div className="property-details-card property-detail-section-card">
                    <h3>Mortgage &amp; Financing</h3>
                    {snapshotSections.mortgage.activeMortgages?.length > 0 && (
                      <div className="detail-section-list">
                        <span className="detail-label">Active mortgage(s)</span>
                        <ul className="detail-value-list-ul">
                          {snapshotSections.mortgage.activeMortgages.map((m, i) => (
                            <li key={i}>
                              {m.originalLoanAmount != null && formatPrice(m.originalLoanAmount)}
                              {m.lenderName && ` · ${m.lenderName}`}
                              {m.loanType && ` · ${m.loanType}`}
                              {(m.interestRate != null && m.interestRate !== '') && ` · Rate ${m.interestRate}`}
                              {m.recordingDate && ` · ${formatDate(m.recordingDate)}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {snapshotSections.mortgage.refinanceEvents?.length > 0 && (
                      <div className="detail-section-list">
                        <span className="detail-label">Refinance events</span>
                        <ul className="detail-value-list-ul">
                          {snapshotSections.mortgage.refinanceEvents.map((e, i) => (
                            <li key={i}>{formatDate(e.date)} {e.originalLoanAmount != null && ` · ${formatPrice(e.originalLoanAmount)}`} {e.lenderName && ` · ${e.lenderName}`}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {snapshotSections.mortgage.secondaryLiensOrHelocs?.length > 0 && (
                      <div className="detail-section-list">
                        <span className="detail-label">Secondary liens / HELOCs</span>
                        <ul className="detail-value-list-ul">
                          {snapshotSections.mortgage.secondaryLiensOrHelocs.map((e, i) => (
                            <li key={i}>{e.amount != null && formatPrice(e.amount)} {e.lenderName && ` · ${e.lenderName}`} {e.type && ` · ${e.type}`} {e.recordingDate && ` · ${formatDate(e.recordingDate)}`}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* D) Sales History */}
                {snapshotSections?.salesHistory?.salesHistory?.length > 0 && (
                  <div className="property-details-card property-detail-section-card">
                    <h3>Sales History</h3>
                    <ul className="detail-value-list-ul">
                      {snapshotSections.salesHistory.salesHistory.map((s, i) => (
                        <li key={i}>
                          {formatDate(s.saleDate)} · {s.salePrice != null ? formatPrice(s.salePrice) : '—'}
                          {s.armsLengthIndicator && ` · Arms length: ${s.armsLengthIndicator}`}
                          {s.transactionType && ` · ${s.transactionType}`}
                          {s.flipSignal && ` · Flip: ${s.flipSignal}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* E) Valuation & Equity */}
                {snapshotSections?.valuation && (
                  <div className="property-details-card property-detail-section-card">
                    <h3>Valuation &amp; Equity</h3>
                    {snapshotSections.valuation.avmValue != null && <div className="detail-row"><span className="detail-label">AVM value</span><span className="detail-value">{formatPrice(snapshotSections.valuation.avmValue)}</span></div>}
                    {snapshotSections.valuation.estimatedEquity != null && <div className="detail-row"><span className="detail-label">Estimated equity</span><span className="detail-value">{formatPrice(snapshotSections.valuation.estimatedEquity)}</span></div>}
                    {(snapshotSections.valuation.estimatedLTV != null && snapshotSections.valuation.estimatedLTV !== '') && <div className="detail-row"><span className="detail-label">Estimated LTV</span><span className="detail-value">{typeof snapshotSections.valuation.estimatedLTV === 'number' ? `${(snapshotSections.valuation.estimatedLTV * 100).toFixed(1)}%` : snapshotSections.valuation.estimatedLTV}</span></div>}
                    {snapshotSections.valuation.priceTrendIndicators && <div className="detail-row"><span className="detail-label">Price trend</span><span className="detail-value">{snapshotSections.valuation.priceTrendIndicators}</span></div>}
                    {(snapshotSections.valuation.confidenceScore != null && snapshotSections.valuation.confidenceScore !== '') && <div className="detail-row"><span className="detail-label">Confidence score</span><span className="detail-value">{typeof snapshotSections.valuation.confidenceScore === 'number' ? `${(snapshotSections.valuation.confidenceScore * 100).toFixed(0)}%` : snapshotSections.valuation.confidenceScore}</span></div>}
                  </div>
                )}

                {/* F) Tax & Assessment */}
                {snapshotSections?.tax && (
                  <div className="property-details-card property-detail-section-card">
                    <h3>Tax &amp; Assessment</h3>
                    {snapshotSections.tax.assessedValueLand != null && <div className="detail-row"><span className="detail-label">Assessed value (land)</span><span className="detail-value">{formatPrice(snapshotSections.tax.assessedValueLand)}</span></div>}
                    {snapshotSections.tax.assessedValueImprovement != null && <div className="detail-row"><span className="detail-label">Assessed value (improvement)</span><span className="detail-value">{formatPrice(snapshotSections.tax.assessedValueImprovement)}</span></div>}
                    {snapshotSections.tax.assessedValueTotal != null && <div className="detail-row"><span className="detail-label">Assessed value (total)</span><span className="detail-value">{formatPrice(snapshotSections.tax.assessedValueTotal)}</span></div>}
                    {snapshotSections.tax.taxMarketValue != null && <div className="detail-row"><span className="detail-label">Tax market value</span><span className="detail-value">{formatPrice(snapshotSections.tax.taxMarketValue)}</span></div>}
                    {(snapshotSections.tax.taxYear != null && snapshotSections.tax.taxYear !== '') && <div className="detail-row"><span className="detail-label">Tax year</span><span className="detail-value">{snapshotSections.tax.taxYear}</span></div>}
                    {snapshotSections.tax.taxAmount != null && <div className="detail-row"><span className="detail-label">Tax amount</span><span className="detail-value">{formatPrice(snapshotSections.tax.taxAmount)}/year</span></div>}
                    {snapshotSections.tax.exemptions?.length > 0 && (
                      <div className="detail-row">
                        <span className="detail-label">Exemptions</span>
                        <span className="detail-value detail-value-list">{snapshotSections.tax.exemptions.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* G) Distress / Default */}
                {snapshotSections?.distress && (
                  <div className="property-details-card property-detail-section-card">
                    <h3>Distress / Default Indicators</h3>
                    {snapshotSections.distress.foreclosureFilings?.length > 0 && (
                      <div className="detail-section-list">
                        <span className="detail-label">Foreclosure filings</span>
                        <ul className="detail-value-list-ul">
                          {snapshotSections.distress.foreclosureFilings.map((f, i) => (
                            <li key={i}>{typeof f === 'object' ? JSON.stringify(f) : String(f)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {snapshotSections.distress.preForeclosure != null && (
                      <div className="detail-row">
                        <span className="detail-label">Pre-foreclosure</span>
                        <span className="detail-value">{typeof snapshotSections.distress.preForeclosure === 'object' ? 'Yes' : String(snapshotSections.distress.preForeclosure)}</span>
                      </div>
                    )}
                    {snapshotSections.distress.auctionNotices?.length > 0 && (
                      <div className="detail-section-list">
                        <span className="detail-label">Auction notices</span>
                        <ul className="detail-value-list-ul">
                          {snapshotSections.distress.auctionNotices.map((a, i) => (
                            <li key={i}>{typeof a === 'object' ? JSON.stringify(a) : String(a)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {snapshotSections.distress.reoStatus && (
                      <div className="detail-row"><span className="detail-label">REO status</span><span className="detail-value">{snapshotSections.distress.reoStatus}</span></div>
                    )}
                  </div>
                )}
              </>
            )}

            {(() => {
              const prog = getListingTierProgress(property);
              const tiers = [
                { id: 'basic', label: 'Claimed' },
                { id: 'complete', label: 'Complete' },
                { id: 'verified', label: 'Verified' },
                { id: 'enhanced', label: 'Enhanced' },
                { id: 'premium', label: 'Premium' },
                { id: 'elite', label: 'Elite' },
              ];
              const currentTierIndex = tiers.findIndex((t) => t.id === prog.tier);
              return (
                <div className="property-tier-progress-card">
                  <h3>Property tier</h3>
                  <div className="tier-current">
                    <span className={`tier-badge tier-badge--${prog.tier}`}>
                      {prog.tier === 'basic' && <span className="tier-badge-icon">⚪</span>}
                      {prog.tier === 'complete' && <span className="tier-badge-icon">📋</span>}
                      {prog.tier === 'verified' && <span className="tier-badge-icon">✓</span>}
                      {prog.tier === 'enhanced' && <span className="tier-badge-icon">🔒</span>}
                      {prog.tier === 'premium' && <span className="tier-badge-icon">⭐</span>}
                      {prog.tier === 'elite' && <span className="tier-badge-icon">👑</span>}
                      <span className="tier-badge-text">{getListingTierLabel(prog.tier)}</span>
                    </span>
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
                      {isOwner && (() => {
                        // Determine the best route based on current tier and next tier
                        // Basic/Complete → need property info (edit property)
                        // Verified/Enhanced/Premium → need documents/advanced assets (get verified)
                        const needsDocuments = prog.tier === 'verified' || prog.tier === 'enhanced' || prog.tier === 'premium';
                        const advanceUrl = needsDocuments 
                          ? `/property/${property.id}/get-verified`
                          : `/property/${property.id}/edit`;
                        let advanceText;
                        if (needsDocuments) {
                          if (prog.tier === 'verified') {
                            advanceText = 'Advance to Enhanced';
                          } else if (prog.tier === 'enhanced') {
                            advanceText = 'Advance to Premium';
                          } else if (prog.tier === 'premium') {
                            advanceText = 'Advance to Elite';
                          } else {
                            advanceText = 'Add documents & verify';
                          }
                        } else if (prog.tier === 'basic') {
                          advanceText = 'Advance to Complete';
                        } else if (prog.tier === 'complete') {
                          advanceText = 'Advance to Verified';
                        } else {
                          advanceText = 'Add property information';
                        }
                        return (
                          <Link to={advanceUrl} className="tier-advance-btn">
                            {advanceText}
                          </Link>
                        );
                      })()}
                    </>
                  )}
                  {!prog.nextTier && <p className="tier-complete">All requirements for Elite tier are met.</p>}
                  <div className="tier-timeline">
                    {tiers.map((tier, idx) => (
                      <div key={tier.id} className={`tier-timeline-item ${idx === currentTierIndex ? 'tier-timeline-item--current' : idx < currentTierIndex ? 'tier-timeline-item--completed' : 'tier-timeline-item--upcoming'}`}>
                        <div className="tier-timeline-dot" />
                        <span className="tier-timeline-label">{tier.label}</span>
                        {idx < tiers.length - 1 && <div className="tier-timeline-line" />}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="property-posts">
            <div className="property-posts-header">
              <h2>Community Posts</h2>
              <p>Public posts linked to this property.</p>
            </div>
            {propertyPostsLoading ? (
              <p className="property-posts-empty">Loading posts...</p>
            ) : propertyPosts.length === 0 ? (
              <p className="property-posts-empty">No posts yet for this property.</p>
            ) : (
              <div className="property-posts-list">
                {propertyPosts.map((post) => (
                  <div key={post.id} className="property-post">
                    <div className="property-post-meta">
                      <span className="property-post-author">{post.authorName || 'Someone'}</span>
                      <span className="property-post-date">{formatPostDate(post.createdAt)}</span>
                    </div>
                  <div className="property-post-body">{post.body}</div>
                  {post.propertyAddress && post.propertyId && (
                    <div className="property-post-link">
                      <Link to={`/property/${post.propertyId}`}>{post.propertyAddress}</Link>
                    </div>
                  )}
                  {(post.hashtags?.length || post.userTags?.length) && (
                    <div className="property-post-tags">
                      {post.hashtags?.map((tag) => (
                        <span key={`${post.id}-hash-${tag}`} className="property-post-tag">#{tag}</span>
                      ))}
                      {post.userTags?.map((tag) => (
                        <span key={`${post.id}-user-${tag}`} className="property-post-tag">@{tag}</span>
                      ))}
                    </div>
                  )}
                    {post.imageUrl && (
                      <div className="property-post-media">
                        <img src={post.imageUrl} alt="Post media" />
                      </div>
                    )}
                    {post.pollOptions && post.pollOptions.length > 0 && (
                      <div className="property-post-poll">
                        {post.pollOptions.map((opt, idx) => (
                          <div key={`${post.id}-opt-${idx}`} className="property-post-poll-option">
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <PingOwnerModal
          open={pingOpen}
          propertyAddress={formatAddress(property)}
          onClose={() => setPingOpen(false)}
          onSend={handleSendPing}
          sending={pingSending}
        />
        {favoritesOpen && (
          <div className="favorites-modal-overlay" onClick={() => setFavoritesOpen(false)}>
            <div className="favorites-modal" onClick={(e) => e.stopPropagation()}>
              <div className="favorites-modal-header">
                <h3>Favorites</h3>
                <button type="button" className="favorites-modal-close" onClick={() => setFavoritesOpen(false)}>×</button>
              </div>
              {favoritesLoading ? (
                <p className="favorites-modal-empty">Loading favorites...</p>
              ) : favoritesList.length === 0 ? (
                <p className="favorites-modal-empty">No favorites yet.</p>
              ) : (
                <div className="favorites-list">
                  {favoritesList.map((fav) => (
                    <div key={fav.id} className="favorites-item">
                      <div className="favorites-item-main">
                        <span className="favorites-item-name">{getFavoriteDisplayName(fav)}</span>
                        <span className="favorites-item-date">{formatFavoriteDate(fav.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyDetail;
