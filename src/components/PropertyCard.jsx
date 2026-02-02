import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getListingTier, getListingTierLabel } from '../utils/verificationScores';
import './PropertyCard.css';

const PropertyCard = ({ property, embedded, compact, listingTier }) => {
  const tier = listingTier ?? getListingTier(property);
  const isListedStatus = property.availableForSale !== false && property.status !== 'not_listed';
  const [imgError, setImgError] = useState(false);
  const photoUrl = property.photos?.[0];

  useEffect(() => {
    setImgError(false);
  }, [photoUrl, property.id]);

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

  const formatPropertyType = (type) => {
    if (!type) return '';
    return type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

  const showImage = photoUrl && !imgError;
  const commissionRange = formatCommissionRange(property.price);

  return (
    <Link
      to={`/property/${property.id}`}
      className={`property-card ${embedded ? 'property-card--embedded' : ''} ${compact ? 'property-card--compact' : ''}`}
    >
      <div className="property-card__media">
        {showImage ? (
          <img
            src={photoUrl}
            alt={property.address || 'Property'}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="property-card__placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>No photo yet</span>
          </div>
        )}
        {property.status === 'under_contract' && (
          <span className="property-card__badge property-card__badge--contract">Under Contract</span>
        )}
      </div>

      <div className="property-card__body">
        <div className="property-card__head">
          <span className="property-card__price">{formatPrice(property.price)}</span>
          {property.propertyType && (
            <span className="property-card__type">{formatPropertyType(property.propertyType)}</span>
          )}
        </div>
        {commissionRange && (
          <p className="property-card__commission">Typical agent commission (5–6%): {commissionRange}</p>
        )}
        <p className="property-card__address">{formatAddress(property)}</p>
        <div className="property-card__meta">
          <span className="property-card__meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M2 4v16h20V4H2zm2 2h16v10H4V6z" />
            </svg>
            {property.bedrooms ?? 0} bed
          </span>
          <span className="property-card__meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M8 6h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
              <path d="M4 8V6a2 2 0 0 1 2-2h2" />
            </svg>
            {property.bathrooms ?? 0} bath
          </span>
          {property.squareFeet ? (
            <span className="property-card__meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              {property.squareFeet.toLocaleString()} sq ft
            </span>
          ) : null}
        </div>
        <div className="property-card__tags">
          <span className={`property-card__tag property-card__tag--tier property-card__tag--${tier}`}>
            {tier === 'basic' && <span className="property-card__tag-icon">⚪</span>}
            {tier === 'complete' && <span className="property-card__tag-icon">📋</span>}
            {tier === 'verified' && <span className="property-card__tag-icon">✓</span>}
            {tier === 'enhanced' && <span className="property-card__tag-icon">🔒</span>}
            {tier === 'premium' && <span className="property-card__tag-icon">⭐</span>}
            {tier === 'elite' && <span className="property-card__tag-icon">👑</span>}
            <span>{getListingTierLabel(tier)}</span>
          </span>
          <span className={`property-card__tag property-card__tag--status property-card__tag--${isListedStatus ? 'listed' : 'not-listed'}`}>
            {isListedStatus ? 'Listed' : 'Off Market'}
          </span>
          <span className={`property-card__tag property-card__tag--comms property-card__tag--comms-${property.acceptingCommunications !== false ? 'accepting' : 'not-accepting'}`}>
            {property.acceptingCommunications !== false ? 'Accepting' : 'Not accepting'}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default PropertyCard;
