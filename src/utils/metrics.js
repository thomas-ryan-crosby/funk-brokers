/**
 * Lightweight client-side metrics for cost/performance visibility.
 * In-memory only; no network by default. Use logSummary() or getSummary() for debugging.
 * Records: Firestore read/write counts, ATTOM proxy calls, Places usage, Storage bytes, latencies.
 */

const MAX_LATENCY_SAMPLES = 100;

const state = {
  firestoreReads: 0,
  firestoreWrites: 0,
  readsByFeature: { map: 0, feed: 0, propertyDetail: 0, propertiesBrowse: 0, other: 0 },
  attomCalls: { mapParcels: 0, resolveAddress: 0, propertySnapshot: 0 },
  placesCalls: 0,
  storageUploadBytes: 0,
  storageDownloadBytes: 0,
  storageUploadCount: 0,
  storageDownloadCount: 0,
  latencies: {
    mapPins: [],
    propertyDetail: [],
    feed: [],
  },
};

function addLatency(operation, ms) {
  const arr = state.latencies[operation];
  if (!Array.isArray(arr)) return;
  arr.push(ms);
  if (arr.length > MAX_LATENCY_SAMPLES) arr.shift();
}

function p95(arr) {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)];
}

export const metrics = {
  recordFirestoreRead(n = 1) {
    state.firestoreReads += n;
  },

  recordFirestoreWrite(n = 1) {
    state.firestoreWrites += n;
  },

  recordAttomCall(route, latencyMs) {
    if (state.attomCalls[route] !== undefined) state.attomCalls[route]++;
    if (typeof latencyMs === 'number' && route === 'mapParcels') addLatency('mapPins', latencyMs);
  },

  recordPlacesCall() {
    state.placesCalls++;
  },

  recordStorageUpload(bytes = 0) {
    state.storageUploadBytes += bytes;
    state.storageUploadCount++;
  },

  recordStorageDownload(bytes = 0) {
    state.storageDownloadBytes += bytes;
    state.storageDownloadCount++;
  },

  recordLatency(operation, ms) {
    if (typeof ms !== 'number') return;
    addLatency(operation, ms);
  },

  getP95(operation) {
    return p95(state.latencies[operation] || []);
  },

  getReadsByFeature() {
    return { ...state.readsByFeature };
  },

  getSummary() {
    return {
      firestoreReads: state.firestoreReads,
      firestoreWrites: state.firestoreWrites,
      readsByFeature: this.getReadsByFeature(),
      attomCalls: { ...state.attomCalls },
      placesCalls: state.placesCalls,
      storageUploadBytes: state.storageUploadBytes,
      storageDownloadBytes: state.storageDownloadBytes,
      storageUploadCount: state.storageUploadCount,
      storageDownloadCount: state.storageDownloadCount,
      p95Ms: {
        mapPins: this.getP95('mapPins'),
        propertyDetail: this.getP95('propertyDetail'),
        feed: this.getP95('feed'),
      },
    };
  },

  logSummary() {
    if (typeof console !== 'undefined' && console.info) {
      console.info('[metrics]', JSON.stringify(this.getSummary(), null, 2));
    }
  },

  reset() {
    state.firestoreReads = 0;
    state.firestoreWrites = 0;
    state.readsByFeature = { map: 0, feed: 0, propertyDetail: 0, propertiesBrowse: 0, other: 0 };
    state.attomCalls = { mapParcels: 0, resolveAddress: 0, propertySnapshot: 0 };
    state.placesCalls = 0;
    state.storageUploadBytes = 0;
    state.storageDownloadBytes = 0;
    state.storageUploadCount = 0;
    state.storageDownloadCount = 0;
    state.latencies = { mapPins: [], propertyDetail: [], feed: [] };
  },
};

export default metrics;
