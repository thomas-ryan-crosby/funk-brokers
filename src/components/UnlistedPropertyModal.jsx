import { useState, useEffect } from 'react';
import './UnlistedPropertyModal.css';

/**
 * @param {{ parcel: { address?, estimate?, lastSaleDate?, lastSalePrice?, beds?, baths?, squareFeet? } | null, onClose: () => void, onClaim?: (parcel) => void, claiming?: boolean }}
 */
const UnlistedPropertyModal = ({ parcel, onClose, onClaim, claiming = false }) => {
  const [confirmed, setConfirmed] = useState(false);
  const [showConfirmStep, setShowConfirmStep] = useState(false);

  useEffect(() => {
    if (!parcel) {
      setConfirmed(false);
      setShowConfirmStep(false);
    }
  }, [parcel]);

  if (!parcel) return null;

  const { address } = parcel;

  const handleClaimClick = () => {
    if (claiming || !confirmed) return;
    setShowConfirmStep(true);
  };

  const handleConfirmOwnership = () => {
    if (claiming) return;
    if (typeof onClaim === 'function') onClaim(parcel);
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

          <label className="unlisted-property-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              aria-describedby="unlisted-property-confirm-desc"
            />
            <span id="unlisted-property-confirm-desc">I confirm I am the owner or have authority to claim this property.</span>
          </label>
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
