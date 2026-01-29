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
  if (!parcel) return null;

  const { address, estimate, lastSaleDate, lastSalePrice, beds, baths, squareFeet } = parcel;
  const hasDetails = [beds, baths, squareFeet].some((v) => v != null && v !== '');

  const handleClaim = () => {
    if (claiming) return;
    if (typeof onClaim === 'function') onClaim(parcel);
    onClose();
  };

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

          <p className="unlisted-property-authority">
            I directly own or have authority to claim this property.
          </p>
          <p className="unlisted-property-disclaimer">Funk Estimate and last sale are from public records. Not an appraisal.</p>
        </div>

        <div className="unlisted-property-footer">
          <button type="button" className="unlisted-property-claim-btn" onClick={handleClaim} disabled={claiming}>
            {claiming ? 'Claiming…' : 'Claim property'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnlistedPropertyModal;
