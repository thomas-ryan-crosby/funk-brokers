import './ViewOfferModal.css';

const formatDate = (v) => {
  if (!v) return '—';
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d?.getTime()) ? '—' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatFinancing = (v) => {
  const map = { cash: 'Cash', conventional: 'Conventional', fha: 'FHA', va: 'VA', usda: 'USDA' };
  return map[v] || (v || '').replace(/-/g, ' ') || '—';
};

const formatEarnestDue = (v) => {
  const map = { upon_acceptance: 'Upon acceptance', within_3_business_days: 'Within 3 business days of acceptance', within_5_business_days: 'Within 5 business days of acceptance', at_closing: 'At closing' };
  return map[v] || v || '—';
};

const formatPossession = (v) => {
  const map = { at_closing: 'At closing', upon_recording: 'Upon recording', other: 'Other (see message)' };
  return map[v] || v || '—';
};

const ViewOfferModal = ({ offer, property, onClose, formatCurrency }) => {
  if (!offer) return null;

  const fmt = formatCurrency || ((n) => (n != null && Number.isFinite(n) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) : '—'));
  const c = offer.contingencies || {};

  return (
    <div className="view-offer-overlay" onClick={onClose} role="presentation">
      <div className="view-offer-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="view-offer-title">
        <div className="view-offer-header">
          <h2 id="view-offer-title">Offer Details</h2>
          <button type="button" className="view-offer-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="view-offer-body">
          {property && (
            <section className="view-offer-section">
              <h3>Property</h3>
              <p className="view-offer-address">{[property.address, property.city, property.state].filter(Boolean).join(', ')}</p>
              {property.price != null && <p>Asking price: {fmt(property.price)}</p>}
            </section>
          )}

          <section className="view-offer-section">
            <h3>Buyer</h3>
            <p>{offer.buyerName || '—'}</p>
            {offer.buyerEmail && <p><a href={`mailto:${offer.buyerEmail}`}>{offer.buyerEmail}</a></p>}
            {offer.buyerPhone && <p>{offer.buyerPhone}</p>}
          </section>

          <section className="view-offer-section">
            <h3>Offer Terms</h3>
            <dl className="view-offer-dl">
              <dt>Offer amount</dt><dd>{fmt(offer.offerAmount)}</dd>
              <dt>Earnest money</dt><dd>{fmt(offer.earnestMoney)}{offer.earnestMoneyDue ? ` — due ${formatEarnestDue(offer.earnestMoneyDue)}` : ''}</dd>
              <dt>Proposed closing date</dt><dd>{formatDate(offer.proposedClosingDate)}</dd>
              <dt>Financing type</dt><dd>{formatFinancing(offer.financingType)}{offer.downPayment != null && offer.financingType !== 'cash' ? `, ${offer.downPayment}% down` : ''}</dd>
              {offer.possession && <><dt>Possession</dt><dd>{formatPossession(offer.possession)}</dd></>}
            </dl>
          </section>

          <section className="view-offer-section">
            <h3>Contingencies</h3>
            <dl className="view-offer-dl">
              <dt>Inspection</dt>
              <dd>{c.inspection?.included ? `Yes (${c.inspection.days ?? '—'} days)` : 'No'}</dd>
              <dt>Financing</dt>
              <dd>{c.financing?.included ? `Yes (${c.financing.days ?? '—'} days)` : 'No'}</dd>
              <dt>Appraisal</dt>
              <dd>{c.appraisal?.included ? 'Yes' : 'No'}</dd>
              <dt>Home sale</dt>
              <dd>{c.homeSale?.included ? 'Yes' : 'No'}</dd>
            </dl>
          </section>

          {offer.inclusions?.trim() && (
            <section className="view-offer-section">
              <h3>Inclusions</h3>
              <p className="view-offer-message">{offer.inclusions}</p>
            </section>
          )}

          {offer.message?.trim() && (
            <section className="view-offer-section">
              <h3>Message</h3>
              <p className="view-offer-message">{offer.message}</p>
            </section>
          )}

          <section className="view-offer-section view-offer-meta">
            <p>Status: <strong>{(offer.status || '—').replace(/_/g, ' ')}</strong></p>
            <p>Submitted: {formatDate(offer.createdAt)}</p>
          </section>
        </div>

        <div className="view-offer-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewOfferModal;
