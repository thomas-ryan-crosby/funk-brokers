import { useEffect, useRef, useState } from 'react';
import { loadGooglePlaces } from '../utils/loadGooglePlaces';
import { getParcelsInViewport } from '../services/parcelService';
import './CompsMap.css';

const SELECTED_COLOR = '#3b82f6';
const UNSELECTED_COLOR = '#64748b';
const DEFAULT_CENTER = { lat: 39.5, lng: -98.5 };
const DEFAULT_ZOOM = 15;

const formatPrice = (n) =>
  n != null && Number.isFinite(n)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
    : '—';

const CompsMap = ({ center, onCompSelect, selectedComps = [] }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [hoveredParcel, setHoveredParcel] = useState(null);

  useEffect(() => {
    loadGooglePlaces()
      .then(() => setReady(true))
      .catch((e) => setError(e?.message || 'Failed to load map'));
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;

    if (!mapInstanceRef.current) {
      const initialCenter = center || DEFAULT_CENTER;
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: initialCenter,
        zoom: DEFAULT_ZOOM,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });
    }

    const map = mapInstanceRef.current;
    
    // Update center if provided
    if (center && center.lat && center.lng) {
      map.setCenter(center);
      map.setZoom(DEFAULT_ZOOM);
    }

    // Load parcels in viewport
    const updateParcels = () => {
      const bounds = map.getBounds();
      if (!bounds) return;
      getParcelsInViewport(bounds)
        .then(({ parcels: p }) => setParcels(p || []))
        .catch(() => setParcels([]));
    };

    const idleListener = map.addListener('idle', updateParcels);
    updateParcels();

    return () => {
      if (idleListener && window.google?.maps?.event?.removeListener) {
        window.google.maps.event.removeListener(idleListener);
      }
    };
  }, [ready, center]);

  // Render markers for parcels
  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !window.google?.maps) return;
    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    parcels.forEach((parcel) => {
      const isSelected = selectedComps.some((c) => c.parcelId === parcel.attomId);
      const marker = new window.google.maps.Marker({
        position: { lat: parcel.latitude, lng: parcel.longitude },
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 10 : 7,
          fillColor: isSelected ? SELECTED_COLOR : UNSELECTED_COLOR,
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: isSelected ? 2 : 1.5,
        },
        zIndex: isSelected ? 3 : 1,
        parcel,
      });

      const info = new window.google.maps.InfoWindow({
        content: `
          <div class="comps-map-info">
            <strong>${parcel.address || 'Address unknown'}</strong>
            ${parcel.estimate ? `<p>Estimate: ${formatPrice(parcel.estimate)}</p>` : ''}
            ${parcel.lastSalePrice ? `<p>Last sale: ${formatPrice(parcel.lastSalePrice)}</p>` : ''}
            ${isSelected ? '<p class="comps-map-info-selected">✓ Selected as comp</p>' : '<p>Click to select as comp</p>'}
          </div>
        `,
      });

      marker.addListener('click', () => {
        if (typeof onCompSelect === 'function') {
          onCompSelect(parcel);
        }
      });

      marker.addListener('mouseover', () => {
        setHoveredParcel(parcel);
        info.open(map, marker);
      });

      marker.addListener('mouseout', () => {
        setHoveredParcel(null);
        info.close();
      });

      markersRef.current.push(marker);
    });
  }, [ready, parcels, selectedComps, onCompSelect]);

  if (error) {
    return (
      <div className="comps-map comps-map--error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="comps-map">
      <div ref={mapRef} className="comps-map-canvas" aria-label="Comparable properties map" />
      {!ready && <div className="comps-map-loading">Loading map…</div>}
      {hoveredParcel && (
        <div className="comps-map-hover-info">
          {hoveredParcel.address || 'Address unknown'}
        </div>
      )}
    </div>
  );
};

export default CompsMap;
