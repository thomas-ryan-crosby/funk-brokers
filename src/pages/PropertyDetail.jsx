import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPropertyById } from '../services/propertyService';
import './PropertyDetail.css';

const PropertyDetail = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    loadProperty();
  }, [id]);

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
          <a href="/">Back to Properties</a>
        </div>
      </div>
    );
  }

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
            <div className="property-actions">
              <Link to={`/#/submit-offer/${property.id}`} className="btn-primary btn-large">
                Submit Offer
              </Link>
              <button className="btn-secondary btn-large">Schedule Tour</button>
            </div>

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
                  {property.status === 'active'
                    ? 'Active'
                    : property.status === 'under_contract'
                    ? 'Under Contract'
                    : property.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
