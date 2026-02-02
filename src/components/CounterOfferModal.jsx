import { useState, useEffect } from 'react';
import './CounterOfferModal.css';

const toDateStr = (v) => {
  if (!v) return '';
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

const parseNumber = (v) => (v === '' || v == null) ? 0 : (parseFloat(v) || 0);

function setNested(obj, path, value) {
  const parts = path.split('.');
  const next = JSON.parse(JSON.stringify(obj));
  let cur = next;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!(key in cur) || typeof cur[key] !== 'object') cur[key] = {};
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
  return next;
}

function defaultLoi() {
  return {
    loi_metadata: {
      document_type: 'Letter of Intent',
      binding_status: 'non_binding_except_specified_sections',
      version: 'Nationwide LOI v1.0',
      date: null,
    },
    parties: { seller_name: '', buyer_name: '' },
    property: { street_address: '', city: '', state: '', zip: '' },
    economic_terms: {
      purchase_price: 0,
      earnest_money: { amount: 0, due_upon_psa_execution: true },
    },
    timeline: { target_closing_days_after_psa: 0, due_diligence_days: 0 },
    financing: { anticipated_financing: false, anticipated_all_cash: false },
    condition_of_sale: {
      anticipated_as_is_purchase: true,
      subject_to_inspections: true,
    },
    assignment: { assignment_contemplated: false, affiliate_assignment_allowed: false },
    exclusivity: { exclusive: false, exclusivity_period_days: 0 },
    legal: {
      non_binding: true,
      binding_sections: ['governing_law', 'confidentiality', 'exclusivity_if_selected'],
      governing_law: 'property_state',
    },
    acceptance: {
      seller_signature: { signed: false, date: null },
      buyer_signature: { signed: false, date: null },
    },
  };
}

function deepMergeLoi(base, source) {
  if (!source || typeof source !== 'object') return { ...defaultLoi(), ...base };
  const def = defaultLoi();
  const result = JSON.parse(JSON.stringify(def));
  const apply = (target, src) => {
    if (!src || typeof src !== 'object') return;
    Object.keys(src).forEach((k) => {
      if (src[k] != null && typeof src[k] === 'object' && !Array.isArray(src[k]) && !(src[k] instanceof Date)) {
        if (!target[k]) target[k] = {};
        apply(target[k], src[k]);
      } else {
        target[k] = src[k];
      }
    });
  };
  apply(result, source);
  return result;
}

