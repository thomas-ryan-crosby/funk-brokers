import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPropertyById, updateProperty } from '../services/propertyService';
import { uploadFile, uploadMultipleFiles } from '../services/storageService';
import AddressAutocomplete from '../components/AddressAutocomplete';
import DragDropFileInput from '../components/DragDropFileInput';
import './ListProperty.css';

const propertyTypes = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land'];
const commonFeatures = [
  'Garage', 'Fireplace', 'Pool', 'Garden', 'Hardwood Floors', 'Updated Kitchen', 'Updated Bathroom',
  'Central Air', 'Central Heat', 'Washer/Dryer', 'Dishwasher', 'Garbage Disposal',
];

const EditProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
        squareFeet: p.squareFeet != null ? String(p.squareFeet) : '',
        lotSize: p.lotSize != null ? String(p.lotSize) : '',
        yearBuilt: p.yearBuilt != null ? String(p.yearBuilt) : '',
        bedrooms: p.bedrooms != null ? String(p.bedrooms) : '',
        bathrooms: p.bathrooms != null ? String(p.bathrooms) : '',
        description: p.description || '',
        features: Array.isArray(p.features) ? p.features : [],
        hoaFee: p.hoaFee != null ? String(p.hoaFee) : '',
        propertyTax: p.propertyTax != null ? String(p.propertyTax) : '',
        acceptingCommunications: p.acceptingCommunications !== false,
      });
      setAddressInputValue([p.address, p.city, p.state, p.zipCode].filter(Boolean).join(', '));
      setExistingPhotos(Array.isArray(p.photos) ? [...p.photos] : []);
      setExistingDocUrls({
        deedUrl: p.deedUrl || '',
        propertyTaxRecordUrl: p.propertyTaxRecordUrl || '',
        hoaDocsUrl: p.hoaDocsUrl || '',
        disclosureFormsUrl: p.disclosureFormsUrl || '',
        inspectionReportUrl: p.inspectionReportUrl || '',
      });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData) return;
    if (!formData.address?.trim() || !(formData.city?.trim() || formData.state?.trim() || formData.zipCode?.trim())) {
      setError('Please select an address from the list.');
      return;
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
        ...docUrls,
        acceptingCommunications: !!formData.acceptingCommunications,
      };
      if (typeof formData.latitude === 'number' && !Number.isNaN(formData.latitude) && typeof formData.longitude === 'number' && !Number.isNaN(formData.longitude)) {
        updates.latitude = formData.latitude;
        updates.longitude = formData.longitude;
      }
      await updateProperty(id, updates);
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
      <div className="list-property-container edit-property-single">
        <h1>Edit Property</h1>
        <p className="form-note">Update your listing. All sections from List Property are below.</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          {/* 1. Address — same as List Property */}
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

          {/* 2. About the home — same as List Property */}
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
                <label>HOA Fee ($/month)</label>
                <input type="number" name="hoaFee" value={formData.hoaFee} onChange={handleInputChange} min="0" />
              </div>
              <div className="form-group">
                <label>Property Tax ($/year)</label>
                <input type="number" name="propertyTax" value={formData.propertyTax} onChange={handleInputChange} min="0" />
              </div>
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

          {/* 3. Initial Pricing Info — same as List Property */}
          <div className="form-step">
            <h2>Initial Pricing Info</h2>
            <p className="form-note">Set your asking price. You can update it later.</p>
            <div className="form-group" style={{ maxWidth: 320 }}>
              <label>Asking Price ($) *</label>
              <input type="number" name="price" value={formData.price} onChange={handleInputChange} min="0" step="1000" placeholder="e.g. 450000" required />
            </div>
          </div>

          {/* 4. Photos and additional documents — same as List Property + existing photos */}
          <div className="form-step">
            <h2>Photos and additional documents</h2>
            <p className="form-note">Photos, description, and documents (deed, disclosures, etc.).</p>

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
              <label>Property Photos (optional)</label>
              <p className="form-note">Add more photos. 5+ recommended when you have them.</p>
              <DragDropFileInput multiple accept="image/*" onChange={(files) => handleNewPhotoFiles(files || [])} placeholder="Drop photos here or click to browse" />
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
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows="5" placeholder="Describe your property, neighborhood, and what makes it special..." />
            </div>

            <div className="form-group" style={{ marginTop: 24 }}>
              <label>Documents</label>
              <p className="form-note">Upload deed, tax records, disclosures, and inspection if you have them. New uploads replace existing.</p>
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
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate(`/property/${id}`)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProperty;
