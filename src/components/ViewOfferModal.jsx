import './ViewOfferModal.css';

const formatDate = (v) => {
  if (!v) return '—';
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d?.getTime()) ? '—' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatFinancing = (v) => {
  const map = { cash: 'Cash', conventional: 'Conventional', fha: 'FHA', va: 'VA', usda: 'USDA', assumption: 'Assumption', seller_carryback: 'Seller Carryback' };
  return map[v] || (v || '').replace(/-/g, ' ') || '—';
};

const formatEarnestDue = (v) => {
  const map = { upon_acceptance: 'Upon acceptance', within_3_business_days: 'Within 3 business days of acceptance', within_5_business_days: 'Within 5 business days of acceptance', at_closing: 'At closing' };
  return map[v] || v || '—';
};

const formatEarnestForm = (v) => {
  const map = { personal_check: 'Personal Check', wire_transfer: 'Wire Transfer', other: 'Other' };
  return map[v] || v || '—';
};

const formatEarnestDepositedWith = (v) => {
  const map = { escrow_company: 'Escrow Company', brokers_trust_account: "Broker's Trust Account" };
  return map[v] || v || '—';
};

const formatPossession = (v) => {
  const map = { at_closing: 'At closing', upon_recording: 'Upon recording', other: 'Other (see message)' };
  return map[v] || v || '—';
};

const formatAppraisalPaidBy = (v) => {
  const map = { buyer: 'Buyer', seller: 'Seller', other: 'Other' };
  return map[v] || v || '—';
};

const toDateStr = (v) => {
  if (!v) return '—';
  const d = typeof v === 'string' ? new Date(v) : (v?.toDate ? v.toDate() : new Date(v));
  return Number.isNaN(d?.getTime()) ? '—' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
            <h3>1. Property &amp; Purchase Price</h3>
            <dl className="view-offer-dl">
              <dt>Full purchase price</dt><dd>{fmt(offer.offerAmount)}</dd>
              <dt>Earnest money</dt><dd>{fmt(offer.earnestMoney)}{offer.earnestMoneyForm ? ` — ${formatEarnestForm(offer.earnestMoneyForm)}` : ''}{offer.earnestMoneyDepositedWith ? `, deposited with ${formatEarnestDepositedWith(offer.earnestMoneyDepositedWith)}` : ''}{offer.earnestMoneyDue ? `, due ${formatEarnestDue(offer.earnestMoneyDue)}` : ''}</dd>
              <dt>COE date</dt><dd>{formatDate(offer.proposedClosingDate)}</dd>
              <dt>Possession</dt><dd>{formatPossession(offer.possession)}</dd>
            </dl>
          </section>

          <section className="view-offer-section">
            <h3>2. Financing</h3>
            <dl className="view-offer-dl">
              <dt>Type</dt><dd>{formatFinancing(offer.financingType)}{offer.downPayment != null && !['cash', 'assumption', 'seller_carryback'].includes(offer.financingType) ? `, ${offer.downPayment}% down` : ''}</dd>
              {offer.sellerConcessions && <><dt>Seller concessions</dt><dd>{offer.sellerConcessions.type === 'percent' ? `${offer.sellerConcessions.value}% of purchase price` : fmt(offer.sellerConcessions.value)}</dd></>}
            </dl>
          </section>

          <section className="view-offer-section">
            <h3>6. Contingencies</h3>
            <dl className="view-offer-dl">
              <dt>Inspection</dt>
              <dd>{c.inspection?.included ? `Yes (${c.inspection.days ?? '—'} days)` : 'No'}</dd>
              <dt>Financing</dt>
              <dd>{c.financing?.included ? `Yes (${c.financing.days ?? '—'} days)` : 'No'}</dd>
              <dt>Appraisal</dt>
              <dd>{c.appraisal?.included ? (c.appraisal.paidBy ? `Yes (fee paid by ${formatAppraisalPaidBy(c.appraisal.paidBy)})` : 'Yes') : 'No'}</dd>
              <dt>Home sale</dt>
              <dd>{c.homeSale?.included ? 'Yes' : 'No'}</dd>
            </dl>
          </section>

          {(offer.offerExpirationDate || offer.offerExpirationTime) && (
            <section className="view-offer-section">
              <h3>Terms of Acceptance</h3>
              <dl className="view-offer-dl">
                <dt>Offer expires</dt><dd>{offer.offerExpirationDate ? toDateStr(offer.offerExpirationDate) : '—'}{offer.offerExpirationTime ? ` at ${offer.offerExpirationTime}` : ''}</dd>
              </dl>
            </section>
          )}

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

          {(offer.disclosureAcknowledgedAt || offer.disclosureAcknowledgedByName) && (
            <section className="view-offer-section view-offer-disclosure-verification">
              <h3>Disclosure acknowledgment</h3>
              <p className="view-offer-disclosure-text">
                Buyer acknowledged and accepted the required disclosures
                {offer.disclosureAcknowledgedAt && ` on ${formatDate(offer.disclosureAcknowledgedAt)}`}.
                {offer.disclosureAcknowledgedByName && ` Signed by ${offer.disclosureAcknowledgedByName}.`}
              </p>
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
