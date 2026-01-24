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
    if (!city && c.types.includes('administrative_area_level_2')) city = c.long_name;
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
      if (!place) return;

      const done = (parsed) => {
        if (!parsed.address && place.formatted_address) {
          parsed.address = place.formatted_address;
          parsed.city = '';
          parsed.state = '';
          parsed.zipCode = '';
        }
        onAddressSelect?.(parsed);
      };

      const tryGeocoder = (addr) => {
        if (!addr || !window.google?.maps?.Geocoder) {
          done({ address: addr || '', city: '', state: '', zipCode: '' });
          return;
        }
        new window.google.maps.Geocoder().geocode({ address: addr }, (results, status) => {
          if (status === 'OK' && results?.[0]?.address_components) {
            const p = parseAddressComponents(results[0].address_components);
            if (!p.address) {
              p.address = addr;
              p.city = '';
              p.state = '';
              p.zipCode = '';
            }
            done(p);
          } else {
            done({ address: addr, city: '', state: '', zipCode: '' });
          }
        });
      };

      // 1) address_components with city/state/zip → done
      if (place.address_components?.length) {
        const parsed = parseAddressComponents(place.address_components);
        if (parsed.city && parsed.state && parsed.zipCode) {
          done(parsed);
          return;
        }
      }

      // 2) place_id → Place Details (single-click often has place_id only; getDetails returns full data)
      if (place.place_id && window.google?.maps?.places?.PlacesService) {
        try {
          const svc = new window.google.maps.places.PlacesService(document.createElement('div'));
          svc.getDetails(
            { placeId: place.place_id, fields: ['address_components', 'formatted_address'] },
            (details, status) => {
              if (status === 'OK' && details) {
                const fa = details.formatted_address || place.formatted_address || '';
                if (details.address_components?.length) {
                  const p = parseAddressComponents(details.address_components);
                  p.address = p.address || fa;
                  done(p);
                } else {
                  tryGeocoder(fa);
                }
              } else {
                tryGeocoder(place.formatted_address);
              }
            }
          );
        } catch (_) {
          tryGeocoder(place.formatted_address);
        }
        return;
      }

      // 3) Geocoder on formatted_address
      tryGeocoder(place.formatted_address);
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
