import { useState, useEffect } from 'react';
import { getOfferById } from '../services/offerService';
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

/** Build list of { label, original, current } for LOI fields that changed. */
function getLoiDiff(original, current, formatCurrency) {
  const fmt = formatCurrency || ((n) => (n != null && Number.isFinite(n) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) : String(n ?? '—')));
  const rows = [];
  const push = (label, origVal, currVal) => {
    const o = origVal === true || origVal === false ? (origVal ? 'Yes' : 'No') : (origVal ?? '—');
    const c = currVal === true || currVal === false ? (currVal ? 'Yes' : 'No') : (currVal ?? '—');
    if (String(o) !== String(c)) rows.push({ label, original: o, current: c });
  };
  const pushCurrency = (label, origVal, currVal) => {
    if (origVal === currVal) return;
    rows.push({ label, original: fmt(origVal), current: fmt(currVal) });
  };
  const o = original || {};
  const c = current || {};
  push('Seller name', o.parties?.seller_name, c.parties?.seller_name);
  push('Buyer name', o.parties?.buyer_name, c.parties?.buyer_name);
  push('Property address', [o.property?.street_address, o.property?.city, o.property?.state, o.property?.zip].filter(Boolean).join(', '), [c.property?.street_address, c.property?.city, c.property?.state, c.property?.zip].filter(Boolean).join(', '));
  pushCurrency('Purchase price', o.economic_terms?.purchase_price, c.economic_terms?.purchase_price);
  pushCurrency('Earnest money', o.economic_terms?.earnest_money?.amount, c.economic_terms?.earnest_money?.amount);
  push('Earnest money due upon PSA execution', o.economic_terms?.earnest_money?.due_upon_psa_execution, c.economic_terms?.earnest_money?.due_upon_psa_execution);
  push('Target closing (days after PSA)', o.timeline?.target_closing_days_after_psa, c.timeline?.target_closing_days_after_psa);
  push('Due diligence (days)', o.timeline?.due_diligence_days, c.timeline?.due_diligence_days);
  push('Anticipated financing', o.financing?.anticipated_financing, c.financing?.anticipated_financing);
  push('Anticipated all cash', o.financing?.anticipated_all_cash, c.financing?.anticipated_all_cash);
  push('Anticipated as-is purchase', o.condition_of_sale?.anticipated_as_is_purchase, c.condition_of_sale?.anticipated_as_is_purchase);
  push('Subject to inspections', o.condition_of_sale?.subject_to_inspections, c.condition_of_sale?.subject_to_inspections);
  push('Assignment contemplated', o.assignment?.assignment_contemplated, c.assignment?.assignment_contemplated);
  push('Affiliate assignment allowed', o.assignment?.affiliate_assignment_allowed, c.assignment?.affiliate_assignment_allowed);
  push('Exclusive', o.exclusivity?.exclusive, c.exclusivity?.exclusive);
  push('Exclusivity period (days)', o.exclusivity?.exclusivity_period_days, c.exclusivity?.exclusivity_period_days);
  push('Non-binding', o.legal?.non_binding, c.legal?.non_binding);
  push('Governing law', o.legal?.governing_law, c.legal?.governing_law);
  return rows;
}

