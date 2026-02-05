import { useEffect, useRef, useState, useCallback } from 'react';
import { getPredictions, geocode } from '../services/mapboxGeocodeService';

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
  const [predictions, setPredictions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const debounceRef = useRef(null);
  const onAddressSelectRef = useRef(onAddressSelect);
  const onAddressChangeRef = useRef(onAddressChange);
  onAddressSelectRef.current = onAddressSelect;
  onAddressChangeRef.current = onAddressChange;

  const requestPredictionsRef = useRef((query) => {
    const q = String(query || '').trim();
    if (!q) {
      setPredictions([]);
      setShowDropdown(false);
      setLoadError(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    getPredictions(q)
      .then((list) => {
        setLoading(false);
        setPredictions(Array.isArray(list) ? list : []);
        setShowDropdown(true);
      })
      .catch(() => {
        setLoading(false);
        setPredictions([]);
        setLoadError(true);
        setShowDropdown(true);
      });
  });

  useEffect(() => {
    if (!inputRef.current) return;
    const requestPredictions = requestPredictionsRef.current;
    const onInputChange = (e) => {
      const v = e.target.value;
      onAddressChangeRef.current?.(v);
      setShowDropdown(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => requestPredictions(v), PREDICTION_DEBOUNCE_MS);
    };
    const onFocus = () => {
      const currentValue = inputRef.current?.value?.trim() || value?.trim() || '';
      if (predictions.length > 0) {
        setShowDropdown(true);
      } else if (currentValue) {
        requestPredictions(currentValue);
      }
    };
    const input = inputRef.current;
    input.addEventListener('input', onInputChange);
    input.addEventListener('focus', onFocus);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      input.removeEventListener('input', onInputChange);
      input.removeEventListener('focus', onFocus);
    };
  }, [value, predictions.length]);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const selectPlace = useCallback((suggestion) => {
    setShowDropdown(false);
    setPredictions([]);
    const placeName = suggestion.place_name || suggestion.description || '';
    onAddressChangeRef.current?.(placeName);

    const done = (parsed) => {
      onAddressSelectRef.current?.(parsed);
    };

    if (suggestion.center && suggestion.center.length >= 2) {
      const [lng, lat] = suggestion.center;
      const parsed = {
        address: placeName,
        city: '',
        state: '',
        zipCode: '',
        latitude: lat,
        longitude: lng,
      };
      geocode(placeName)
        .then((res) => {
          if (res) {
            done({ ...res, latitude: res.latitude ?? lat, longitude: res.longitude ?? lng });
          } else {
            done(parsed);
          }
        })
        .catch(() => done(parsed));
      return;
    }

    geocode(placeName)
      .then((res) => done(res || { address: placeName, city: '', state: '', zipCode: '' }))
      .catch(() => done({ address: placeName, city: '', state: '', zipCode: '' }));
  }, []);

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
      {showDropdown && (predictions.length > 0 || loading || loadError) && (
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
            color: '#1a1a1a',
            border: '1px solid #ccc',
            borderRadius: 4,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            maxHeight: 240,
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {loadError ? (
            <li style={{ padding: '8px 12px', color: '#c00', fontSize: '0.9em' }}>
              Suggestions unavailable. Set MAPBOX_ACCESS_TOKEN in Vercel (Settings → Environment Variables) or try again.
            </li>
          ) : loading && predictions.length === 0 ? (
            <li style={{ padding: '8px 12px', color: '#555' }}>Loading...</li>
          ) : (
            predictions.map((p, idx) => (
              <li
                key={p.id || p.description || idx}
                role="option"
                tabIndex={0}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee',
                  color: '#1a1a1a',
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectPlace(p);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectPlace(p);
                  }
                }}
              >
                {p.description || p.place_name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
