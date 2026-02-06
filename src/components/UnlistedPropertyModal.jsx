import { useState, useEffect } from 'react';
import { lookupParcelByLocation } from '../services/parcelService';
import './UnlistedPropertyModal.css';

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

/**
 * @param {{ parcel: { address?, estimate?, lastSaleDate?, lastSalePrice?, beds?, baths?, squareFeet? } | null, onClose: () => void, onClaim?: (parcel) => void, claiming?: boolean }}
 */
const UnlistedPropertyModal = ({ parcel, onClose, onClaim, claiming = false }) => {
  const [confirmed, setConfirmed] = useState(false);
  const [showConfirmStep, setShowConfirmStep] = useState(false);
  const [attomData, setAttomData] = useState(null);
  const [attomLoading, setAttomLoading] = useState(false);

  useEffect(() => {
    if (!parcel) {
      setAttomData(null);
      setAttomLoading(false);
      return;
    }
    // If parcel already has ATTOM details (e.g. from Home search), skip lookup
    if (parcel.attomId || parcel.estimate != null || parcel.beds != null) {
      setAttomData(parcel);
      return;
    }
    // OpenAddresses pin — only has address + lat/lng. Fetch ATTOM on demand.
    const { latitude, longitude, address } = parcel;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    setAttomLoading(true);
    lookupParcelByLocation({ latitude, longitude, address })
      .then(({ parcel: attomParcel }) => {
        setAttomData(attomParcel || null);
      })
      .catch(() => {
        setAttomData(null);
      })
      .finally(() => setAttomLoading(false));
  }, [parcel]);

  if (!parcel) return null;

  const merged = { ...parcel, ...attomData };
  const { address, estimate, lastSaleDate, lastSalePrice, beds, baths, squareFeet } = merged;
  const hasDetails = [beds, baths, squareFeet].some((v) => v != null && v !== '');

  const handleClaimClick = () => {
    if (claiming || !confirmed) return;
    setShowConfirmStep(true);
  };

  const handleConfirmOwnership = () => {
    if (claiming) return;
    if (typeof onClaim === 'function') onClaim(merged);
    onClose();
  };

  const handleBackFromConfirm = () => {
    setShowConfirmStep(false);
  };

  // Second step: explicit "Confirm you are owner/authorized" modal
  if (showConfirmStep) {
    return (
      <div className="unlisted-property-overlay" onClick={handleBackFromConfirm} role="presentation">
        <div className="unlisted-property-modal unlisted-property-modal--confirm" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="unlisted-property-confirm-title">
          <div className="unlisted-property-header">
            <h2 id="unlisted-property-confirm-title">Confirm ownership</h2>
            <button type="button" className="unlisted-property-close" onClick={handleBackFromConfirm} aria-label="Close">&times;</button>
          </div>
          <div className="unlisted-property-body">
            <p className="unlisted-property-confirm-prompt">
              Are you the owner or otherwise authorized to claim <strong>{address || 'this property'}</strong>?
            </p>
            <p className="unlisted-property-disclaimer">By confirming, you attest that you have the legal right to list or manage this property.</p>
          </div>
          <div className="unlisted-property-footer unlisted-property-footer--actions">
            <button type="button" className="btn btn-outline" onClick={handleBackFromConfirm}>Back</button>
            <button type="button" className="unlisted-property-claim-btn" onClick={handleConfirmOwnership} disabled={claiming}>
              {claiming ? 'Claiming…' : 'Yes, I am the owner or authorized'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="unlisted-property-overlay" onClick={onClose} role="presentation">
      <div className="unlisted-property-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="unlisted-property-title">
        <div className="unlisted-property-header">
          <h2 id="unlisted-property-title">Claim this property</h2>
          <button type="button" className="unlisted-property-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="unlisted-property-body">
          <p className="unlisted-property-address">{address || 'Address unknown'}</p>
          <span className="unlisted-property-badge">Unlisted</span>

          {attomLoading ? (
            <p className="unlisted-property-loading">Loading property details…</p>
          ) : (
            <>
              <dl className="unlisted-property-dl">
                <dt>Funk Estimate</dt>
                <dd>{formatPrice(estimate)}</dd>
                <dt>Last sale</dt>
                <dd>{formatLastSale(lastSaleDate, lastSalePrice)}</dd>
              </dl>

              {hasDetails && (
                <dl className="unlisted-property-dl unlisted-property-dl--details">
                  {beds != null && beds !== '' && <><dt>Beds</dt><dd>{beds}</dd></>}
                  {baths != null && baths !== '' && <><dt>Baths</dt><dd>{baths}</dd></>}
                  {squareFeet != null && squareFeet !== '' && <><dt>Sq ft</dt><dd>{Number(squareFeet).toLocaleString()}</dd></>}
                </dl>
              )}
            </>
          )}

          <label className="unlisted-property-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              aria-describedby="unlisted-property-confirm-desc"
            />
            <span id="unlisted-property-confirm-desc">I confirm I am the owner or have authority to claim this property.</span>
          </label>
          <p className="unlisted-property-disclaimer">Funk Estimate and last sale are from public records. Not an appraisal.</p>
        </div>

        <div className="unlisted-property-footer">
          <button type="button" className="unlisted-property-claim-btn" onClick={handleClaimClick} disabled={claiming || !confirmed}>
            {claiming ? 'Claiming…' : 'Claim property'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnlistedPropertyModal;
