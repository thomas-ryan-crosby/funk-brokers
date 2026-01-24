import { useEffect, useRef, useState } from 'react';
import { firebaseConfig } from '../config/firebase-config';

// Use VITE_GOOGLE_MAPS_API_KEY if set; otherwise fallback to Firebase key (enable Maps JavaScript API + Places API in GCP).
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || firebaseConfig?.apiKey;

let loadPromise = null;
function loadGooglePlaces() {
  if (typeof window !== 'undefined' && window.google?.maps?.places) return Promise.resolve();
  if (!API_KEY) return Promise.reject(new Error('No Google Maps API key'));
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Places'));
    document.head.appendChild(s);
  });
  return loadPromise;
}

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
    if (c.types.includes('administrative_area_level_1')) state = c.short_name;
    if (c.types.includes('postal_code')) zipCode = c.long_name;
  }
  return { address, city, state, zipCode };
}

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
}) => {
  const inputRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!API_KEY) return;
    loadGooglePlaces()
      .then(() => setReady(true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready || !inputRef.current || !window.google?.maps?.places) return;
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
    });
    const onPlace = () => {
      const place = ac.getPlace();
      if (!place?.address_components) return;
      const parsed = parseAddressComponents(place.address_components);
      if (!parsed.address && place.formatted_address) parsed.address = place.formatted_address;
      onAddressSelect?.(parsed);
    };
    ac.addListener('place_changed', onPlace);
    return () => {
      try {
        if (window.google?.maps?.event?.clearInstanceListeners) window.google.maps.event.clearInstanceListeners(ac);
      } catch (_) {}
    };
  }, [ready, onAddressSelect]);

  return (
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
    />
  );
};

export default AddressAutocomplete;
