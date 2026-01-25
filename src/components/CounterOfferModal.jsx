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
    closingDate: '',
    financingType: 'conventional',
    inspectionContingency: true,
    inspectionDays: '10',
    financingContingency: true,
    financingDays: '30',
    appraisalContingency: true,
    homeSaleContingency: false,
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!offer) return;
    const c = offer.contingencies || {};
    setForm({
      offerAmount: offer.offerAmount != null ? String(offer.offerAmount) : '',
      earnestMoney: offer.earnestMoney != null ? String(offer.earnestMoney) : '',
      closingDate: toDateStr(offer.proposedClosingDate) || '',
      financingType: offer.financingType || 'conventional',
      inspectionContingency: c.inspection?.included !== false,
      inspectionDays: c.inspection?.days != null ? String(c.inspection.days) : '10',
      financingContingency: c.financing?.included !== false,
      financingDays: c.financing?.days != null ? String(c.financing.days) : '30',
      appraisalContingency: c.appraisal?.included !== false,
      homeSaleContingency: c.homeSale?.included === true,
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
              <label>Closing date *</label>
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
              </select>
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
            </div>
            <div className="counter-offer-chk">
              <label>
                <input type="checkbox" name="homeSaleContingency" checked={form.homeSaleContingency} onChange={handleChange} />
                Home sale
              </label>
            </div>
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