/** Build list of { label, original, current } for LOI fields that changed. */
function getLoiDiff(original, current, formatCurrency) {
  const fmt = formatCurrency || ((n) => (n != null && Number.isFinite(n) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) : String(n ?? '—')));
  const rows = [];
  const push = (label, origVal, currVal) => {
    let o = origVal === true || origVal === false ? (origVal ? 'Yes' : 'No') : (origVal ?? '—');
    let c = currVal === true || currVal === false ? (currVal ? 'Yes' : 'No') : (currVal ?? '—');
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

const CounterOfferModal = ({ offer, property, onClose, onSubmit, formatCurrency }) => {
  const isLoi = offer?.offerType === 'loi';
  const [form, setForm] = useState({
    offerAmount: '',
    earnestMoney: '',
    earnestMoneyForm: 'personal_check',
    earnestMoneyDepositedWith: 'escrow_company',
    earnestMoneyDue: 'within_3_business_days',
    closingDate: '',
    financingType: 'conventional',
    downPayment: '',
    sellerConcessionsPercent: '',
    sellerConcessionsAmount: '',
    possession: 'at_closing',
    inspectionContingency: true,
    inspectionDays: '10',
    financingContingency: true,
    financingDays: '30',
    appraisalContingency: true,
    appraisalPaidBy: 'buyer',
    homeSaleContingency: false,
    inclusions: '',
    offerExpirationDate: '',
    offerExpirationTime: '5:00 p.m.',
    message: '',
  });
  const [loiForm, setLoiForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!offer) return;
    if (isLoi) {
      setLoiForm(deepMergeLoi(defaultLoi(), offer.loi));
      return;
    }
    const c = offer.contingencies || {};
    const sc = offer.sellerConcessions;
    setForm({
      offerAmount: offer.offerAmount != null ? String(offer.offerAmount) : '',
      earnestMoney: offer.earnestMoney != null ? String(offer.earnestMoney) : '',
      earnestMoneyForm: offer.earnestMoneyForm || 'personal_check',
      earnestMoneyDepositedWith: offer.earnestMoneyDepositedWith || 'escrow_company',
      earnestMoneyDue: offer.earnestMoneyDue || 'within_3_business_days',
      closingDate: toDateStr(offer.proposedClosingDate) || '',
      financingType: offer.financingType || 'conventional',
      downPayment: offer.downPayment != null ? String(offer.downPayment) : '',
      sellerConcessionsPercent: (sc && sc.type === 'percent') ? String(sc.value) : '',
      sellerConcessionsAmount: (sc && sc.type === 'amount') ? String(sc.value) : '',
      possession: offer.possession || 'at_closing',
      inspectionContingency: c.inspection?.included !== false,
      inspectionDays: c.inspection?.days != null ? String(c.inspection.days) : '10',
      financingContingency: c.financing?.included !== false,
      financingDays: c.financing?.days != null ? String(c.financing.days) : '30',
      appraisalContingency: c.appraisal?.included !== false,
      appraisalPaidBy: c.appraisal?.paidBy || 'buyer',
      homeSaleContingency: c.homeSale?.included === true,
      inclusions: offer.inclusions || '',
      offerExpirationDate: offer.offerExpirationDate ? (typeof offer.offerExpirationDate === 'string' ? offer.offerExpirationDate : toDateStr(offer.offerExpirationDate)) : '',
      offerExpirationTime: offer.offerExpirationTime || '5:00 p.m.',
      message: offer.message || '',
    });
  }, [offer, isLoi]);

  const setLoiPath = (path, value) => {
    setLoiForm((prev) => (prev ? setNested(prev, path, value) : prev));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isLoi && loiForm) {
        const loiToSend = {
          ...loiForm,
          loi_metadata: { ...loiForm.loi_metadata, date: new Date().toISOString().slice(0, 10) },
        };
        await onSubmit({ isLoiCounter: true, loi: loiToSend });
      } else {
        await onSubmit(form);
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to submit counter. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!offer) return null;

  const fmt = formatCurrency || ((n) => (n != null && Number.isFinite(n) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) : '—'));
  const originalLoi = isLoi ? (offer.loi || {}) : null;
  const loiDiff = isLoi && loiForm ? getLoiDiff(originalLoi, loiForm, fmt) : [];

  return (
    <div className="counter-offer-modal-overlay" onClick={onClose} role="presentation">
      <div className="counter-offer-modal counter-offer-modal--loi" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="counter-offer-title">
        <div className="counter-offer-modal-header">
          <h2 id="counter-offer-title">{isLoi ? 'Counter LOI' : 'Counter Offer'}</h2>
          <button type="button" className="counter-offer-modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        {property && (
          <p className="counter-offer-property">
            {[property.address, property.city, property.state].filter(Boolean).join(', ')} — {isLoi ? 'Estimated' : 'Asking'} {fmt(property.funkEstimate ?? property.price)}
          </p>
        )}
        <p className="counter-offer-hint">
          {isLoi ? 'Edit the LOI terms below. Changes from the original are summarized so the buyer can see what you modified.' : 'Adjust the terms below. The buyer will receive this counter.'}
        </p>

        {error && <div className="counter-offer-error">{error}</div>}

        {isLoi && loiForm ? (
          <form onSubmit={handleSubmit} className="counter-offer-form">
            {loiDiff.length > 0 && (
              <section className="counter-offer-diff">
                <h3 className="counter-offer-diff-title">Changes from original LOI</h3>
                <ul className="counter-offer-diff-list">
                  {loiDiff.map((row, i) => (
                    <li key={i} className="counter-offer-diff-row">
                      <span className="counter-offer-diff-label">{row.label}</span>
                      <span className="counter-offer-diff-original">{row.original}</span>
                      <span className="counter-offer-diff-arrow">→</span>
                      <span className="counter-offer-diff-current">{row.current}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="counter-offer-section">
              <h3 className="counter-offer-section-title">Parties</h3>
              <div className="counter-offer-grid">
                <div className="counter-offer-field">
                  <label>Seller name *</label>
                  <input type="text" value={loiForm.parties?.seller_name || ''} onChange={(e) => setLoiPath('parties.seller_name', e.target.value)} required />
                </div>
                <div className="counter-offer-field">
                  <label>Buyer name *</label>
                  <input type="text" value={loiForm.parties?.buyer_name || ''} onChange={(e) => setLoiPath('parties.buyer_name', e.target.value)} required />
                </div>
              </div>
            </div>
            <div className="counter-offer-section">
              <h3 className="counter-offer-section-title">Property</h3>
              <div className="counter-offer-grid">
                <div className="counter-offer-field">
                  <label>Street address *</label>
                  <input type="text" value={loiForm.property?.street_address || ''} onChange={(e) => setLoiPath('property.street_address', e.target.value)} required />
                </div>
                <div className="counter-offer-field">
                  <label>City *</label>
                  <input type="text" value={loiForm.property?.city || ''} onChange={(e) => setLoiPath('property.city', e.target.value)} required />
                </div>
                <div className="counter-offer-field">
                  <label>State *</label>
                  <input type="text" value={loiForm.property?.state || ''} onChange={(e) => setLoiPath('property.state', e.target.value)} required />
                </div>
                <div className="counter-offer-field">
                  <label>ZIP *</label>
                  <input type="text" value={loiForm.property?.zip || ''} onChange={(e) => setLoiPath('property.zip', e.target.value)} required />
                </div>
              </div>
            </div>
            <div className="counter-offer-section">
              <h3 className="counter-offer-section-title">Economic Terms</h3>
              <div className="counter-offer-grid">
                <div className="counter-offer-field">
                  <label>Purchase price ($) *</label>
                  <input type="number" min={0} step={1000} value={loiForm.economic_terms?.purchase_price || ''} onChange={(e) => setLoiPath('economic_terms.purchase_price', parseNumber(e.target.value))} required />
                </div>
                <div className="counter-offer-field">
                  <label>Earnest money ($) *</label>
                  <input type="number" min={0} step={500} value={loiForm.economic_terms?.earnest_money?.amount ?? ''} onChange={(e) => setLoiPath('economic_terms.earnest_money.amount', parseNumber(e.target.value))} required />
                </div>
                <div className="counter-offer-field counter-offer-field--full">
                  <label className="counter-offer-chk">
                    <input type="checkbox" checked={loiForm.economic_terms?.earnest_money?.due_upon_psa_execution !== false} onChange={(e) => setLoiPath('economic_terms.earnest_money.due_upon_psa_execution', e.target.checked)} />
                    <span>Earnest money due upon PSA execution</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="counter-offer-section">
              <h3 className="counter-offer-section-title">Timeline</h3>
              <div className="counter-offer-grid">
                <div className="counter-offer-field">
                  <label>Target closing (days after PSA)</label>
                  <input type="number" min={0} value={loiForm.timeline?.target_closing_days_after_psa ?? ''} onChange={(e) => setLoiPath('timeline.target_closing_days_after_psa', parseNumber(e.target.value))} />
                </div>
                <div className="counter-offer-field">
                  <label>Due diligence (days)</label>
                  <input type="number" min={0} value={loiForm.timeline?.due_diligence_days ?? ''} onChange={(e) => setLoiPath('timeline.due_diligence_days', parseNumber(e.target.value))} />
                </div>
              </div>
            </div>
            <div className="counter-offer-section">
              <h3 className="counter-offer-section-title">Financing</h3>
              <div className="counter-offer-contingencies">
                <label className="counter-offer-chk">
                  <input type="checkbox" checked={!!loiForm.financing?.anticipated_financing} onChange={(e) => setLoiPath('financing.anticipated_financing', e.target.checked)} />
                  <span>Anticipated financing</span>
                </label>
                <label className="counter-offer-chk">
                  <input type="checkbox" checked={!!loiForm.financing?.anticipated_all_cash} onChange={(e) => setLoiPath('financing.anticipated_all_cash', e.target.checked)} />
                  <span>Anticipated all cash</span>
                </label>
              </div>
            </div>
            <div className="counter-offer-section">
              <h3 className="counter-offer-section-title">Condition of Sale</h3>
              <div className="counter-offer-contingencies">
                <label className="counter-offer-chk">
                  <input type="checkbox" checked={!!loiForm.condition_of_sale?.anticipated_as_is_purchase} onChange={(e) => setLoiPath('condition_of_sale.anticipated_as_is_purchase', e.target.checked)} />
                  <span>Anticipated as-is purchase</span>
                </label>
                <label className="counter-offer-chk">
                  <input type="checkbox" checked={!!loiForm.condition_of_sale?.subject_to_inspections} onChange={(e) => setLoiPath('condition_of_sale.subject_to_inspections', e.target.checked)} />
                  <span>Subject to inspections</span>
                </label>
              </div>
            </div>
            <div className="counter-offer-section">
              <h3 className="counter-offer-section-title">Assignment</h3>
              <div className="counter-offer-contingencies">
                <label className="counter-offer-chk">
                  <input type="checkbox" checked={!!loiForm.assignment?.assignment_contemplated} onChange={(e) => setLoiPath('assignment.assignment_contemplated', e.target.checked)} />
                  <span>Assignment contemplated</span>
                </label>
                <label className="counter-offer-chk">
                  <input type="checkbox" checked={!!loiForm.assignment?.affiliate_assignment_allowed} onChange={(e) => setLoiPath('assignment.affiliate_assignment_allowed', e.target.checked)} />
                  <span>Affiliate assignment allowed</span>
                </label>
              </div>
            </div>
            <div className="counter-offer-section">
              <h3 className="counter-offer-section-title">Exclusivity</h3>
              <div className="counter-offer-grid">
                <div className="counter-offer-field">
                  <label className="counter-offer-chk">
                    <input type="checkbox" checked={!!loiForm.exclusivity?.exclusive} onChange={(e) => setLoiPath('exclusivity.exclusive', e.target.checked)} />
                    <span>Exclusive</span>
                  </label>
                </div>
                <div className="counter-offer-field">
                  <label>Exclusivity period (days)</label>
                  <input type="number" min={0} value={loiForm.exclusivity?.exclusivity_period_days ?? ''} onChange={(e) => setLoiPath('exclusivity.exclusivity_period_days', parseNumber(e.target.value))} />
                </div>
              </div>
            </div>
            <div className="counter-offer-section">
              <h3 className="counter-offer-section-title">Legal</h3>
              <div className="counter-offer-grid">
                <div className="counter-offer-field">
                  <label className="counter-offer-chk">
                    <input type="checkbox" checked={!!loiForm.legal?.non_binding} onChange={(e) => setLoiPath('legal.non_binding', e.target.checked)} />
                    <span>Non-binding (except specified sections)</span>
                  </label>
                </div>
                <div className="counter-offer-field">
                  <label>Governing law</label>
                  <select value={loiForm.legal?.governing_law || 'property_state'} onChange={(e) => setLoiPath('legal.governing_law', e.target.value)}>
                    <option value="property_state">Property state</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="counter-offer-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Sending…' : 'Send Counter LOI'}</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="counter-offer-form">
            <div className="counter-offer-grid">
              <div className="counter-offer-field">
                <label>Offer amount ($) *</label>
                <input type="number" name="offerAmount" value={form.offerAmount} onChange={handleChange} min="0" step="1000" required />
              </div>
              <div className="counter-offer-field">
                <label>Earnest money ($) *</label>
                <input type="number" name="earnestMoney" value={form.earnestMoney} onChange={handleChange} min="0" step="1000" required />
              </div>
              <div className="counter-offer-field">
                <label>EM form</label>
                <select name="earnestMoneyForm" value={form.earnestMoneyForm} onChange={handleChange}>
                  <option value="personal_check">Personal Check</option>
                  <option value="wire_transfer">Wire Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="counter-offer-field">
                <label>EM deposited with</label>
                <select name="earnestMoneyDepositedWith" value={form.earnestMoneyDepositedWith} onChange={handleChange}>
                  <option value="escrow_company">Escrow Company</option>
                  <option value="brokers_trust_account">Broker's Trust Account</option>
                </select>
              </div>
              <div className="counter-offer-field">
                <label>Earnest money due</label>
                <select name="earnestMoneyDue" value={form.earnestMoneyDue} onChange={handleChange}>
                  <option value="upon_acceptance">Upon acceptance</option>
                  <option value="within_3_business_days">Within 3 business days</option>
                  <option value="within_5_business_days">Within 5 business days</option>
                  <option value="at_closing">At closing</option>
                </select>
              </div>
              <div className="counter-offer-field">
                <label>COE date *</label>
                <input type="date" name="closingDate" value={form.closingDate} onChange={handleChange} min={new Date().toISOString().slice(0, 10)} required />
              </div>
              <div className="counter-offer-field">
                <label>Financing</label>
                <select name="financingType" value={form.financingType} onChange={handleChange}>
                  <option value="cash">Cash</option>
                  <option value="conventional">Conventional</option>
                  <option value="fha">FHA</option>
                  <option value="va">VA</option>
                  <option value="usda">USDA</option>
                  <option value="assumption">Assumption</option>
                  <option value="seller_carryback">Seller Carryback</option>
                </select>
              </div>
              {!['cash', 'assumption', 'seller_carryback'].includes(form.financingType) && (
                <div className="counter-offer-field">
                  <label>Down payment (%)</label>
                  <input type="number" name="downPayment" value={form.downPayment} onChange={handleChange} min="0" max="100" step="0.5" placeholder="e.g. 20" />
                </div>
              )}
              <div className="counter-offer-field">
                <label>Seller concessions (%)</label>
                <input type="number" name="sellerConcessionsPercent" value={form.sellerConcessionsPercent} onChange={handleChange} min="0" max="100" step="0.5" placeholder="%" />
              </div>
              <div className="counter-offer-field">
                <label>Seller concessions ($)</label>
                <input type="number" name="sellerConcessionsAmount" value={form.sellerConcessionsAmount} onChange={handleChange} min="0" step="500" placeholder="$" />
              </div>
              <div className="counter-offer-field">
                <label>Possession</label>
                <select name="possession" value={form.possession} onChange={handleChange}>
                  <option value="at_closing">At closing</option>
                  <option value="upon_recording">Upon recording</option>
                  <option value="other">Other (state in message)</option>
                </select>
              </div>
              <div className="counter-offer-field">
                <label>Offer expires (date)</label>
                <input type="date" name="offerExpirationDate" value={form.offerExpirationDate} onChange={handleChange} min={new Date().toISOString().slice(0, 10)} />
              </div>
              <div className="counter-offer-field">
                <label>Offer expires (time)</label>
                <input type="text" name="offerExpirationTime" value={form.offerExpirationTime} onChange={handleChange} placeholder="5:00 p.m." />
              </div>
            </div>

            <div className="counter-offer-contingencies">
              <div className="counter-offer-chk">
                <label>
                  <input type="checkbox" name="inspectionContingency" checked={form.inspectionContingency} onChange={handleChange} />
                  Inspection
                </label>
                {form.inspectionContingency && (
                  <input type="number" name="inspectionDays" value={form.inspectionDays} onChange={handleChange} min="1" max="30" placeholder="Days" className="counter-offer-days" />
                )}
              </div>
              <div className="counter-offer-chk">
                <label>
                  <input type="checkbox" name="financingContingency" checked={form.financingContingency} onChange={handleChange} />
                  Financing
                </label>
                {form.financingContingency && (
                  <input type="number" name="financingDays" value={form.financingDays} onChange={handleChange} min="1" max="60" placeholder="Days" className="counter-offer-days" />
                )}
              </div>
              <div className="counter-offer-chk">
                <label>
                  <input type="checkbox" name="appraisalContingency" checked={form.appraisalContingency} onChange={handleChange} />
                  Appraisal
                </label>
                {form.appraisalContingency && (
                  <select name="appraisalPaidBy" value={form.appraisalPaidBy} onChange={handleChange} className="counter-offer-days">
                    <option value="buyer">Buyer pays</option>
                    <option value="seller">Seller pays</option>
                    <option value="other">Other</option>
                  </select>
                )}
              </div>
              <div className="counter-offer-chk">
                <label>
                  <input type="checkbox" name="homeSaleContingency" checked={form.homeSaleContingency} onChange={handleChange} />
                  Home sale
                </label>
              </div>
            </div>

            <div className="counter-offer-field">
              <label>Inclusions</label>
              <textarea name="inclusions" value={form.inclusions} onChange={handleChange} rows={2} placeholder="e.g. refrigerator, washer/dryer" />
            </div>
            <div className="counter-offer-field">
              <label>Message to buyer</label>
              <textarea name="message" value={form.message} onChange={handleChange} rows={3} placeholder="Optional note for the buyer..." />
            </div>

            <div className="counter-offer-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Sending…' : 'Send Counter'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CounterOfferModal;
