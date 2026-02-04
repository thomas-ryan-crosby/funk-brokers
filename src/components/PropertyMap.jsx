import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAuth } from '../contexts/AuthContext';
import { USE_MAP_DEBOUNCE, ENABLE_MAP_QUERY_DEBOUNCE } from '../config/featureFlags';
import { MAPBOX_ACCESS_TOKEN } from '../utils/mapbox';
import { getMapParcels } from '../services/parcelService';
import { claimProperty } from '../services/propertyService';
import UnlistedPropertyModal from './UnlistedPropertyModal';
import './PropertyMap.css';

const LISTED_COLOR = '#059669';
const UNLISTED_COLOR = '#64748b';
const DEFAULT_CENTER = [-98.5, 39.5];
const DEFAULT_ZOOM = 4;
const DEDUP_DEG = 0.0001;

const formatNumber = (value) =>
  value != null && Number.isFinite(value) ? new Intl.NumberFormat('en-US').format(value) : '—';

const formatPrice = (value) =>
  value != null && Number.isFinite(value)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
    : '—';

const unlistedTooltipContent = (p) => `
  <div class="property-map-unlisted-tooltip">
    <div class="property-map-unlisted-tooltip__address">${(p.address || 'Address unknown').replace(/</g, '&lt;')}</div>
    <div class="property-map-unlisted-tooltip__badge">Unlisted</div>
    <div class="property-map-unlisted-tooltip__row">
      ${formatNumber(p.beds)} bd · ${formatNumber(p.baths)} ba · ${formatNumber(p.squareFeet)} sqft
    </div>
  </div>
`;

/** Mapbox LngLatBounds -> adapter with getNorthEast/getSouthWest returning { lat(), lng() } for parcelService */
function boundsAdapter(mapboxBounds) {
  if (!mapboxBounds) return null;
  const ne = mapboxBounds.getNorthEast();
  const sw = mapboxBounds.getSouthWest();
  return {
    getNorthEast: () => ({ lat: () => ne.lat, lng: () => ne.lng }),
    getSouthWest: () => ({ lat: () => sw.lat, lng: () => sw.lng }),
  };
}

