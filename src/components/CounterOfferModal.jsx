import { useState, useEffect } from 'react';
import './CounterOfferModal.css';

const toDateStr = (v) => {
  if (!v) return '';
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

const CounterOfferModal = ({ offer, property, onClose, onSubmit, formatCurrency }) => {
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!offer) return;
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
  }, [offer]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to submit counter. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!offer) return null;

  const fmt = formatCurrency || ((n) => (n != null && Number.isFinite(n) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) : '—'));

  return (
    <div className="counter-offer-modal-overlay" onClick={onClose} role="presentation">
      <div className="counter-offer-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="counter-offer-title">
        <div className="counter-offer-modal-header">
          <h2 id="counter-offer-title">Counter Offer</h2>
          <button type="button" className="counter-offer-modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        {property && (
          <p className="counter-offer-property">
            {[property.address, property.city, property.state].filter(Boolean).join(', ')} — Asking {fmt(property.price)}
          </p>
        )}
        <p className="counter-offer-hint">Adjust the terms below. The buyer will receive this counter.</p>

        {error && <div className="counter-offer-error">{error}</div>}

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
      </div>
    </div>
  );
};

export default CounterOfferModal;
