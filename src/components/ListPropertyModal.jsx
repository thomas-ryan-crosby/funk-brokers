import { useState } from 'react';
import './ListPropertyModal.css';

const PROPERTY_TYPES = [
  'Single Family',
  'Condo',
  'Townhouse',
  'Multi-Family',
  'Land',
];

const ListPropertyModal = ({ onContinue, onCancel }) => {
  const [formData, setFormData] = useState({
    propertyType: '',
    yearBuilt: '',
    bedrooms: '',
    bathrooms: '',
    squareFeet: '',
    lotSize: '',
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.propertyType || !formData.bedrooms || !formData.bathrooms) {
      setError('Please fill in Home Type, Beds, and Baths.');
      return;
    }
    onContinue({
      propertyType: formData.propertyType.toLowerCase().replace(/ /g, '-'),
      yearBuilt: formData.yearBuilt || '',
      bedrooms: formData.bedrooms,
      bathrooms: formData.bathrooms,
      squareFeet: formData.squareFeet || '',
      lotSize: formData.lotSize || '',
    });
  };

  return (
    <div className="list-property-modal-overlay" onClick={onCancel}>
      <div className="list-property-modal" onClick={(e) => e.stopPropagation()}>
        <div className="list-property-modal-header">
          <h2>List Your Property</h2>
          <p>Tell us a few basics about your home</p>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="list-property-modal-form">
          {error && <div className="modal-error">{error}</div>}

          <div className="modal-fields">
            <div className="form-group">
              <label>Home Type *</label>
              <select
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
                required
              >
                <option value="">Select type</option>
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Year Built</label>
              <input
                type="number"
                name="yearBuilt"
                value={formData.yearBuilt}
                onChange={handleChange}
                placeholder="e.g. 1995"
                min="1800"
                max={new Date().getFullYear()}
              />
            </div>

            <div className="form-group">
              <label>Beds *</label>
              <input
                type="number"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                placeholder="e.g. 3"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label>Baths *</label>
              <input
                type="number"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                placeholder="e.g. 2"
                min="0"
                step="0.5"
                required
              />
            </div>

            <div className="form-group">
              <label>Square Feet</label>
              <input
                type="number"
                name="squareFeet"
                value={formData.squareFeet}
                onChange={handleChange}
                placeholder="e.g. 2000"
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Lot Size (sq ft)</label>
              <input
                type="number"
                name="lotSize"
                value={formData.lotSize}
                onChange={handleChange}
                placeholder="e.g. 5000"
                min="0"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ListPropertyModal;