/** Build list of { label, original, current } for PSA/offer fields that changed. */
function getOfferDiff(original, current, formatCurrency, formatDateFn) {
  const fmt = formatCurrency || ((n) => (n != null && Number.isFinite(n) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) : String(n ?? '—')));
  const toStr = (v) => (v == null || v === '') ? '—' : String(v);
  const rows = [];
  const push = (label, origVal, currVal) => {
    const o = toStr(origVal);
    const c = toStr(currVal);
    if (o !== c) rows.push({ label, original: o, current: c });
  };
  const o = original || {};
  const c = current || {};
  if (o.offerAmount !== c.offerAmount) rows.push({ label: 'Offer amount', original: fmt(o.offerAmount), current: fmt(c.offerAmount) });
  if ((o.earnestMoney ?? o.earnestMoney) !== (c.earnestMoney ?? c.earnestMoney)) rows.push({ label: 'Earnest money', original: fmt(o.earnestMoney), current: fmt(c.earnestMoney) });
  push('EM form', o.earnestMoneyForm, c.earnestMoneyForm);
  push('EM deposited with', o.earnestMoneyDepositedWith, c.earnestMoneyDepositedWith);
  push('Earnest money due', o.earnestMoneyDue, c.earnestMoneyDue);
  const oClosing = o.proposedClosingDate?.toDate ? o.proposedClosingDate.toDate() : (o.proposedClosingDate ? new Date(o.proposedClosingDate) : null);
  const cClosing = c.proposedClosingDate?.toDate ? c.proposedClosingDate.toDate() : (c.proposedClosingDate ? new Date(c.proposedClosingDate) : null);
  if (formatDateFn && (oClosing?.getTime() !== cClosing?.getTime())) rows.push({ label: 'COE date', original: formatDateFn(o.proposedClosingDate), current: formatDateFn(c.proposedClosingDate) });
  push('Financing', o.financingType, c.financingType);
  push('Down payment (%)', o.downPayment, c.downPayment);
  if (JSON.stringify(o.sellerConcessions || {}) !== JSON.stringify(c.sellerConcessions || {})) {
    const os = o.sellerConcessions;
    const cs = c.sellerConcessions;
    rows.push({ label: 'Seller concessions', original: os ? (os.type === 'percent' ? `${os.value}%` : fmt(os.value)) : '—', current: cs ? (cs.type === 'percent' ? `${cs.value}%` : fmt(cs.value)) : '—' });
  }
  push('Possession', o.possession, c.possession);
  const oInsp = o.contingencies?.inspection;
  const cInsp = c.contingencies?.inspection;
  if ((oInsp?.included !== cInsp?.included) || (oInsp?.days !== cInsp?.days)) rows.push({ label: 'Inspection contingency', original: oInsp?.included ? `Yes (${oInsp?.days ?? '—'} days)` : 'No', current: cInsp?.included ? `Yes (${cInsp?.days ?? '—'} days)` : 'No' });
  const oFin = o.contingencies?.financing;
  const cFin = c.contingencies?.financing;
  if ((oFin?.included !== cFin?.included) || (oFin?.days !== cFin?.days)) rows.push({ label: 'Financing contingency', original: oFin?.included ? `Yes (${oFin?.days ?? '—'} days)` : 'No', current: cFin?.included ? `Yes (${cFin?.days ?? '—'} days)` : 'No' });
  push('Inclusions', o.inclusions?.trim(), c.inclusions?.trim());
  push('Offer expires (date)', o.offerExpirationDate, c.offerExpirationDate);
  push('Offer expires (time)', o.offerExpirationTime, c.offerExpirationTime);
  push('Message', o.message?.trim(), c.message?.trim());
  return rows;
}

