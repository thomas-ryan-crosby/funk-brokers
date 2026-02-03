import { useEffect, useRef, useState, useCallback } from 'react';
import { loadGooglePlaces, API_KEY } from '../utils/loadGooglePlaces';
import metrics from '../utils/metrics';

function parseAddressComponents(components) {
  let address = '';
  let city = '';
  let state = '';
  let zipCode = '';
  for (const c of components) {
    if (c.types.includes('street_number')) address = (address + ' ' + c.long_name).trim();
    if (c.types.includes('route')) address = (address + ' ' + c.long_name).trim();
    if (c.types.includes('locality')) city = c.long_name;
    if (!city && c.types.includes('sublocality')) city = c.long_name;
    if (!city && c.types.includes('sublocality_level_1')) city = c.long_name;
    if (!city && c.types.includes('administrative_area_level_2')) city = c.long_name;
    if (c.types.includes('administrative_area_level_1')) state = c.short_name;
    if (c.types.includes('postal_code')) zipCode = c.long_name;
  }
  return { address, city, state, zipCode };
}

const PREDICTION_DEBOUNCE_MS = 300;

const AddressAutocomplete = ({
  value,
  onAddressChange,
  onAddressSelect,
  placeholder = 'Start typing an address',
  id,
  required,
  disabled,
  className,
  name = 'address',
  ...inputProps
}) => {
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionTokenRef = useRef(null);
  const debounceRef = useRef(null);
  const onAddressSelectRef = useRef(onAddressSelect);
  const onAddressChangeRef = useRef(onAddressChange);
  onAddressSelectRef.current = onAddressSelect;
  onAddressChangeRef.current = onAddressChange;

  const createSessionToken = useCallback(() => {
    if (typeof window === 'undefined' || !window.google?.maps?.places) return null;
    try {
      if (window.google.maps.places.AutocompleteSessionToken) {
        return new window.google.maps.places.AutocompleteSessionToken();
      }
    } catch (_) {}
    return null;
  }, []);

  useEffect(() => {
    if (!API_KEY) return;
    loadGooglePlaces()
      .then(() => {
        setReady(true);
        sessionTokenRef.current = createSessionToken();
      })
      .catch(() => {});
  }, [createSessionToken]);

  useEffect(() => {
    if (!ready || !inputRef.current || !window.google?.maps?.places?.AutocompleteService) return;

    const input = inputRef.current;
    const requestPredictions = (query) => {
      const q = String(query || '').trim();
      if (!q) {
        setPredictions([]);
        setShowDropdown(false);
        return;
      }
      setLoading(true);
      const token = sessionTokenRef.current;
      const request = {
        input: q,
        types: ['address'],
        componentRestrictions: { country: 'us' },
        ...(token ? { sessionToken: token } : {}),
      };
      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions(request, (resultPredictions, status) => {
        setLoading(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && Array.isArray(resultPredictions)) {
          setPredictions(resultPredictions);
          setShowDropdown(true);
        } else {
          setPredictions([]);
        }
      });
    };

    const onInputChange = (e) => {
      const v = e.target.value;
      onAddressChangeRef.current?.(v);
      setShowDropdown(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => requestPredictions(v), PREDICTION_DEBOUNCE_MS);
    };

    input.addEventListener('input', onInputChange);
    input.addEventListener('focus', () => {
      if (predictions.length > 0) setShowDropdown(true);
    });
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      input.removeEventListener('input', onInputChange);
    };
  }, [ready, predictions.length]);

  useEffect(() => {
    if (!ready || !showDropdown) return;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ready, showDropdown]);

  const selectPlace = useCallback((placeId, description) => {
    setShowDropdown(false);
    setPredictions([]);
    onAddressChangeRef.current?.(description || '');

    const token = sessionTokenRef.current;
    const done = (parsed) => {
      onAddressSelectRef.current?.(parsed);
      sessionTokenRef.current = createSessionToken();
    };

    const tryGeocoder = (addr, baseParsed = null) => {
      if (!addr || !window.google?.maps?.Geocoder) {
        done(baseParsed || { address: addr || '', city: '', state: '', zipCode: '' });
        return;
      }
      metrics.recordPlacesCall();
      new window.google.maps.Geocoder().geocode({ address: addr }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const p = baseParsed
            ? { ...baseParsed }
            : parseAddressComponents(results[0].address_components || []);
          if (!p.address) p.address = results[0].formatted_address || addr;
          const loc = results[0].geometry?.location;
          if (loc) {
            p.latitude = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
            p.longitude = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
          }
          done(p);
        } else {
          done(baseParsed || { address: addr, city: '', state: '', zipCode: '' });
        }
      });
    };

    if (!placeId || !window.google?.maps?.places?.PlacesService) {
      tryGeocoder(description || '');
      return;
    }
    metrics.recordPlacesCall();
    const div = document.createElement('div');
    const svc = new window.google.maps.places.PlacesService(div);
    const detailsRequest = {
      placeId: placeId,
      fields: ['address_components', 'formatted_address', 'geometry'],
      ...(token ? { sessionToken: token } : {}),
    };
    svc.getDetails(detailsRequest, (details, status) => {
      if (status === 'OK' && details) {
        const fa = details.formatted_address || description || '';
        if (details.address_components?.length) {
          const p = parseAddressComponents(details.address_components);
          p.address = p.address || fa;
          if (details.geometry?.location) {
            const loc = details.geometry.location;
            p.latitude = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
            p.longitude = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
            done(p);
          } else {
            tryGeocoder(fa, p);
          }
        } else {
          tryGeocoder(fa);
        }
      } else {
        tryGeocoder(description || '');
      }
    });
  }, [createSessionToken]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={value}
        onChange={(e) => onAddressChange?.(e.target.value)}
        placeholder={placeholder}
        id={id}
        required={!!required}
        disabled={disabled}
        className={className}
        autoComplete="off"
        {...inputProps}
      />
      {showDropdown && (predictions.length > 0 || loading) && (
        <ul
          className="address-autocomplete-dropdown"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            margin: 0,
            padding: 0,
            listStyle: 'none',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 4,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            maxHeight: 240,
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {loading && predictions.length === 0 ? (
            <li style={{ padding: '8px 12px', color: '#666' }}>Loading...</li>
          ) : (
            predictions.map((p) => (
              <li
                key={p.place_id || p.description}
                role="option"
                tabIndex={0}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee',
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectPlace(p.place_id, p.description);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectPlace(p.place_id, p.description);
                  }
                }}
              >
                {p.description}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
