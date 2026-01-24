import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createProperty } from '../services/propertyService';
import { uploadMultipleFiles } from '../services/storageService';
import PreListingChecklist from '../components/PreListingChecklist';
import ListPropertyModal from '../components/ListPropertyModal';
import '../components/ListPropertyModal.css';
import './ListProperty.css';

const ListProperty = () => {
  const { user, userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [saleProfile] = useState(() => {
    if (location.state?.startFresh) {
      try { sessionStorage.removeItem('funk_saleProfile'); } catch (e) {}
      return undefined;
    }
    const fromState = location.state?.saleProfile;
    if (fromState) return fromState;
    try {
      const raw = sessionStorage.getItem('funk_saleProfile');
      if (raw) {
        sessionStorage.removeItem('funk_saleProfile');
        return JSON.parse(raw);
      }
    } catch (e) {}
    return undefined;
  });
  const [showQuickModal, setShowQuickModal] = useState(!saleProfile);
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistData, setChecklistData] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // Redirect to sign up if not authenticated
      navigate('/sign-up?redirect=/list-property');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const [formData, setFormData] = useState(() => {
    const base = {
      address: '',
      city: '',
      state: '',
      zipCode: '',
      propertyType: '',
      price: '',
      squareFeet: '',
      lotSize: '',
      yearBuilt: '',
      bedrooms: '',
      bathrooms: '',
      description: '',
      photos: [],
      features: [],
      hoaFee: '',
      propertyTax: '',
    };
    if (saleProfile) {
      return {
        ...base,
        address: saleProfile.address ?? base.address,
        city: saleProfile.city ?? base.city,
        state: saleProfile.state ?? base.state,
        zipCode: saleProfile.zipCode ?? base.zipCode,
        price: saleProfile.targetPrice != null ? String(saleProfile.targetPrice) : (saleProfile.price != null ? String(saleProfile.price) : base.price),
      };
    }
    return base;
  });

  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);

  const propertyTypes = [
    'Single Family',
    'Condo',
    'Townhouse',
    'Multi-Family',
    'Land',
  ];

  const commonFeatures = [
    'Garage',
    'Fireplace',
    'Pool',
    'Garden',
    'Hardwood Floors',
    'Updated Kitchen',
    'Updated Bathroom',
    'Central Air',
    'Central Heat',
    'Washer/Dryer',
    'Dishwasher',
    'Garbage Disposal',
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotoFiles(files);

    // Create previews
    const previews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previews);
  };

  const handleFeatureToggle = (feature) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const validateStep = (stepNum) => {
    if (stepNum === 1) {
      return (
        formData.address &&
        formData.city &&
        formData.state &&
        formData.zipCode &&
        formData.propertyType &&
        formData.price
      );
    }
    if (stepNum === 2) {
      return formData.bedrooms && formData.bathrooms;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
      setError(null);
    } else {
      setError('Please fill in all required fields.');
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setError(null);
  };

  const handleQuickModalContinue = (data) => {
    setFormData((prev) => ({
      ...prev,
      propertyType: data.propertyType,
      yearBuilt: data.yearBuilt,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      squareFeet: data.squareFeet,
      lotSize: data.lotSize,
    }));
    setShowQuickModal(false);
    setShowChecklist(true);
  };

  const handleQuickModalCancel = () => {
    navigate('/dashboard');
  };

  const handleChecklistComplete = (data) => {
    setChecklistData(data);
    setShowChecklist(false);
    // Use photos from checklist if available
    if (data.photos && data.photos.length > 0) {
      setPhotoPreviews(data.photos);
      // Note: We'll use the URLs directly from checklist
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Use photos from checklist or upload new ones
      let photoUrls = [];
      if (checklistData && checklistData.photos && checklistData.photos.length > 0) {
        photoUrls = checklistData.photos;
      } else if (photoFiles.length > 0) {
        const propertyId = `temp_${Date.now()}`;
        photoUrls = await uploadMultipleFiles(
          photoFiles,
          `properties/${propertyId}/photos`
        );
      }

      // Prepare property data
      const propertyData = {
        ...formData,
        price: parseFloat(formData.price),
        squareFeet: formData.squareFeet ? parseFloat(formData.squareFeet) : null,
        lotSize: formData.lotSize ? parseFloat(formData.lotSize) : null,
        yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : null,
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseFloat(formData.bathrooms),
        hoaFee: formData.hoaFee ? parseFloat(formData.hoaFee) : null,
        propertyTax: formData.propertyTax ? parseFloat(formData.propertyTax) : null,
        photos: photoUrls,
        sellerId: user?.uid || '',
        sellerName: userProfile?.name || user?.displayName || '',
        sellerEmail: user?.email || '',
      };

      // Create property in Firestore
      const propertyId = await createProperty(propertyData);
      setSuccess(true);
      console.log('Property created with ID:', propertyId);
    } catch (err) {
      setError('Failed to create property listing. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="list-property-page">
        <div className="loading-state">Loading...</div>
      </div>
    );
  }

  // Show message if not authenticated (will redirect)
  if (!isAuthenticated) {
    return (
      <div className="list-property-page">
        <div className="loading-state">Redirecting to sign up...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="list-property-page">
        <div className="success-message">
          <h2>Property Listed Successfully!</h2>
          <p>Your property has been added to the marketplace.</p>
          <button onClick={() => navigate('/browse')} className="btn btn-primary btn-large">
            View All Properties
          </button>
        </div>
      </div>
    );
  }

  if (showQuickModal) {
    return (
      <ListPropertyModal
        onContinue={handleQuickModalContinue}
        onCancel={handleQuickModalCancel}
      />
    );
  }

  if (showChecklist) {
    return (
      <div className="list-property-page">
        <div className="list-property-container">
          <PreListingChecklist onComplete={handleChecklistComplete} />
        </div>
      </div>
    );
  }

  return (
    <div className="list-property-page">
      <div className="list-property-container">
        <h1>List Your Property</h1>
        <div className="step-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Basic Info</div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Details</div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Photos & Description</div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="form-step">
              <h2>Basic Information</h2>
              {saleProfile && (
                <p className="form-note form-note--sale-profile">
                  We've filled in your address and target price from your sale profile. Please select the property type to continue.
                </p>
              )}
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Street Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>State *</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    maxLength="2"
                    placeholder="CA"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Zip Code *</label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Property Type *</label>
                  <select
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Type</option>
                    {propertyTypes.map((type) => (
                      <option key={type} value={type.toLowerCase().replace(' ', '-')}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Asking Price ($) *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="1000"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <h2>Property Details</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Bedrooms *</label>
                  <input
                    type="number"
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Bathrooms *</label>
                  <input
                    type="number"
                    name="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleInputChange}
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
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Lot Size (sq ft)</label>
                  <input
                    type="number"
                    name="lotSize"
                    value={formData.lotSize}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Year Built</label>
                  <input
                    type="number"
                    name="yearBuilt"
                    value={formData.yearBuilt}
                    onChange={handleInputChange}
                    min="1800"
                    max={new Date().getFullYear()}
                  />
                </div>

                <div className="form-group">
                  <label>HOA Fee ($/month)</label>
                  <input
                    type="number"
                    name="hoaFee"
                    value={formData.hoaFee}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Property Tax ($/year)</label>
                  <input
                    type="number"
                    name="propertyTax"
                    value={formData.propertyTax}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Features</label>
                <div className="features-grid">
                  {commonFeatures.map((feature) => (
                    <label key={feature} className="feature-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.features.includes(feature)}
                        onChange={() => handleFeatureToggle(feature)}
                      />
                      <span>{feature}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-step">
              <h2>Photos & Description</h2>

              <div className="form-group">
                <label>Property Photos</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                />
                {photoPreviews.length > 0 && (
                  <div className="photo-previews">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="photo-preview">
                        <img src={preview} alt={`Preview ${index + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Property Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="8"
                  placeholder="Describe your property, its features, neighborhood, and what makes it special..."
                />
              </div>
            </div>
          )}

          <div className="form-actions">
            {step > 1 && (
              <button type="button" onClick={handleBack} className="btn-secondary">
                Back
              </button>
            )}
            {step < 3 ? (
              <button type="button" onClick={handleNext} className="btn-primary">
                Next
              </button>
            ) : (
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Creating Listing...' : 'Create Listing'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ListProperty;
