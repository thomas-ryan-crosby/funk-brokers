import { useEffect, useRef, useState } from 'react';
import { loadGooglePlaces } from '../utils/loadGooglePlaces';
import { getMapParcels } from '../services/parcelService';
import { ENABLE_MAP_QUERY_DEBOUNCE } from '../config/featureFlags';
import './CompsMap.css';

const SELECTED_COLOR = '#3b82f6';
const UNSELECTED_COLOR = '#64748b';
const DEFAULT_CENTER = { lat: 39.5, lng: -98.5 };
const DEFAULT_ZOOM = 15;

const formatNumber = (value) =>
  value != null && Number.isFinite(value) ? new Intl.NumberFormat('en-US').format(value) : '—';

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
      const distance = 2 * earth * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return distance > 350;
    };

    const updateParcels = () => {
      const bounds = map.getBounds();
      if (!bounds) return;
      const zoom = map.getZoom();
      if (zoom == null) return;
      const center = map.getCenter();
      const nextState = { lat: center.lat(), lng: center.lng(), zoom };
      if (!movedEnough(lastMapStateRef.current, nextState)) {
        return;
      }
      lastMapStateRef.current = nextState;
      if (debouncedRef.current) {
        window.clearTimeout(debouncedRef.current);
      }
      debouncedRef.current = window.setTimeout(() => {
        if (Date.now() - lastFetchAtRef.current < 800) return;
        lastFetchAtRef.current = Date.now();
        const requestId = lastRequestRef.current + 1;
        lastRequestRef.current = requestId;
        getMapParcels({ bounds, zoom })
          .then(({ parcels: p }) => {
            if (requestId !== lastRequestRef.current) return;
            setParcels(p || []);
          })
          .catch(() => {
            if (requestId !== lastRequestRef.current) return;
            setParcels([]);
          });
      }, debounceMs);
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

    // Clear existing markers and clean up old callbacks
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    
    // Clean up old callbacks (keep only active ones)
    if (window.compsMapCallbacks) {
      const activeIds = new Set();
      parcels.forEach((p) => {
        Object.keys(window.compsMapCallbacks).forEach((id) => {
          if (id.includes(String(p.attomId))) {
            activeIds.add(id);
          }
        });
      });
      Object.keys(window.compsMapCallbacks).forEach((id) => {
        if (!activeIds.has(id)) {
          delete window.compsMapCallbacks[id];
        }
      });
    }

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

      // Create a unique callback ID for this parcel
      const callbackId = `comp-add-${parcel.attomId || Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Store the callback in a global object (Google Maps InfoWindow limitation)
      if (!window.compsMapCallbacks) {
        window.compsMapCallbacks = {};
      }
      
      const info = new window.google.maps.InfoWindow({
        content: `
          <div class="comps-map-info">
            <strong>${parcel.address || 'Address unknown'}</strong>
            <p>${formatNumber(parcel.beds)} bd · ${formatNumber(parcel.baths)} ba · ${formatNumber(parcel.squareFeet)} sqft</p>
            ${isSelected 
              ? '<p class="comps-map-info-selected">✓ Selected as comp</p>' 
              : `<button class="comps-map-add-btn" onclick="if(window.compsMapCallbacks && window.compsMapCallbacks['${callbackId}']) { window.compsMapCallbacks['${callbackId}'](); }">Add as Comp</button>`
            }
          </div>
        `,
      });
      
      // Store callback that closes info window and calls onCompSelect
      window.compsMapCallbacks[callbackId] = () => {
        info.close();
        if (typeof onCompSelect === 'function') {
          onCompSelect(parcel);
        }
      };

      // Open info window on marker click
      marker.addListener('click', () => {
        info.open(map, marker);
      });

      marker.addListener('mouseover', () => {
        setHoveredParcel(parcel);
      });

      marker.addListener('mouseout', () => {
        setHoveredParcel(null);
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