const PropertyMap = ({ properties = [], onPropertiesInView }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const unlistedMarkersRef = useRef([]);
  const popupsRef = useRef([]);
  const unlistedPopupRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [unlistedParcels, setUnlistedParcels] = useState([]);
  const [selectedUnlistedParcel, setSelectedUnlistedParcel] = useState(null);
  const [claiming, setClaiming] = useState(false);

  const handleClaimUnlisted = async (parcel) => {
    if (!isAuthenticated || !user?.uid) {
      setSelectedUnlistedParcel(null);
      navigate('/sign-up', { state: { returnTo: '/browse', message: 'Sign in to claim this property' } });
      return;
    }
    setClaiming(true);
    try {
      const propertyId = await claimProperty(parcel, user.uid);
      setSelectedUnlistedParcel(null);
      navigate(`/property/${propertyId}`, { state: { fromClaim: true } });
    } catch (err) {
      console.error('Claim property failed:', err);
      alert('Failed to claim property. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

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
      mapInstanceRef.current = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      });
    }

    const map = mapInstanceRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    popupsRef.current.forEach((p) => p.remove());
    popupsRef.current = [];

    const withCoords = properties.filter(
      (p) => typeof p.latitude === 'number' && typeof p.longitude === 'number'
    );

    const bounds = new mapboxgl.LngLatBounds();

    withCoords.forEach((p) => {
      const lngLat = [p.longitude, p.latitude];
      bounds.extend(lngLat);

      const el = document.createElement('div');
      el.className = 'property-map-marker property-map-marker--listed';
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = LISTED_COLOR;
      el.style.border = '2px solid #fff';
      el.style.cursor = 'pointer';

      const marker = new mapboxgl.Marker(el)
        .setLngLat(lngLat)
        .addTo(map);

      const popup = new mapboxgl.Popup({ offset: 12, closeButton: true })
        .setHTML(`
          <div class="property-map-info">
            <strong>${[p.address, p.city, p.state].filter(Boolean).join(', ') || 'Property'}</strong>
            <p>${formatPrice(p.price)}</p>
            <a href="/property/${p.id}">View details</a>
          </div>
        `);

      el.addEventListener('click', () => {
        popupsRef.current.forEach((pp) => pp.remove());
        popupsRef.current = [popup];
        marker.setPopup(popup);
        popup.addTo(map);
      });
      markersRef.current.push(marker);
      popupsRef.current.push(popup);
    });

    if (withCoords.length > 0) {
      if (bounds.getNorthEast().lat !== bounds.getSouthWest().lat || bounds.getNorthEast().lng !== bounds.getSouthWest().lng) {
        map.fitBounds(bounds, { padding: 48 });
      } else {
        map.setCenter([withCoords[0].longitude, withCoords[0].latitude]);
        map.setZoom(14);
      }
    } else {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(DEFAULT_ZOOM);
    }

    const lastRequestRef = { current: 0 };
    const lastMapStateRef = { current: null };
    const debouncedRef = { current: null };
    const lastFetchAtRef = { current: 0 };

    const useStrongDebounce = USE_MAP_DEBOUNCE || ENABLE_MAP_QUERY_DEBOUNCE;
    const minDistanceM = useStrongDebounce ? 500 : 350;
    const debounceMs = useStrongDebounce ? 1000 : 600;
    const minIntervalMs = useStrongDebounce ? 1200 : 800;

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
      return distance > minDistanceM;
    };

    const updatePropertiesInView = () => {
      if (typeof onPropertiesInView === 'function') {
        const b = map.getBounds();
        if (b) {
          const inView = withCoords.filter((p) => b.contains([p.longitude, p.latitude]));
          onPropertiesInView(inView);
        }
      }
      const zoom = map.getZoom();
      if (zoom == null || zoom < 18) {
        setUnlistedParcels([]);
        return;
      }
      const b = map.getBounds();
      if (!b) return;
      const center = map.getCenter();
      const nextState = { lat: center.lat, lng: center.lng, zoom };
      if (!movedEnough(lastMapStateRef.current, nextState)) return;
      lastMapStateRef.current = nextState;
      if (debouncedRef.current) window.clearTimeout(debouncedRef.current);
      debouncedRef.current = window.setTimeout(() => {
        if (Date.now() - lastFetchAtRef.current < minIntervalMs) return;
        lastFetchAtRef.current = Date.now();
        const requestId = lastRequestRef.current + 1;
        lastRequestRef.current = requestId;
        getMapParcels({ bounds: boundsAdapter(b), zoom })
          .then(({ parcels }) => {
            if (requestId !== lastRequestRef.current) return;
            setUnlistedParcels(parcels || []);
          })
          .catch(() => {
            if (requestId !== lastRequestRef.current) return;
            setUnlistedParcels([]);
          });
      }, debounceMs);
    };

    map.on('idle', updatePropertiesInView);
    updatePropertiesInView();

    return () => {
      map.off('idle', updatePropertiesInView);
    };
  }, [ready, properties, onPropertiesInView]);

  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    unlistedMarkersRef.current.forEach((m) => m.remove());
    unlistedMarkersRef.current = [];
    if (unlistedPopupRef.current) {
      unlistedPopupRef.current.remove();
      unlistedPopupRef.current = null;
    }

    const withCoords = (properties || []).filter(
      (p) => typeof p.latitude === 'number' && typeof p.longitude === 'number'
    );
    const isListed = (lat, lng) =>
      withCoords.some(
        (c) => Math.abs(c.latitude - lat) < DEDUP_DEG && Math.abs(c.longitude - lng) < DEDUP_DEG
      );
    const parcels = (unlistedParcels || []).filter((p) => !isListed(p.latitude, p.longitude));

    if (!unlistedPopupRef.current) {
      unlistedPopupRef.current = new mapboxgl.Popup({ offset: 12, closeButton: false });
    }
    const tip = unlistedPopupRef.current;

    parcels.forEach((p) => {
      const el = document.createElement('div');
      el.className = 'property-map-marker property-map-marker--unlisted';
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = UNLISTED_COLOR;
      el.style.border = '1px solid #fff';
      el.style.cursor = 'pointer';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([p.longitude, p.latitude])
        .addTo(map);

      el.addEventListener('mouseover', () => {
        tip.setHTML(unlistedTooltipContent(p));
        tip.setLngLat([p.longitude, p.latitude]).addTo(map);
      });
      el.addEventListener('mouseout', () => tip.remove());
      el.addEventListener('click', () => {
        tip.remove();
        setSelectedUnlistedParcel(p);
      });
      unlistedMarkersRef.current.push(marker);
    });
  }, [ready, properties, unlistedParcels]);

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
      <UnlistedPropertyModal parcel={selectedUnlistedParcel} onClose={() => setSelectedUnlistedParcel(null)} onClaim={handleClaimUnlisted} claiming={claiming} />
    </div>
  );
};

export default PropertyMap;
