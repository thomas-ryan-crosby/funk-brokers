import { useEffect, useRef, useState } from 'react';
import { loadGooglePlaces, API_KEY } from '../utils/loadGooglePlaces';

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
    let ac;
    try {
      ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
      });
    } catch (e) {
      // ApiNotActivatedMapError etc.: APIs not enabled in GCP; keep plain input
      return;
    }
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
