import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_ACCESS_TOKEN } from '../utils/mapbox';
import { getMapParcels } from '../services/parcelService';
import { ENABLE_MAP_QUERY_DEBOUNCE } from '../config/featureFlags';
import './CompsMap.css';

const SELECTED_COLOR = '#3b82f6';
const UNSELECTED_COLOR = '#64748b';
const DEFAULT_CENTER = [-98.5, 39.5];
const DEFAULT_ZOOM = 15;
const DEBOUNCE_MS = ENABLE_MAP_QUERY_DEBOUNCE ? 800 : 600;

const formatNumber = (value) =>
  value != null && Number.isFinite(value) ? new Intl.NumberFormat('en-US').format(value) : '—';

function boundsAdapter(mapboxBounds) {
  if (!mapboxBounds) return null;
  const ne = mapboxBounds.getNorthEast();
  const sw = mapboxBounds.getSouthWest();
  return {
    getNorthEast: () => ({ lat: () => ne.lat, lng: () => ne.lng }),
    getSouthWest: () => ({ lat: () => sw.lat, lng: () => sw.lng }),
  };
}

const CompsMap = ({ center, onCompSelect, selectedComps = [] }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [hoveredParcel, setHoveredParcel] = useState(null);

  useEffect(() => {
    if (!MAPBOX_ACCESS_TOKEN) {
      setError('Mapbox token not configured');
      return;
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !MAPBOX_ACCESS_TOKEN) return;

    if (!mapInstanceRef.current) {
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
      const initialCenter = center && (center.lat != null && center.lng != null)
        ? [center.lng, center.lat]
        : DEFAULT_CENTER;
      mapInstanceRef.current = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: initialCenter,
        zoom: DEFAULT_ZOOM,
      });
    }

    const map = mapInstanceRef.current;
    if (center && center.lat != null && center.lng != null) {
      map.setCenter([center.lng, center.lat]);
      map.setZoom(DEFAULT_ZOOM);
    }

    const lastRequestRef = { current: 0 };
    const lastMapStateRef = { current: null };
    const debouncedRef = { current: null };
    const lastFetchAtRef = { current: 0 };

    const movedEnough = (prev, next) => {
      if (!prev) return true;
      const zoomChange = Math.abs((prev.zoom ?? 0) - (next.zoom ?? 0));
      if (zoomChange >= 1) return true;
      const toRadians = (deg) => (deg * Math.PI) / 180;
      const earth = 6371000;
      const dLat = toRadians(next.lat - prev.lat);
      const dLng = toRadians(next.lng - prev.lng);
      const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRadians(prev.lat)) * Math.cos(toRadians(next.lat)) * Math.sin(dLng / 2) ** 2;
      return 2 * earth * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) > 350;
    };

    const updateParcels = () => {
      const bounds = map.getBounds();
      if (!bounds) return;
      const zoom = map.getZoom();
      if (zoom == null) return;
      const mapCenter = map.getCenter();
      const nextState = { lat: mapCenter.lat, lng: mapCenter.lng, zoom };
      if (!movedEnough(lastMapStateRef.current, nextState)) return;
      lastMapStateRef.current = nextState;
      if (debouncedRef.current) window.clearTimeout(debouncedRef.current);
      debouncedRef.current = window.setTimeout(() => {
        if (Date.now() - lastFetchAtRef.current < 800) return;
        lastFetchAtRef.current = Date.now();
        const requestId = lastRequestRef.current + 1;
        lastRequestRef.current = requestId;
        getMapParcels({ bounds: boundsAdapter(bounds), zoom })
          .then(({ parcels: p }) => {
            if (requestId !== lastRequestRef.current) return;
            setParcels(p || []);
          })
          .catch(() => {
            if (requestId !== lastRequestRef.current) return;
            setParcels([]);
          });
      }, DEBOUNCE_MS);
    };

    map.on('idle', updateParcels);
    updateParcels();

    return () => map.off('idle', updateParcels);
  }, [ready, center]);

  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const callbacks = (window.compsMapCallbacks = window.compsMapCallbacks || {});

    parcels.forEach((parcel) => {
      const isSelected = selectedComps.some((c) => c.parcelId === parcel.attomId);
      const el = document.createElement('div');
      el.className = 'comps-map-marker';
      el.style.width = isSelected ? '20px' : '14px';
      el.style.height = isSelected ? '20px' : '14px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = isSelected ? SELECTED_COLOR : UNSELECTED_COLOR;
      el.style.border = isSelected ? '2px solid #fff' : '1.5px solid #fff';
      el.style.cursor = 'pointer';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([parcel.longitude, parcel.latitude])
        .addTo(map);

      const callbackId = `comp-add-${parcel.attomId || Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      const popup = new mapboxgl.Popup({ offset: 12, closeButton: true }).setHTML(`
        <div class="comps-map-info">
          <strong>${parcel.address || 'Address unknown'}</strong>
          <p>${formatNumber(parcel.beds)} bd · ${formatNumber(parcel.baths)} ba · ${formatNumber(parcel.squareFeet)} sqft</p>
          ${isSelected
            ? '<p class="comps-map-info-selected">✓ Selected as comp</p>'
            : `<button class="comps-map-add-btn" data-callback-id="${callbackId}">Add as Comp</button>`
          }
        </div>
      `);

      callbacks[callbackId] = () => {
        popup.remove();
        if (typeof onCompSelect === 'function') onCompSelect(parcel);
      };

      el.addEventListener('click', () => {
        marker.getPopup()?.remove();
        marker.setPopup(popup);
        popup.addTo(map);
        const btn = popup.getElement()?.querySelector(`[data-callback-id="${callbackId}"]`);
        if (btn) btn.addEventListener('click', () => callbacks[callbackId]?.());
      });
      el.addEventListener('mouseover', () => setHoveredParcel(parcel));
      el.addEventListener('mouseout', () => setHoveredParcel(null));

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
