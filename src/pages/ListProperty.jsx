import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createProperty } from '../services/propertyService';
import { uploadFile, uploadMultipleFiles } from '../services/storageService';
import AddressAutocomplete from '../components/AddressAutocomplete';
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
  const [step, setStep] = useState(1);
  const [step4UnlockAt, setStep4UnlockAt] = useState(0);
  const [documentFiles, setDocumentFiles] = useState({
    deed: null,
    propertyTaxRecord: null,
    hoaDocs: null,
    disclosureForms: null,
    inspectionReport: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // Redirect to sign up if not authenticated
      navigate('/sign-up?redirect=/list-property');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Unlock "Create Listing" after a short delay to avoid double-click on "Next" submitting before photos
  useEffect(() => {
    if (step !== 4 || step4UnlockAt <= 0) return;
    const ms = Math.max(0, step4UnlockAt - Date.now());
    const t = setTimeout(() => setStep4UnlockAt(0), ms);
    return () => clearTimeout(t);
  }, [step, step4UnlockAt]);

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
    const claim = location.state?.claimAddress != null && String(location.state.claimAddress).trim() !== '';
    if (claim) {
      const lat = location.state.claimLat;
      const lng = location.state.claimLng;
      const hasCoords = typeof lat === 'number' && !Number.isNaN(lat) && typeof lng === 'number' && !Number.isNaN(lng);
      const claimData = {
        ...base,
        address: String(location.state.claimAddress).trim(),
        ...(hasCoords && { latitude: lat, longitude: lng }),
      };
      const n = (v) => (v != null && Number.isFinite(Number(v)) ? String(Number(v)) : undefined);
      if (location.state.claimBeds != null) { const s = n(location.state.claimBeds); if (s) claimData.bedrooms = s; }
      if (location.state.claimBaths != null) { const s = n(location.state.claimBaths); if (s) claimData.bathrooms = s; }
      if (location.state.claimSquareFeet != null) { const s = n(location.state.claimSquareFeet); if (s) claimData.squareFeet = s; }
      if (location.state.claimEstimate != null) { const s = n(location.state.claimEstimate); if (s) claimData.price = s; }
      return claimData;
    }
    return base;
  });

  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [addressInputValue, setAddressInputValue] = useState(() => String(location.state?.claimAddress ?? '').trim());

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
      // Require address + (city|state|zip) from autocomplete, OR address + lat/lng (e.g. from Claim property)
      const hasAddress = !!formData.address?.trim();
      const hasCityStateZip = !!formData.city?.trim() || !!formData.state?.trim() || !!formData.zipCode?.trim();
      const hasCoords = typeof formData.latitude === 'number' && !Number.isNaN(formData.latitude) && typeof formData.longitude === 'number' && !Number.isNaN(formData.longitude);
      return hasAddress && (hasCityStateZip || hasCoords);
    }
    if (stepNum === 2) return formData.propertyType && formData.bedrooms && formData.bathrooms;
    if (stepNum === 3) return !!formData.price?.trim();
    if (stepNum === 4) return true; // photos optional
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      const next = step + 1;
      setStep(next);
      setError(null);
      if (next === 4) setStep4UnlockAt(Date.now() + 500);
    } else {
      setError('Please fill in all required fields.');
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setError(null);
  };

  const handleDocumentFileChange = (field, file) => {
    setDocumentFiles((prev) => ({ ...prev, [field]: file || null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 4) { handleNext(); return; }
    setLoading(true);
    setError(null);

    try {
      const uploadPrefix = `temp_${Date.now()}`;
      const photoUrls = photoFiles.length > 0
        ? await uploadMultipleFiles(photoFiles, `properties/${uploadPrefix}/photos`)
        : [];

      const docUrls = {};
      for (const [field, file] of Object.entries(documentFiles)) {
        if (file) {
          const ext = file.name.split('.').pop() || 'pdf';
          const url = await uploadFile(file, `properties/${uploadPrefix}/docs/${field}_${Date.now()}.${ext}`);
          docUrls[`${field}Url`] = url;
        }
      }

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
        ...docUrls,
        sellerId: user?.uid || '',
        sellerName: userProfile?.name || user?.displayName || '',
        sellerEmail: user?.email || '',
        acceptingCommunications: true,
      };
      if (typeof formData.latitude === 'number' && !Number.isNaN(formData.latitude) && typeof formData.longitude === 'number' && !Number.isNaN(formData.longitude)) {
        propertyData.latitude = formData.latitude;
        propertyData.longitude = formData.longitude;
      } else {
        delete propertyData.latitude;
        delete propertyData.longitude;
      }

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

  return (
    <div className="list-property-page">
      <div className="list-property-container">
        <h1>List Your Property</h1>
        <p className="list-property-disclaimer">
          This is just an initial workflow to create a verified listing. Additional workflow steps will be taken later on.
        </p>
        <div className="step-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Address</div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2. About the Home</div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Initial Pricing Info</div>
          <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Photos & Documents</div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="form-step">
              <h2>Address</h2>
              {saleProfile ? (
                <>
                  <p className="form-note form-note--sale-profile">
                    Prefilled from a previous step.
                  </p>
                  <div className="form-group">
                    <label>Address</label>
                    <p className="read-only-address">
                      {[formData.address, formData.city, formData.state, formData.zipCode].filter(Boolean).join(', ') || '—'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label>Address *</label>
                  {location.state?.claimAddress && (
                    <p className="form-note form-note--claim">Address prefilled from claimed property.</p>
                  )}
                  <AddressAutocomplete
                    name="address"
                    value={addressInputValue}
                    onAddressChange={(v) => {
                      setAddressInputValue(v);
                      if (!v.trim()) setFormData((prev) => ({ ...prev, address: '', city: '', state: '', zipCode: '', latitude: undefined, longitude: undefined }));
                    }}
                    onAddressSelect={(obj) => {
                      setFormData((prev) => ({ ...prev, ...obj }));
                      setAddressInputValue([obj.address, obj.city, obj.state, obj.zipCode].filter(Boolean).join(', '));
                    }}
                    placeholder="Select an address from the list (start typing to search)"
                    required
                  />
                  {formData.address && (formData.city || formData.zipCode) && (
                    <p className="form-hint">✓ Address verified from selection</p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <h2>About the home</h2>
              <p className="form-note">Beds, baths, size, and features.</p>
              <div className="form-grid">
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
              <h2>Initial Pricing Info</h2>
              <p className="form-note">Set your asking price. You can update it later.</p>
              <div className="form-group" style={{ maxWidth: 320 }}>
                <label>Asking Price ($) *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                  step="1000"
                  placeholder="e.g. 450000"
                  required
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="form-step">
              <h2>Photos and additional documents</h2>
              <p className="form-note">Photos, description, and documents (deed, disclosures, etc.).</p>

              <div className="form-group">
                <label>Property Photos (optional)</label>
                <p className="form-note">You can add photos now or later. 5+ recommended when you have them.</p>
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
                  rows="5"
                  placeholder="Describe your property, neighborhood, and what makes it special..."
                />
              </div>

              <div className="form-group" style={{ marginTop: 24 }}>
                <label>Documents</label>
                <p className="form-note">Upload deed, tax records, disclosures, and inspection if you have them.</p>
                <div className="document-uploads">
                  <div className="doc-row">
                    <label className="doc-label">Deed</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleDocumentFileChange('deed', e.target.files?.[0] || null)} />
                    {documentFiles.deed && <span className="doc-filename">✓ {documentFiles.deed.name}</span>}
                  </div>
                  <div className="doc-row">
                    <label className="doc-label">Property tax record</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleDocumentFileChange('propertyTaxRecord', e.target.files?.[0] || null)} />
                    {documentFiles.propertyTaxRecord && <span className="doc-filename">✓ {documentFiles.propertyTaxRecord.name}</span>}
                  </div>
                  <div className="doc-row">
                    <label className="doc-label">HOA documents (if applicable)</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleDocumentFileChange('hoaDocs', e.target.files?.[0] || null)} />
                    {documentFiles.hoaDocs && <span className="doc-filename">✓ {documentFiles.hoaDocs.name}</span>}
                  </div>
                  <div className="doc-row">
                    <label className="doc-label">Disclosure forms</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleDocumentFileChange('disclosureForms', e.target.files?.[0] || null)} />
                    {documentFiles.disclosureForms && <span className="doc-filename">✓ {documentFiles.disclosureForms.name}</span>}
                  </div>
                  <div className="doc-row">
                    <label className="doc-label">Inspection report</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleDocumentFileChange('inspectionReport', e.target.files?.[0] || null)} />
                    {documentFiles.inspectionReport && <span className="doc-filename">✓ {documentFiles.inspectionReport.name}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="form-actions">
            {step > 1 && (
              <button type="button" onClick={handleBack} className="btn-secondary">
                Back
              </button>
            )}
            {step < 4 ? (
              <button type="button" onClick={handleNext} className="btn-primary">
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || (step4UnlockAt > 0 && Date.now() < step4UnlockAt)}
                className="btn-primary"
              >
                {loading ? 'Creating Listing...' : (step4UnlockAt > 0 && Date.now() < step4UnlockAt) ? 'One moment...' : 'Create Listing'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ListProperty;
