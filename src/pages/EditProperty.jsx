import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPropertyById, updateProperty } from '../services/propertyService';
import { uploadFile, uploadMultipleFiles } from '../services/storageService';
import { getListingTier } from '../utils/verificationScores';
import AddressAutocomplete from '../components/AddressAutocomplete';
import DragDropFileInput from '../components/DragDropFileInput';
import './ListProperty.css';
import './EditProperty.css';

const propertyTypes = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land'];
const commonFeatures = [
  'Garage', 'Fireplace', 'Pool', 'Garden', 'Hardwood Floors', 'Updated Kitchen', 'Updated Bathroom',
  'Central Air', 'Central Heat', 'Washer/Dryer', 'Dishwasher', 'Garbage Disposal',
];

const EditProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(null);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([]);
  const [addressInputValue, setAddressInputValue] = useState('');
  const [documentFiles, setDocumentFiles] = useState({
    deed: null, propertyTaxRecord: null, hoaDocs: null, disclosureForms: null, inspectionReport: null,
  });
  const [existingDocUrls, setExistingDocUrls] = useState({});
  const [currentTier, setCurrentTier] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratingTier, setCelebratingTier] = useState(null);
  const [step, setStep] = useState(1); // For multi-step form when advancing tiers
  const [hasHOA, setHasHOA] = useState('');
  const [hasInsurance, setHasInsurance] = useState('');
  const [insuranceApproximation, setInsuranceApproximation] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/sign-in?redirect=' + encodeURIComponent(`/property/${id}/edit`));
    }
  }, [isAuthenticated, authLoading, navigate, id]);

  useEffect(() => {
    if (isAuthenticated && user && id) loadProperty();
  }, [isAuthenticated, user, id]);

  const loadProperty = async () => {
    try {
      setLoading(true);
      setError(null);
      const p = await getPropertyById(id);
      if (!p) {
        setError('Property not found.');
        setLoading(false);
        return;
      }
      if (p.sellerId !== user?.uid) {
        setError('You can only edit your own listings.');
        setLoading(false);
        return;
      }
      if (p.archived) {
        navigate(`/property/${id}`);
        setLoading(false);
        return;
      }
      setFormData({
        address: p.address || '',
        city: p.city || '',
        state: p.state || '',
        zipCode: p.zipCode || '',
        latitude: p.latitude,
        longitude: p.longitude,
        propertyType: p.propertyType || '',
        price: p.price != null ? String(p.price) : '',
        estimatedWorth: p.estimatedWorth != null ? String(p.estimatedWorth) : '',
        makeMeMovePrice: p.makeMeMovePrice != null ? String(p.makeMeMovePrice) : '',
        squareFeet: p.squareFeet != null ? String(p.squareFeet) : '',
        lotSize: p.lotSize != null ? String(p.lotSize) : '',
        yearBuilt: p.yearBuilt != null ? String(p.yearBuilt) : '',
        bedrooms: p.bedrooms != null ? String(p.bedrooms) : '',
        bathrooms: p.bathrooms != null ? String(p.bathrooms) : '',
        features: Array.isArray(p.features) ? p.features : [],
        hoaFee: p.hoaFee != null ? String(p.hoaFee) : '',
        propertyTax: p.propertyTax != null ? String(p.propertyTax) : '',
        description: p.description || '',
        acceptingCommunications: p.acceptingCommunications !== false,
      });
      // Set HOA and Insurance toggles
      if (p.hasHOA === true) setHasHOA('yes');
      else if (p.hasHOA === false) setHasHOA('no');
      if (p.hasInsurance === true) setHasInsurance('yes');
      else if (p.hasInsurance === false) setHasInsurance('no');
      setInsuranceApproximation(p.insuranceApproximation != null ? String(p.insuranceApproximation) : '');
      setAddressInputValue([p.address, p.city, p.state, p.zipCode].filter(Boolean).join(', '));
      setExistingPhotos(Array.isArray(p.photos) ? [...p.photos] : []);
      setExistingDocUrls({
        deedUrl: p.deedUrl || '',
        propertyTaxRecordUrl: p.propertyTaxRecordUrl || '',
        hoaDocsUrl: p.hoaDocsUrl || '',
        disclosureFormsUrl: p.disclosureFormsUrl || '',
        inspectionReportUrl: p.inspectionReportUrl || '',
      });
      // Determine current tier
      const tier = getListingTier(p);
      setCurrentTier(tier);
      
      // If advancing from Basic tier, start at step 1
      if (tier === 'basic') {
        setStep(1);
      }
    } catch (err) {
      console.error('Error loading property:', err);
      setError('Property not found or failed to load. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleFeatureToggle = (feature) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        features: prev.features.includes(feature)
          ? prev.features.filter((f) => f !== feature)
          : [...prev.features, feature],
      };
    });
  };

  const handleNewPhotoChange = (e) => {
    const files = Array.from(e.target.files || []);
    setNewPhotoFiles(files);
    setNewPhotoPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const handleNewPhotoFiles = (files) => {
    const list = Array.isArray(files) ? files : (files ? [files] : []);
    setNewPhotoFiles(list);
    setNewPhotoPreviews(list.map((f) => URL.createObjectURL(f)));
  };

  const removeExistingPhoto = (index) => {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocumentFileChange = (field, file) => {
    setDocumentFiles((prev) => ({ ...prev, [field]: file || null }));
  };

  const handleNext = () => {
    if (step === 1) {
      // Validate step 1
      if (!formData.address?.trim() || !(formData.city?.trim() || formData.state?.trim() || formData.zipCode?.trim())) {
        setError('Please select an address from the list.');
        return;
      }
      if (!formData.propertyType || !formData.bedrooms || !formData.bathrooms) {
        setError('Please fill in all required fields (Property Type, Bedrooms, Bathrooms).');
        return;
      }
      if (!formData.squareFeet || parseFloat(formData.squareFeet) <= 0) {
        setError('Please enter square feet.');
        return;
      }
      if (!formData.lotSize || parseFloat(formData.lotSize) <= 0) {
        setError('Please enter lot size.');
        return;
      }
      if (!formData.yearBuilt || parseInt(formData.yearBuilt, 10) <= 0) {
        setError('Please enter year built.');
        return;
      }
      if (!formData.propertyTax || parseFloat(formData.propertyTax) < 0) {
        setError('Please enter property tax.');
        return;
      }
      if (hasHOA !== 'yes' && hasHOA !== 'no') {
        setError('Please select HOA yes/no.');
        return;
      }
      if (hasHOA === 'yes' && (!formData.hoaFee || parseFloat(formData.hoaFee) <= 0)) {
        setError('Please enter HOA fee amount.');
        return;
      }
      if (hasInsurance !== 'yes' && hasInsurance !== 'no') {
        setError('Please select insurance yes/no.');
        return;
      }
      if (hasInsurance === 'yes' && (!insuranceApproximation || parseFloat(insuranceApproximation) <= 0)) {
        setError('Please enter insurance approximation amount.');
        return;
      }
      setError(null);
      setStep(2);
    } else if (step === 2) {
      // Validate step 2
      if (!formData.estimatedWorth || parseFloat(formData.estimatedWorth) <= 0) {
        setError('Please enter estimated property worth.');
        return;
      }
      if (!formData.makeMeMovePrice || parseFloat(formData.makeMeMovePrice) <= 0) {
        setError('Please enter make me move price.');
        return;
      }
      setError(null);
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData) return;
    
    // Determine if coming from tier advancement
    const isBasicToComplete = currentTier === 'basic';
    const isCompleteToVerified = currentTier === 'complete';
    
    // If Basic → Complete multi-step form and not on final step, handle next
    if (isBasicToComplete && step < 3) {
      handleNext();
      return;
    }
    if (isCompleteToVerified) {
      const descLen = (formData.description || '').trim().length;
      const totalPhotos = existingPhotos.length + newPhotoPreviews.length;
      if (descLen < 200) {
        setError('Please add a detailed description (200+ characters).');
        return;
      }
      if (totalPhotos < 5) {
        setError('Please upload at least 5 photos.');
        return;
      }
    }
    
    setSaving(true);
    setError(null);
    try {
      let newUrls = [];
      if (newPhotoFiles.length > 0) {
        newUrls = await uploadMultipleFiles(newPhotoFiles, `properties/${id}/photos`);
      }
      const photos = [...existingPhotos, ...newUrls];

      const docUrlKeys = ['deed', 'propertyTaxRecord', 'hoaDocs', 'disclosureForms', 'inspectionReport'];
      const docUrls = {};
      for (const key of docUrlKeys) {
        const file = documentFiles[key];
        const existingKey = `${key}Url`;
        if (file) {
          const ext = file.name.split('.').pop() || 'pdf';
          docUrls[existingKey] = await uploadFile(file, `properties/${id}/docs/${key}_${Date.now()}.${ext}`);
        } else if (existingDocUrls[existingKey]) {
          docUrls[existingKey] = existingDocUrls[existingKey];
        }
      }

      const updates = {
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        propertyType: formData.propertyType,
        price: formData.price ? parseFloat(formData.price) : (formData.estimatedWorth ? parseFloat(formData.estimatedWorth) : null),
        estimatedWorth: formData.estimatedWorth ? parseFloat(formData.estimatedWorth) : null,
        makeMeMovePrice: formData.makeMeMovePrice ? parseFloat(formData.makeMeMovePrice) : null,
        squareFeet: formData.squareFeet ? parseFloat(formData.squareFeet) : null,
        lotSize: formData.lotSize ? parseFloat(formData.lotSize) : null,
        yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : null,
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseFloat(formData.bathrooms),
        features: formData.features || [],
        hasHOA: hasHOA === 'yes',
        hoaFee: hasHOA === 'yes' && formData.hoaFee ? parseFloat(formData.hoaFee) : null,
        hasInsurance: hasInsurance === 'yes',
        insuranceApproximation: hasInsurance === 'yes' && insuranceApproximation ? parseFloat(insuranceApproximation) : null,
        propertyTax: formData.propertyTax ? parseFloat(formData.propertyTax) : null,
        photos,
        ...docUrls,
        acceptingCommunications: !!formData.acceptingCommunications,
      };
      if (typeof formData.latitude === 'number' && !Number.isNaN(formData.latitude) && typeof formData.longitude === 'number' && !Number.isNaN(formData.longitude)) {
        updates.latitude = formData.latitude;
        updates.longitude = formData.longitude;
      }
      await updateProperty(id, updates);
      
      // Check if property advanced to next tier
      const updatedProperty = await getPropertyById(id);
      const newTier = getListingTier(updatedProperty);
      
      // Show celebration if tier advanced
      if (currentTier === 'basic' && newTier === 'complete') {
        setCelebratingTier('Complete');
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          navigate(`/property/${id}`);
        }, 2500);
      } else if (currentTier === 'complete' && newTier === 'verified') {
        setCelebratingTier('Verified');
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          navigate(`/property/${id}`);
        }, 2500);
      } else {
        navigate(`/property/${id}`);
      }
    } catch (err) {
      setError('Failed to update. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <div className="list-property-page"><div className="loading-state">Loading...</div></div>;
  }
  if (!isAuthenticated) return null;
  if (error && !formData) {
    return (
      <div className="list-property-page">
        <div className="list-property-container">
          <p className="error-message">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">Back to Dashboard</button>
        </div>
      </div>
    );
  }
  if (!formData) return null;

  // Determine if coming from tier advancement
  // Basic → Complete: needs property info (multi-step form)
  // Complete → Verified: needs ONLY description + 5+ photos
  const isBasicToComplete = currentTier === 'basic';
  const isCompleteToVerified = currentTier === 'complete';
  const isTierAdvancement = isBasicToComplete || isCompleteToVerified;
  const advancementMessage = isBasicToComplete 
    ? 'Complete items below to advance to Complete tier'
    : (isCompleteToVerified
    ? 'Complete the additional items below to advance to Verified tier'
    : null);

  return (
    <div className="list-property-page">
      {showCelebration && (
        <div className="celebration-overlay">
          <div className="celebration-container">
            <div className="celebration-checks">
              {[
                { x: '80px', y: '0' },
                { x: '69px', y: '40px' },
                { x: '40px', y: '69px' },
                { x: '0', y: '80px' },
                { x: '-40px', y: '69px' },
                { x: '-69px', y: '40px' },
                { x: '-80px', y: '0' },
                { x: '-69px', y: '-40px' },
                { x: '-40px', y: '-69px' },
                { x: '0', y: '-80px' },
                { x: '40px', y: '-69px' },
                { x: '69px', y: '-40px' },
              ].map((pos, i) => (
                <span key={i} className="celebration-check" style={{
                  '--delay': `${i * 0.1}s`,
                  '--final-x': `calc(-50% + ${pos.x})`,
                  '--final-y': `calc(-50% + ${pos.y})`,
                }}>✓</span>
              ))}
            </div>
            <h2 className="celebration-title">Congratulations!</h2>
            <p className="celebration-message">Your property is now {celebratingTier} tier!</p>
          </div>
        </div>
      )}
      <div className="list-property-container edit-property-single">
        <h1>{isTierAdvancement ? 'Advance Property Tier' : 'Edit Property'}</h1>
        <p className="form-note">{advancementMessage || 'Update your listing. All sections from List Property are below.'}</p>
        {isBasicToComplete && (
          <div className="step-indicator" style={{ marginBottom: '2rem' }}>
            <div className={`step-indicator-step ${step >= 1 ? 'active' : ''}`}>1. Property Info</div>
            <div className={`step-indicator-step ${step >= 2 ? 'active' : ''}`}>2. Pricing</div>
            <div className={`step-indicator-step ${step >= 3 ? 'active' : ''}`}>3. Photos</div>
          </div>
        )}
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          {/* Basic → Complete: Multi-step form with property info, pricing, photos */}
          {/* Complete → Verified: Only show description + 5+ photos */}
          {/* Step 1: Address + Property Info (only for Basic → Complete step 1, or always if not tier advancement) */}
          {((isBasicToComplete && step === 1) || (!isTierAdvancement)) && (
            <>
              {/* Address */}
              <div className="form-step">
                <h2>Address</h2>
                <div className="form-group">
                  <label>Address *</label>
                  <AddressAutocomplete
                    name="address"
                    value={addressInputValue}
                    onAddressChange={(v) => {
                      setAddressInputValue(v);
                      if (!v.trim()) setFormData((prev) => (prev ? { ...prev, address: '', city: '', state: '', zipCode: '', latitude: undefined, longitude: undefined } : prev));
                    }}
                    onAddressSelect={(obj) => {
                      setFormData((prev) => (prev ? { ...prev, ...obj } : prev));
                      setAddressInputValue([obj.address, obj.city, obj.state, obj.zipCode].filter(Boolean).join(', '));
                    }}
                    placeholder="Select an address from the list (start typing to search)"
                    required
                  />
                  {formData.address && (formData.city || formData.zipCode) && (
                    <p className="form-hint">✓ Address verified from selection</p>
                  )}
                </div>
              </div>

              {/* About the home */}
              <div className="form-step">
                <h2>About the home</h2>
                <p className="form-note">Beds, baths, size, and features.</p>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Property Type *</label>
                    <select name="propertyType" value={formData.propertyType} onChange={handleInputChange} required>
                      <option value="">Select Type</option>
                      {propertyTypes.map((t) => <option key={t} value={t.toLowerCase().replace(' ', '-')}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Bedrooms *</label>
                    <input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleInputChange} min="0" required />
                  </div>
                  <div className="form-group">
                    <label>Bathrooms *</label>
                    <input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleInputChange} min="0" step="0.5" required />
                  </div>
                  <div className="form-group">
                    <label>Square Feet</label>
                    <input type="number" name="squareFeet" value={formData.squareFeet} onChange={handleInputChange} min="0" />
                  </div>
                  <div className="form-group">
                    <label>Lot Size (sq ft)</label>
                    <input type="number" name="lotSize" value={formData.lotSize} onChange={handleInputChange} min="0" />
                  </div>
                  <div className="form-group">
                    <label>Year Built</label>
                    <input type="number" name="yearBuilt" value={formData.yearBuilt} onChange={handleInputChange} min="1800" max={new Date().getFullYear()} />
                  </div>
                  <div className="form-group">
                    <label>Property Tax ($/year)</label>
                    <input type="number" name="propertyTax" value={formData.propertyTax} onChange={handleInputChange} min="0" />
                  </div>
                </div>
                
                {/* HOA Toggle */}
                <div className="form-group">
                  <label>HOA? *</label>
                  <select value={hasHOA} onChange={(e) => setHasHOA(e.target.value)} required>
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {hasHOA === 'yes' && (
                  <div className="form-group">
                    <label>HOA Fee ($/month) *</label>
                    <input type="number" name="hoaFee" value={formData.hoaFee} onChange={handleInputChange} min="0" step="1" placeholder="e.g. 150" required />
                  </div>
                )}
                
                {/* Insurance Toggle */}
                <div className="form-group">
                  <label>Insurance? *</label>
                  <select value={hasInsurance} onChange={(e) => setHasInsurance(e.target.value)} required>
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {hasInsurance === 'yes' && (
                  <div className="form-group">
                    <label>Approximate Insurance Amount ($/year) *</label>
                    <input type="number" value={insuranceApproximation} onChange={(e) => setInsuranceApproximation(e.target.value)} min="0" step="100" placeholder="e.g. 1800" required />
                  </div>
                )}
                
                <div className="form-group">
                  <label>Features</label>
                  <div className="features-grid">
                    {commonFeatures.map((f) => (
                      <label key={f} className="feature-checkbox">
                        <input type="checkbox" checked={formData.features.includes(f)} onChange={() => handleFeatureToggle(f)} />
                        <span>{f}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Initial Pricing Info (only for Basic → Complete step 2, or always if not tier advancement) */}
          {((isBasicToComplete && step === 2) || !isTierAdvancement) && (
            <div className="form-step">
              <h2>Initial Pricing</h2>
              <p className="form-note">What do you think your property is worth? (Just a guess, we will refine this later)</p>
              <div className="form-group" style={{ maxWidth: 400 }}>
                <label>Estimated Property Worth ($) *</label>
                <input type="number" name="estimatedWorth" value={formData.estimatedWorth} onChange={handleInputChange} min="0" step="1000" placeholder="e.g. 450000" required />
              </div>
              <div className="form-group" style={{ maxWidth: 400 }}>
                <label>Make Me Move Price ($) *</label>
                <p className="form-hint">If I got this, I would pack my bags tomorrow.</p>
                <input type="number" name="makeMeMovePrice" value={formData.makeMeMovePrice} onChange={handleInputChange} min="0" step="1000" placeholder="e.g. 500000" required />
              </div>
              {!isTierAdvancement && (
                <div className="form-group" style={{ maxWidth: 400 }}>
                  <label>Asking Price ($) *</label>
                  <input type="number" name="price" value={formData.price} onChange={handleInputChange} min="0" step="1000" placeholder="e.g. 450000" required />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Photos (only for Basic → Complete step 3, or always if not tier advancement) */}
          {((isBasicToComplete && step === 3) || (!isTierAdvancement)) && (
            <div className="form-step">
              <h2>Property Photos</h2>
              <p className="form-note">Upload photos of your property. At least 1 photo is required.</p>

              <div className="form-group">
                <label>Existing photos</label>
                {existingPhotos.length > 0 ? (
                  <div className="photo-previews">
                    {existingPhotos.map((url, i) => (
                      <div key={`ex-${i}`} className="photo-preview">
                        <img src={url} alt={`Photo ${i + 1}`} />
                        {!isTierAdvancement && (
                          <button type="button" className="photo-remove" onClick={() => removeExistingPhoto(i)} aria-label="Remove">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : <p className="form-hint">No photos yet. Add new photos below.</p>}
              </div>

              <div className="form-group">
                <label>Property Photos *</label>
                <p className="form-hint">Upload at least 1 photo to advance to Complete tier.</p>
                <DragDropFileInput multiple accept="image/*" onChange={(files) => handleNewPhotoFiles(files || [])} placeholder="Drop photos here or click to browse" />
                {newPhotoPreviews.length > 0 && (
                  <div className="photo-previews">
                    {newPhotoPreviews.map((url, i) => (
                      <div key={`new-${i}`} className="photo-preview"><img src={url} alt={`New ${i + 1}`} /></div>
                    ))}
                  </div>
                )}
                <p className="form-hint">Total photos: {(existingPhotos.length + newPhotoPreviews.length)}</p>
              </div>
            </div>
          )}

          {/* Complete → Verified: Description + 5+ photos */}
          {isCompleteToVerified && (
            <div className="form-step">
              <h2>Property Description</h2>
              <p className="form-note">Add a detailed description (200+ characters) and at least 5 photos to reach Verified.</p>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  rows={6}
                  placeholder="Describe your property in detail..."
                  required
                  minLength={200}
                />
                <p className="form-hint">
                  {(formData.description || '').length} / 200 characters minimum
                  {(formData.description || '').length >= 200 && ' ✓'}
                </p>
              </div>
              <div className="form-group">
                <label>Photos *</label>
                <p className="form-hint">Upload at least 5 photos total for Verified tier.</p>
                {existingPhotos.length > 0 ? (
                  <div className="photo-previews">
                    {existingPhotos.map((url, i) => (
                      <div key={`ex-${i}`} className="photo-preview">
                        <img src={url} alt={`Photo ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                ) : <p className="form-hint">No photos yet. Add photos below.</p>}
                <DragDropFileInput multiple accept="image/*" onChange={(files) => handleNewPhotoFiles(files || [])} placeholder="Drop photos here or click to browse" />
                {newPhotoPreviews.length > 0 && (
                  <div className="photo-previews">
                    {newPhotoPreviews.map((url, i) => (
                      <div key={`new-${i}`} className="photo-preview"><img src={url} alt={`New ${i + 1}`} /></div>
                    ))}
                  </div>
                )}
                <p className="form-hint">
                  Total photos: {(existingPhotos.length + newPhotoPreviews.length)} / 5 minimum
                  {(existingPhotos.length + newPhotoPreviews.length) >= 5 && ' ✓'}
                </p>
              </div>
            </div>
          )}

          {/* Additional sections for non-tier-advancement editing */}
          {!isTierAdvancement && (
            <>
              <div className="form-group">
                <div className="toggle-row">
                  <label className="toggle-row__label">Accepting communications from buyers</label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={!!formData.acceptingCommunications}
                      onChange={(e) => setFormData((prev) => prev ? { ...prev, acceptingCommunications: e.target.checked } : prev)}
                      aria-label="Accepting communications from buyers"
                    />
                    <span className="toggle-switch__track" aria-hidden />
                  </label>
                </div>
                <p className="form-hint">When off, buyers will see that you are not accepting offers or inquiries at this time.</p>
              </div>

            {/* Documents section - only show for Verified tier and above */}
            {(currentTier === 'verified' || currentTier === 'enhanced' || currentTier === 'premium' || currentTier === 'elite') && (
              <div className="form-group" style={{ marginTop: 24 }}>
                <label>Documents</label>
                <p className="form-note">
                  {currentTier === 'verified' 
                    ? 'Upload documents to advance to Enhanced tier: deed, tax records, and HOA docs (if applicable).'
                    : 'Upload additional documents: disclosures and inspection reports help advance to higher tiers.'}
                </p>
                <div className="document-uploads">
                  <div className="doc-row">
                    <label className="doc-label">Deed</label>
                    <DragDropFileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(f) => handleDocumentFileChange('deed', f || null)} placeholder="Drop or click" className="doc-drag-drop" />
                    {existingDocUrls.deedUrl && <span className="doc-filename">✓ Current file attached</span>}
                    {documentFiles.deed && <span className="doc-filename">✓ {documentFiles.deed.name} (new)</span>}
                  </div>
                  <div className="doc-row">
                    <label className="doc-label">Property tax record</label>
                    <DragDropFileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(f) => handleDocumentFileChange('propertyTaxRecord', f || null)} placeholder="Drop or click" className="doc-drag-drop" />
                    {existingDocUrls.propertyTaxRecordUrl && <span className="doc-filename">✓ Current file attached</span>}
                    {documentFiles.propertyTaxRecord && <span className="doc-filename">✓ {documentFiles.propertyTaxRecord.name} (new)</span>}
                  </div>
                  <div className="doc-row">
                    <label className="doc-label">HOA documents (if applicable)</label>
                    <DragDropFileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(f) => handleDocumentFileChange('hoaDocs', f || null)} placeholder="Drop or click" className="doc-drag-drop" />
                    {existingDocUrls.hoaDocsUrl && <span className="doc-filename">✓ Current file attached</span>}
                    {documentFiles.hoaDocs && <span className="doc-filename">✓ {documentFiles.hoaDocs.name} (new)</span>}
                  </div>
                  {(currentTier === 'enhanced' || currentTier === 'premium' || currentTier === 'elite') && (
                    <>
                      <div className="doc-row">
                        <label className="doc-label">Disclosure forms</label>
                        <DragDropFileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(f) => handleDocumentFileChange('disclosureForms', f || null)} placeholder="Drop or click" className="doc-drag-drop" />
                        {existingDocUrls.disclosureFormsUrl && <span className="doc-filename">✓ Current file attached</span>}
                        {documentFiles.disclosureForms && <span className="doc-filename">✓ {documentFiles.disclosureForms.name} (new)</span>}
                      </div>
                      <div className="doc-row">
                        <label className="doc-label">Inspection report</label>
                        <DragDropFileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(f) => handleDocumentFileChange('inspectionReport', f || null)} placeholder="Drop or click" className="doc-drag-drop" />
                        {existingDocUrls.inspectionReportUrl && <span className="doc-filename">✓ Current file attached</span>}
                        {documentFiles.inspectionReport && <span className="doc-filename">✓ {documentFiles.inspectionReport.name} (new)</span>}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            </>
          )}

          <div className="form-actions">
            {isBasicToComplete ? (
              <>
                {step > 1 && (
                  <button type="button" onClick={handleBack} className="btn-secondary">Back</button>
                )}
                {step < 3 ? (
                  <button type="button" onClick={handleNext} className="btn-primary">Next</button>
                ) : (
                  <button 
                    type="submit" 
                    disabled={saving || (existingPhotos.length + newPhotoPreviews.length) < 1} 
                    className="btn-primary"
                  >
                    {saving ? 'Saving...' : 'Complete information to get to Complete Status'}
                  </button>
                )}
              </>
            ) : isCompleteToVerified ? (
              <button 
                type="submit" 
                disabled={saving} 
                className="btn-primary"
              >
                {saving ? 'Saving...' : 'Advance to Verified'}
              </button>
            ) : (
              <>
                <button type="button" onClick={() => navigate(`/property/${id}`)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProperty;
