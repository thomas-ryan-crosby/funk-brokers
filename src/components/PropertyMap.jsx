import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadGooglePlaces } from '../utils/loadGooglePlaces';
import { getParcelsInViewport } from '../services/parcelService';
import UnlistedPropertyModal from './UnlistedPropertyModal';
import './PropertyMap.css';

const LISTED_COLOR = '#059669';
const UNLISTED_COLOR = '#64748b';

const DEFAULT_CENTER = { lat: 39.5, lng: -98.5 };
const DEFAULT_ZOOM = 4;
const DEDUP_DEG = 0.0001;

const formatPrice = (n) =>
  n != null && Number.isFinite(n)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
    : '—';

const formatLastSaleDate = (s) => {
  if (!s || typeof s !== 'string') return '';
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (m) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
  }
  return String(s).slice(0, 10);
};

const formatLastSale = (date, price) => {
  const d = date ? formatLastSaleDate(date) : '';
  const p = price != null && Number.isFinite(price) ? formatPrice(price) : '';
  if (!d && !p) return '—';
  if (d && p) return `${d} · ${p}`;
  return d || p;
};

const unlistedTooltipContent = (p) => `
  <div class="property-map-unlisted-tooltip">
    <div class="property-map-unlisted-tooltip__address">${(p.address || 'Address unknown').replace(/</g, '&lt;')}</div>
    <div class="property-map-unlisted-tooltip__badge">Unlisted</div>
    <div class="property-map-unlisted-tooltip__row">Funk Estimate: ${formatPrice(p.estimate)}</div>
    <div class="property-map-unlisted-tooltip__row">Last sale: ${formatLastSale(p.lastSaleDate, p.lastSalePrice)}</div>
  </div>
`;

const PropertyMap = ({ properties = [], onPropertiesInView }) => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const unlistedMarkersRef = useRef([]);
  const unlistedTooltipRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [unlistedParcels, setUnlistedParcels] = useState([]);
  const [selectedUnlistedParcel, setSelectedUnlistedParcel] = useState(null);

  const handleClaimUnlisted = (parcel) => {
    setSelectedUnlistedParcel(null);
    const state = {
      claimAddress: parcel?.address,
      claimLat: parcel?.latitude,
      claimLng: parcel?.longitude,
    };
    if (parcel?.beds != null && Number.isFinite(Number(parcel.beds))) state.claimBeds = Number(parcel.beds);
    if (parcel?.baths != null && Number.isFinite(Number(parcel.baths))) state.claimBaths = Number(parcel.baths);
    if (parcel?.squareFeet != null && Number.isFinite(Number(parcel.squareFeet))) state.claimSquareFeet = Number(parcel.squareFeet);
    if (parcel?.estimate != null && Number.isFinite(Number(parcel.estimate))) state.claimEstimate = Number(parcel.estimate);
    navigate('/list-property', { state });
  };

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
      const marker = new window.google.maps.Marker({
        position: pos,
        map,
        property: p,
        zIndex: 2,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: LISTED_COLOR,
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 1.5
        }
      });
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
      if (typeof onPropertiesInView === 'function') {
        const b = map.getBounds();
        if (b) {
          const inView = withCoords.filter((p) => b.contains({ lat: p.latitude, lng: p.longitude }));
          onPropertiesInView(inView);
        }
      }
      const zoom = map.getZoom();
      // Unlisted parcels when zoomed in (~10–20 acres on screen). Zoom 18 shows sooner than 19.
      if (zoom == null || zoom < 18) {
        setUnlistedParcels([]);
        return;
      }
      const b = map.getBounds();
      if (!b) return;
      getParcelsInViewport(b)
        .then(({ parcels }) => setUnlistedParcels(parcels || []))
        .catch(() => setUnlistedParcels([]));
    };

    const idleListener = map.addListener('idle', updatePropertiesInView);
    updatePropertiesInView();

    return () => {
      if (idleListener && window.google?.maps?.event?.removeListener) {
        window.google.maps.event.removeListener(idleListener);
      }
    };
  }, [ready, properties, onPropertiesInView]);

  // Unlisted markers (circle) + hover tooltip; dedup against listed
  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !window.google?.maps) return;
    const map = mapInstanceRef.current;

    unlistedMarkersRef.current.forEach((m) => m.setMap(null));
    unlistedMarkersRef.current = [];

    const withCoords = (properties || []).filter(
      (p) => typeof p.latitude === 'number' && typeof p.longitude === 'number'
    );
    const isListed = (lat, lng) =>
      withCoords.some(
        (c) => Math.abs(c.latitude - lat) < DEDUP_DEG && Math.abs(c.longitude - lng) < DEDUP_DEG
      );
    const parcels = (unlistedParcels || []).filter((p) => !isListed(p.latitude, p.longitude));

    if (!unlistedTooltipRef.current) {
      unlistedTooltipRef.current = new window.google.maps.InfoWindow();
    }
    const tip = unlistedTooltipRef.current;

    parcels.forEach((p) => {
      const marker = new window.google.maps.Marker({
        position: { lat: p.latitude, lng: p.longitude },
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#64748b',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 1
        },
        zIndex: 1
      });
      marker.parcel = p;

      marker.addListener('mouseover', () => {
        tip.setContent(unlistedTooltipContent(p));
        tip.open(map, marker);
      });
      marker.addListener('mouseout', () => {
        tip.close();
      });
      marker.addListener('click', () => {
        tip.close();
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
      <UnlistedPropertyModal parcel={selectedUnlistedParcel} onClose={() => setSelectedUnlistedParcel(null)} onClaim={handleClaimUnlisted} />
    </div>
  );
};

export default PropertyMap;
