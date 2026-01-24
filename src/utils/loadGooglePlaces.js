/**
 * Load the Google Maps JavaScript API with Places, using the recommended
 * loading=async + callback pattern. See:
 * https://developers.google.com/maps/documentation/javascript/load-maps-js-api
 *
 * Requires in Google Cloud Console:
 * - Maps JavaScript API (enabled)
 * - Places API (enabled)
 *
 * ApiNotActivatedMapError: one or both APIs are not enabled for the API key's project.
 * ApiTargetBlockedMapError: the API key's "Application restrictions" (HTTP referrers)
 *   block this origin. Add your production URL, e.g.:
 *   https://thomas-ryan-crosby.github.io/funk-brokers/*
 *   (and optionally http://localhost:* for dev) under Credentials → your key → HTTP referrers.
 *
 * Note: google.maps.places.Autocomplete is legacy; PlaceAutocompleteElement is
 * recommended for new work. We keep Autocomplete for compatibility.
 * https://developers.google.com/maps/documentation/javascript/places-migration-overview
 */

import { firebaseConfig } from '../config/firebase-config';

export const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || firebaseConfig?.apiKey;

let loadPromise = null;

export function loadGooglePlaces() {
  if (typeof window !== 'undefined' && window.google?.maps?.places) return Promise.resolve();
  if (!API_KEY) return Promise.reject(new Error('No Google Maps API key'));
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const callbackName = 'funk_gmaps_loaded_' + Date.now();
    window[callbackName] = () => {
      delete window[callbackName];
      resolve();
    };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&loading=async&callback=${callbackName}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      delete window[callbackName];
      reject(new Error('Failed to load Google Places'));
    };
    document.head.appendChild(s);
  });

  return loadPromise;
}
