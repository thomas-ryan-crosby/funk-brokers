import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPropertyById, updateProperty } from '../services/propertyService';
import { uploadMultipleFiles } from '../services/storageService';
import './ListProperty.css';

const propertyTypes = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land'];
const commonFeatures = [
  'Garage', 'Fireplace', 'Pool', 'Garden', 'Hardwood Floors', 'Updated Kitchen', 'Updated Bathroom',
  'Central Air', 'Central Heat', 'Washer/Dryer', 'Dishwasher', 'Garbage Disposal',
];

const EditProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(null);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([]);

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
      if (p.sellerId !== user?.uid) {
        setError('You can only edit your own listings.');
        setLoading(false);
        return;
      }
      setFormData({
        address: p.address || '',
        city: p.city || '',
        state: p.state || '',
        zipCode: p.zipCode || '',
        propertyType: p.propertyType || '',
        price: p.price != null ? String(p.price) : '',
        squareFeet: p.squareFeet != null ? String(p.squareFeet) : '',
        lotSize: p.lotSize != null ? String(p.lotSize) : '',
        yearBuilt: p.yearBuilt != null ? String(p.yearBuilt) : '',
        bedrooms: p.bedrooms != null ? String(p.bedrooms) : '',
        bathrooms: p.bathrooms != null ? String(p.bathrooms) : '',
        description: p.description || '',
        features: Array.isArray(p.features) ? p.features : [],
        hoaFee: p.hoaFee != null ? String(p.hoaFee) : '',
        propertyTax: p.propertyTax != null ? String(p.propertyTax) : '',
      });
      setExistingPhotos(Array.isArray(p.photos) ? [...p.photos] : []);
    } catch (err) {
      setError('Property not found or failed to load.');
      console.error(err);
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
    const files = Array.from(e.target.files);
    setNewPhotoFiles(files);
    setNewPhotoPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const removeExistingPhoto = (index) => {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep = (s) => {
    if (!formData) return false;
    if (s === 1) return !!(formData.address && formData.city && formData.state && formData.zipCode && formData.propertyType && formData.price);
    if (s === 2) return !!(formData.bedrooms && formData.bathrooms);
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) { setStep(step + 1); setError(null); }
    else setError('Please fill in all required fields.');
  };

  const handleBack = () => { setStep(step - 1); setError(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData) return;
    setSaving(true);
    setError(null);
    try {
      let newUrls = [];
      if (newPhotoFiles.length > 0) {
        newUrls = await uploadMultipleFiles(newPhotoFiles, `properties/${id}/photos`);
      }
      const photos = [...existingPhotos, ...newUrls];
      await updateProperty(id, {
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        propertyType: formData.propertyType,
        price: parseFloat(formData.price),
        squareFeet: formData.squareFeet ? parseFloat(formData.squareFeet) : null,
        lotSize: formData.lotSize ? parseFloat(formData.lotSize) : null,
        yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : null,
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseFloat(formData.bathrooms),
        description: formData.description || null,
        features: formData.features || [],
        hoaFee: formData.hoaFee ? parseFloat(formData.hoaFee) : null,
        propertyTax: formData.propertyTax ? parseFloat(formData.propertyTax) : null,
        photos,
      });
      navigate(`/property/${id}`);
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

  return (
    <div className="list-property-page">
      <div className="list-property-container">
        <h1>Edit Property</h1>
        <div className="step-indicator">
          <div className={step >= 1 ? 'step active' : 'step'}>1. Basic Info</div>
          <div className={step >= 2 ? 'step active' : 'step'}>2. Details</div>
          <div className={step >= 3 ? 'step active' : 'step'}>3. Photos & Description</div>
        </div>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="form-step">
              <h2>Basic Information</h2>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Street Address *</label>
                  <input type="text" name="address" value={formData.address} onChange={handleInputChange} required />
                </div>
                <div className="form-group"><label>City *</label><input type="text" name="city" value={formData.city} onChange={handleInputChange} required /></div>
                <div className="form-group"><label>State *</label><input type="text" name="state" value={formData.state} onChange={handleInputChange} maxLength="2" placeholder="CA" required /></div>
                <div className="form-group"><label>Zip Code *</label><input type="text" name="zipCode" value={formData.zipCode} onChange={handleInputChange} required /></div>
                <div className="form-group">
                  <label>Property Type *</label>
                  <select name="propertyType" value={formData.propertyType} onChange={handleInputChange} required>
                    <option value="">Select Type</option>
                    {propertyTypes.map((t) => <option key={t} value={t.toLowerCase().replace(' ', '-')}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Asking Price ($) *</label><input type="number" name="price" value={formData.price} onChange={handleInputChange} min="0" step="1000" required /></div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="form-step">
              <h2>Property Details</h2>
              <div className="form-grid">
                <div className="form-group"><label>Bedrooms *</label><input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleInputChange} min="0" required /></div>
                <div className="form-group"><label>Bathrooms *</label><input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleInputChange} min="0" step="0.5" required /></div>
                <div className="form-group"><label>Square Feet</label><input type="number" name="squareFeet" value={formData.squareFeet} onChange={handleInputChange} min="0" /></div>
                <div className="form-group"><label>Lot Size (sq ft)</label><input type="number" name="lotSize" value={formData.lotSize} onChange={handleInputChange} min="0" /></div>
                <div className="form-group"><label>Year Built</label><input type="number" name="yearBuilt" value={formData.yearBuilt} onChange={handleInputChange} min="1800" max={new Date().getFullYear()} /></div>
                <div className="form-group"><label>HOA Fee ($/month)</label><input type="number" name="hoaFee" value={formData.hoaFee} onChange={handleInputChange} min="0" /></div>
                <div className="form-group"><label>Property Tax ($/year)</label><input type="number" name="propertyTax" value={formData.propertyTax} onChange={handleInputChange} min="0" /></div>
              </div>
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
          )}
          {step === 3 && (
            <div className="form-step">
              <h2>Photos & Description</h2>
              <div className="form-group">
                <label>Existing photos</label>
                {existingPhotos.length > 0 ? (
                  <div className="photo-previews">
                    {existingPhotos.map((url, i) => (
                      <div key={`ex-${i}`} className="photo-preview">
                        <img src={url} alt={`Photo ${i + 1}`} />
                        <button type="button" className="photo-remove" onClick={() => removeExistingPhoto(i)} aria-label="Remove">×</button>
                      </div>
                    ))}
                  </div>
                ) : <p className="form-hint">No photos yet. Add new photos below.</p>}
              </div>
              <div className="form-group">
                <label>Add more photos</label>
                <input type="file" accept="image/*" multiple onChange={handleNewPhotoChange} />
                {newPhotoPreviews.length > 0 && (
                  <div className="photo-previews">
                    {newPhotoPreviews.map((url, i) => (
                      <div key={`new-${i}`} className="photo-preview"><img src={url} alt={`New ${i + 1}`} /></div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Property Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="8" placeholder="Describe your property..." />
              </div>
            </div>
          )}
          <div className="form-actions">
            {step > 1 && <button type="button" onClick={handleBack} className="btn-secondary">Back</button>}
            {step < 3 ? <button type="button" onClick={handleNext} className="btn-primary">Next</button> : <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProperty;