const ViewOfferModal = ({ offer, property, onClose, formatCurrency }) => {
  const [showDiffReport, setShowDiffReport] = useState(false);
  const [originalOffer, setOriginalOffer] = useState(null);

  useEffect(() => {
    if (!offer?.counterToOfferId) {
      setOriginalOffer(null);
      setShowDiffReport(false);
      return;
    }
    let cancelled = false;
    getOfferById(offer.counterToOfferId)
      .then((orig) => { if (!cancelled) setOriginalOffer(orig); })
      .catch(() => { if (!cancelled) setOriginalOffer(null); });
    return () => { cancelled = true; };
  }, [offer?.id, offer?.counterToOfferId]);

  if (!offer) return null;

  const fmt = formatCurrency || ((n) => (n != null && Number.isFinite(n) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) : '—'));
  const c = offer.contingencies || {};
  const isLoi = offer.offerType === 'loi';
  const loi = offer.loi || {};
  const isCounter = !!offer.counterToOfferId;
  const diffRows = isCounter && originalOffer
    ? (isLoi ? getLoiDiff(originalOffer.loi, offer.loi, fmt) : getOfferDiff(originalOffer, offer, fmt, formatDate))
    : [];

  return (
    <div className="view-offer-overlay" onClick={onClose} role="presentation">
      <div className="view-offer-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="view-offer-title">
        <div className="view-offer-header">
          <h2 id="view-offer-title">{isLoi ? 'LOI Details' : 'Offer Details'}{isCounter ? ' (Counter)' : ''}</h2>
          <button type="button" className="view-offer-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        {isCounter && originalOffer != null && (
          <div className="view-offer-diff-toggle">
            <label className="view-offer-diff-toggle-label">
              <input
                type="checkbox"
                checked={showDiffReport}
                onChange={(e) => setShowDiffReport(e.target.checked)}
              />
              <span>Show diff report</span>
            </label>
          </div>
        )}

        <div className="view-offer-body">
          {showDiffReport && isCounter && originalOffer != null && (
            <section className="view-offer-section view-offer-diff">
              <h3>Changes from original</h3>
              {diffRows.length === 0 ? (
                <p className="view-offer-diff-none">No changes from the original {isLoi ? 'LOI' : 'offer'}.</p>
              ) : (
                <ul className="view-offer-diff-list">
                  {diffRows.map((row, i) => (
                    <li key={i} className="view-offer-diff-row">
                      <span className="view-offer-diff-label">{row.label}</span>
                      <span className="view-offer-diff-original">{row.original}</span>
                      <span className="view-offer-diff-arrow">→</span>
                      <span className="view-offer-diff-current">{row.current}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {isLoi ? (
            <>
              <section className="view-offer-section">
                <h3>Parties</h3>
                <dl className="view-offer-dl">
                  <dt>Seller</dt><dd>{loi.parties?.seller_name || '—'}</dd>
                  <dt>Buyer</dt><dd>{loi.parties?.buyer_name || offer.buyerName || '—'}</dd>
                </dl>
              </section>
              <section className="view-offer-section">
                <h3>Property</h3>
                <p className="view-offer-address">{[loi.property?.street_address, loi.property?.city, loi.property?.state, loi.property?.zip].filter(Boolean).join(', ') || (property && [property.address, property.city, property.state].filter(Boolean).join(', ')) || '—'}</p>
              </section>
              <section className="view-offer-section">
                <h3>Economic Terms</h3>
                <dl className="view-offer-dl">
                  <dt>Purchase price</dt><dd>{fmt(loi.economic_terms?.purchase_price ?? offer.offerAmount)}</dd>
                  <dt>Earnest money</dt><dd>{fmt(loi.economic_terms?.earnest_money?.amount)} — due upon PSA execution: {loi.economic_terms?.earnest_money?.due_upon_psa_execution ? 'Yes' : 'No'}</dd>
                </dl>
              </section>
              <section className="view-offer-section">
                <h3>Timeline</h3>
                <dl className="view-offer-dl">
                  <dt>Target closing (days after PSA)</dt><dd>{loi.timeline?.target_closing_days_after_psa ?? '—'}</dd>
                  <dt>Due diligence (days)</dt><dd>{loi.timeline?.due_diligence_days ?? '—'}</dd>
                </dl>
              </section>
              <section className="view-offer-section">
                <h3>Financing &amp; Condition</h3>
                <dl className="view-offer-dl">
                  <dt>Anticipated financing</dt><dd>{loi.financing?.anticipated_financing ? 'Yes' : 'No'}</dd>
                  <dt>Anticipated all cash</dt><dd>{loi.financing?.anticipated_all_cash ? 'Yes' : 'No'}</dd>
                  <dt>Anticipated as-is purchase</dt><dd>{loi.condition_of_sale?.anticipated_as_is_purchase ? 'Yes' : 'No'}</dd>
                  <dt>Subject to inspections</dt><dd>{loi.condition_of_sale?.subject_to_inspections ? 'Yes' : 'No'}</dd>
                </dl>
              </section>
              <section className="view-offer-section">
                <h3>Assignment &amp; Exclusivity</h3>
                <dl className="view-offer-dl">
                  <dt>Assignment contemplated</dt><dd>{loi.assignment?.assignment_contemplated ? 'Yes' : 'No'}</dd>
                  <dt>Exclusive</dt><dd>{loi.exclusivity?.exclusive ? `Yes (${loi.exclusivity?.exclusivity_period_days ?? '—'} days)` : 'No'}</dd>
                </dl>
              </section>
              <section className="view-offer-section">
                <h3>Legal</h3>
                <dl className="view-offer-dl">
                  <dt>Non-binding (except specified sections)</dt><dd>{loi.legal?.non_binding ? 'Yes' : 'No'}</dd>
                  <dt>Governing law</dt><dd>{loi.legal?.governing_law || '—'}</dd>
                </dl>
              </section>
            </>
          ) : (
            <>
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
            </>
          )}

          <section className="view-offer-section view-offer-meta">
            <p>Status: <strong>{(offer.status || '—').replace(/_/g, ' ')}</strong></p>
            <p>{isLoi ? 'LOI sent' : 'Submitted'}: {formatDate(offer.createdAt)}</p>
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
