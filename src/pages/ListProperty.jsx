import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { claimProperty } from '../services/propertyService';
import AddressAutocomplete from '../components/AddressAutocomplete';
import './ListProperty.css';

const ListProperty = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/sign-up?redirect=/list-property');
      return;
    }
    setCheckingAuth(false);
  }, [isAuthenticated, authLoading, navigate, user?.uid]);

  const [formData, setFormData] = useState(() => {
    const base = {
      address: '',
      city: '',
      state: '',
      zipCode: '',
      latitude: undefined,
      longitude: undefined,
      attomId: undefined,
    };
    if (saleProfile) {
      return {
        ...base,
        address: saleProfile.address ?? base.address,
        city: saleProfile.city ?? base.city,
        state: saleProfile.state ?? base.state,
        zipCode: saleProfile.zipCode ?? base.zipCode,
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

  const [addressInputValue, setAddressInputValue] = useState(() => String(location.state?.claimAddress ?? '').trim());

  const hasValidAddress = () => {
    const hasAddress = !!formData.address?.trim();
    const hasCityStateZip = !!formData.city?.trim() || !!formData.state?.trim() || !!formData.zipCode?.trim();
    const hasCoords = typeof formData.latitude === 'number' && !Number.isNaN(formData.latitude)
      && typeof formData.longitude === 'number' && !Number.isNaN(formData.longitude);
    return hasAddress && (hasCityStateZip || hasCoords);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasValidAddress()) {
      setError('Please select a valid address from the list.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const parcel = {
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        latitude: formData.latitude,
        longitude: formData.longitude,
        attomId: formData.attomId,
      };
      const propertyId = await claimProperty(parcel, user?.uid);
      navigate(`/property/${propertyId}`, { state: { fromClaim: true } });
    } catch (err) {
      setError('Failed to claim property. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth or checklist
  if (authLoading || checkingAuth) {
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

  return (
    <div className="list-property-page">
      <div className="list-property-container">
        <h1>Claim Your Property</h1>
        <p className="list-property-disclaimer">
          Search for your property address and claim the listing to get started.
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-step">
            <h2>Search for your property</h2>
            <p className="form-note">Select your address from the search results to claim it.</p>
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
                    if (!v.trim()) {
                      const updated = { ...formData, address: '', city: '', state: '', zipCode: '', latitude: undefined, longitude: undefined };
                      setFormData(updated);
                    }
                  }}
                  onAddressSelect={(obj) => {
                    const updated = { ...formData, ...obj };
                    setFormData(updated);
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

          <div className="form-actions">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Claiming...' : 'Claim Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ListProperty;
