import { useEffect, useRef, useState } from 'react';
import { loadGooglePlaces } from '../utils/loadGooglePlaces';
import './PropertyMap.css';

const DEFAULT_CENTER = { lat: 39.5, lng: -98.5 };
const DEFAULT_ZOOM = 4;

const formatPrice = (n) =>
  n != null && Number.isFinite(n)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
    : '—';

const PropertyMap = ({ properties = [], onPropertiesInView }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadGooglePlaces()
      .then(() => setReady(true))
      .catch((e) => setError(e?.message || 'Failed to load map'));
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      });
    }

    const map = mapInstanceRef.current;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const withCoords = properties.filter(
      (p) => typeof p.latitude === 'number' && typeof p.longitude === 'number'
    );

    const bounds = new window.google.maps.LatLngBounds();

    withCoords.forEach((p) => {
      const pos = { lat: p.latitude, lng: p.longitude };
      const marker = new window.google.maps.Marker({ position: pos, map, property: p });
      bounds.extend(pos);

      const info = new window.google.maps.InfoWindow({
        content: `
          <div class="property-map-info">
            <strong>${[p.address, p.city, p.state].filter(Boolean).join(', ') || 'Property'}</strong>
            <p>${formatPrice(p.price)}</p>
            <a href="/funk-brokers/property/${p.id}">View details</a>
          </div>
        `,
      });

      marker.addListener('click', () => {
        info.open(map, marker);
      });
      markersRef.current.push(marker);
    });

    if (bounds.getNorthEast().lat() !== bounds.getSouthWest().lat() || bounds.getNorthEast().lng() !== bounds.getSouthWest().lng()) {
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    } else if (withCoords.length === 1) {
      map.setCenter({ lat: withCoords[0].latitude, lng: withCoords[0].longitude });
      map.setZoom(14);
    } else {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(DEFAULT_ZOOM);
    }

    const updatePropertiesInView = () => {
      if (typeof onPropertiesInView !== 'function') return;
      const b = map.getBounds();
      if (!b) return;
      const inView = withCoords.filter((p) => b.contains({ lat: p.latitude, lng: p.longitude }));
      onPropertiesInView(inView);
    };

    const idleListener = map.addListener('idle', updatePropertiesInView);

    return () => {
      if (idleListener && window.google?.maps?.event?.removeListener) {
        window.google.maps.event.removeListener(idleListener);
      }
    };
  }, [ready, properties, onPropertiesInView]);

  if (error) {
    return (
      <div className="property-map property-map--error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="property-map">
      <div ref={mapRef} className="property-map-canvas" aria-label="Property map" />
      {!ready && <div className="property-map-loading">Loading map…</div>}
    </div>
  );
};

export default PropertyMap;
