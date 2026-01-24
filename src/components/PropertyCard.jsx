import { Link } from 'react-router-dom';
import './PropertyCard.css';

const PropertyCard = ({ property }) => {
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

  return (
    <Link to={`/property/${property.id}`} className="property-card">
      <div className="property-card-image">
        {property.photos && property.photos.length > 0 ? (
          <img src={property.photos[0]} alt={property.address} />
        ) : (
          <div className="property-card-placeholder">No Image</div>
        )}
        {property.status === 'under_contract' && (
          <div className="property-card-badge">Under Contract</div>
        )}
        {property.verified && property.status !== 'under_contract' && (
          <div className="property-card-badge property-card-badge--verified">Verified</div>
        )}
      </div>
      <div className="property-card-content">
        <div className="property-card-price">{formatPrice(property.price)}</div>
        <div className="property-card-address">{formatAddress(property)}</div>
        <div className="property-card-details">
          <span>{property.bedrooms} bed</span>
          <span>{property.bathrooms} bath</span>
          {property.squareFeet && <span>{property.squareFeet.toLocaleString()} sq ft</span>}
        </div>
        {property.propertyType && (
          <div className="property-card-type">{property.propertyType}</div>
        )}
      </div>
    </Link>
  );
};

export default PropertyCard;
