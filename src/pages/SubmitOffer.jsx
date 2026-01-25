import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPropertyById } from '../services/propertyService';
import { getPurchaseProfile } from '../services/profileService';
import { createOffer } from '../services/offerService';
import FieldInfoIcon from '../components/FieldInfoIcon';
import './SubmitOffer.css';

const SubmitOffer = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [verificationData, setVerificationData] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [step, setStep] = useState('attention'); // 'attention' | 'form' | 'review'
  const [signatureName, setSignatureName] = useState('');
  const [offerData, setOfferData] = useState({
    offerAmount: '',
    earnestMoney: '',
    earnestMoneyDue: 'within_3_business_days',
    closingDate: '',
    financingType: 'conventional',
    downPayment: '',
    possession: 'at_closing',
    inspectionContingency: true,
    inspectionDays: '10',
    financingContingency: true,
    financingDays: '30',
    appraisalContingency: true,
    homeSaleContingency: false,
    inclusions: '',
    message: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate(`/sign-in?redirect=${encodeURIComponent(`/submit-offer/${propertyId}`)}`);
      return;
    }
    if (!user?.uid || !propertyId) return;
    load();
  }, [propertyId, isAuthenticated, authLoading, user?.uid, navigate]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, profile] = await Promise.all([
        getPropertyById(propertyId),
        getPurchaseProfile(user.uid),
      ]);
      if (!profile?.buyerVerified || !profile?.buyerInfo) {
        navigate(`/verify-buyer?redirect=${encodeURIComponent(`/submit-offer/${propertyId}`)}`);
        return;
      }
      setProperty(data);
      setVerificationData({
        proofOfFunds: profile.verificationDocuments?.proofOfFunds,
        preApprovalLetter: profile.verificationDocuments?.preApprovalLetter,
        bankLetter: profile.verificationDocuments?.bankLetter,
        governmentId: profile.verificationDocuments?.governmentId,
        buyerInfo: profile.buyerInfo,
      });
      if (data?.price) {
        setOfferData((prev) => ({
          ...prev,
          offerAmount: (data.price * 0.95).toFixed(0),
          earnestMoney: (data.price * 0.01).toFixed(0),
        }));
      }
    } catch (err) {
      setError('Failed to load. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setOfferData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const ATTENTION_MSG =
    'Attention: By submitting an offer, you are entering into a legally binding agreement. If the seller accepts your offer, you may be obligated to purchase this property under the terms you specify. Do you wish to proceed?';

  const buildOffer = () => ({
    propertyId,
    buyerId: user.uid,
    buyerName: verificationData.buyerInfo.name,
    buyerEmail: verificationData.buyerInfo.email,
    buyerPhone: verificationData.buyerInfo.phone,
    offerAmount: parseFloat(offerData.offerAmount),
    earnestMoney: parseFloat(offerData.earnestMoney),
    earnestMoneyDue: offerData.earnestMoneyDue || null,
    proposedClosingDate: new Date(offerData.closingDate),
    financingType: offerData.financingType,
    downPayment: offerData.financingType === 'cash' ? null : (offerData.downPayment !== '' && Number.isFinite(parseFloat(offerData.downPayment)) ? parseFloat(offerData.downPayment) : null),
    possession: offerData.possession || null,
    contingencies: {
      inspection: { included: offerData.inspectionContingency, days: offerData.inspectionContingency ? parseInt(offerData.inspectionDays) : null },
      financing: { included: offerData.financingContingency, days: offerData.financingContingency ? parseInt(offerData.financingDays) : null },
      appraisal: { included: offerData.appraisalContingency },
      homeSale: { included: offerData.homeSaleContingency },
    },
    inclusions: (offerData.inclusions || '').trim() || null,
    message: (offerData.message || '').trim() || null,
    verificationDocuments: {
      proofOfFunds: verificationData.proofOfFunds,
      preApprovalLetter: verificationData.preApprovalLetter,
      bankLetter: verificationData.bankLetter,
      governmentId: verificationData.governmentId,
    },
  });

  const handleReviewOffer = (e) => {
    e.preventDefault();
    if (!e.target.checkValidity()) {
      e.target.reportValidity();
      return;
    }
    setError(null);
    setSignatureName('');
    setStep('review');
  };

  const handleFinalSubmit = async () => {
    const expected = (verificationData.buyerInfo.name || '').trim().toLowerCase();
    const signed = signatureName.trim().toLowerCase();
    if (expected && signed !== expected) {
      setError('Please type your full legal name exactly as it appears on your verified buyer profile.');
      return;
    }
    if (!signed) {
      setError('Please type your full legal name to sign and confirm this offer.');
      return;
    }
    const confirmed = window.confirm(ATTENTION_MSG);
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);
    try {
      const offerId = await createOffer(buildOffer());
      setSuccess(true);
      console.log('Offer created with ID:', offerId);
    } catch (err) {
      setError('Failed to submit offer. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatFinancing = (v) => {
    const map = { cash: 'Cash', conventional: 'Conventional', fha: 'FHA', va: 'VA', usda: 'USDA' };
    return map[v] || (v || '').replace(/-/g, ' ');
  };

  const formatEarnestDue = (v) => {
    const map = { upon_acceptance: 'Upon acceptance', within_3_business_days: 'Within 3 business days of acceptance', within_5_business_days: 'Within 5 business days of acceptance', at_closing: 'At closing' };
    return map[v] || v || '—';
  };

  const formatPossession = (v) => {
    const map = { at_closing: 'At closing', upon_recording: 'Upon recording', other: 'Other (see message)' };
    return map[v] || v || '—';
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const x = typeof d === 'string' ? new Date(d) : (d?.toDate ? d.toDate() : d);
    return Number.isNaN(x?.getTime()) ? '—' : x.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="submit-offer-page">
        <div className="loading-state">Loading property details...</div>
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="submit-offer-page">
        <div className="error-state">
          <p>{error}</p>
          <button onClick={() => navigate('/browse')} className="btn btn-primary">
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="submit-offer-page">
        <div className="success-message">
          <h2>Offer Submitted Successfully!</h2>
          <p>Your offer has been sent to the seller. You will be notified when they respond.</p>
          <div className="success-actions">
            <button onClick={() => navigate('/browse')} className="btn btn-primary">
              Browse More Properties
            </button>
            <button onClick={() => navigate(`/property/${propertyId}`)} className="btn btn-outline">
              View Property
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!property || !verificationData) {
    return (
      <div className="submit-offer-page">
        <div className="loading-state">Loading...</div>
      </div>
    );
  }

  return (
    <div className="submit-offer-page">
      <div className="submit-offer-container">
        <div className="offer-header">
          <h1>Submit an Offer</h1>
          {property && (
            <div className="property-summary">
              <p className="property-address">
                {property.address}, {property.city}, {property.state}
              </p>
              <p className="property-price">Asking Price: {formatPrice(property.price)}</p>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        {step === 'attention' && (
          <div className="offer-attention">
            <h2 className="offer-attention-title">Important Notice</h2>
            <p className="offer-attention-text">
              By submitting an offer, you are entering into a <strong>legally binding agreement</strong>. If the seller accepts your offer, you may be obligated to purchase this property under the terms you specify. Please ensure you have reviewed all details carefully before proceeding.
            </p>
            <button type="button" className="btn-primary" onClick={() => setStep('form')}>
              I Understand — Continue
            </button>
          </div>
        )}

        {step === 'form' && (
        <form onSubmit={handleReviewOffer} className="offer-form">
          <div className="form-section">
            <h2>Purchase Price &amp; Financing</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label-with-info">
                  Offer Amount / Purchase Price ($) *
                  <FieldInfoIcon
                    description="The total price you are offering to pay for the property. This becomes the contract price if the seller accepts. In a PSA, this is the core term that defines the deal."
                    common="Often at or slightly below asking in a balanced market; may go over in a competitive market. Sellers may counter with a higher number."
                  />
                </label>
                <input
                  type="number"
                  name="offerAmount"
                  value={offerData.offerAmount}
                  onChange={handleInputChange}
                  min="0"
                  step="1000"
                  required
                />
                {property && (
                  <span className="form-hint">
                    {property.price &&
                      `$${(
                        ((parseFloat(offerData.offerAmount) - property.price) /
                          property.price) *
                        100
                      ).toFixed(1)}% ${parseFloat(offerData.offerAmount) >= property.price ? 'above' : 'below'} asking price`}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label-with-info">
                  Earnest Money Deposit ($) *
                  <FieldInfoIcon
                    description="A good-faith deposit that shows you are serious. It is held (usually in escrow) and typically applied to your down payment or closing costs at settlement. If you back out without a valid contingency, the seller may keep it."
                    common="Usually 1–3% of the purchase price. Higher amounts can strengthen your offer; 1% is common, 2–3% in competitive markets."
                  />
                </label>
                <input
                  type="number"
                  name="earnestMoney"
                  value={offerData.earnestMoney}
                  onChange={handleInputChange}
                  min="0"
                  step="1000"
                  required
                />
                <span className="form-hint">Typically 1–3% of offer amount</span>
              </div>

              <div className="form-group">
                <label className="form-label-with-info">
                  Earnest Money Due
                  <FieldInfoIcon
                    description="When the earnest money must be delivered (e.g. to escrow or the seller’s agent). This is a standard PSA term; it commits you to a clear timeline."
                    common="Within 3 business days of acceptance is very common. Upon acceptance or at closing are also used; 5 business days is a bit more time."
                  />
                </label>
                <select
                  name="earnestMoneyDue"
                  value={offerData.earnestMoneyDue}
                  onChange={handleInputChange}
                >
                  <option value="upon_acceptance">Upon acceptance</option>
                  <option value="within_3_business_days">Within 3 business days of acceptance</option>
                  <option value="within_5_business_days">Within 5 business days of acceptance</option>
                  <option value="at_closing">At closing</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label-with-info">
                  Proposed Closing Date *
                  <FieldInfoIcon
                    description="The date when the sale is finalized: ownership transfers, funds are disbursed, and you receive the keys. In the PSA this is the target settlement date."
                    common="Often 30–60 days from acceptance to allow for financing, inspections, and title work. Cash deals can close in 2–3 weeks."
                  />
                </label>
                <input
                  type="date"
                  name="closingDate"
                  value={offerData.closingDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label-with-info">
                  Financing Type *
                  <FieldInfoIcon
                    description="How you will pay for the property. This affects contract terms, contingencies, and the seller’s view of your offer (e.g. cash vs. loan)."
                    common="Conventional is most common. Cash can make offers stronger. FHA/VA/USDA are government-backed and have specific rules and property requirements."
                  />
                </label>
                <select
                  name="financingType"
                  value={offerData.financingType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="conventional">Conventional</option>
                  <option value="fha">FHA</option>
                  <option value="va">VA</option>
                  <option value="usda">USDA</option>
                </select>
              </div>

              {offerData.financingType !== 'cash' && (
                <div className="form-group">
                  <label className="form-label-with-info">
                    Down Payment (%)
                    <FieldInfoIcon
                      description="The percentage of the purchase price you will pay upfront (not financed). Lenders use this to set loan terms and rates. In the PSA it clarifies your financing structure."
                      common="Conventional: often 5%, 10%, or 20% (20% can avoid PMI). FHA: as low as 3.5%. VA/USDA: often 0%."
                    />
                  </label>
                  <input
                    type="number"
                    name="downPayment"
                    value={offerData.downPayment}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.5"
                    placeholder="e.g. 20"
                  />
                  <span className="form-hint">Leave blank if unsure; your lender can confirm.</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label-with-info">
                  Possession
                  <FieldInfoIcon
                    description="When you receive the keys and can move in. In a PSA this is usually tied to closing or recording of the deed."
                    common="At closing is most common. Upon recording means after the deed is filed. Other arrangements (e.g. rent-back) can be listed in your message."
                  />
                </label>
                <select
                  name="possession"
                  value={offerData.possession}
                  onChange={handleInputChange}
                >
                  <option value="at_closing">At closing</option>
                  <option value="upon_recording">Upon recording</option>
                  <option value="other">Other (state in message)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Contingencies</h2>
            <p className="contingencies-intro">Contingencies let you cancel the deal or renegotiate under certain conditions. Including them can protect you but may make your offer less attractive to sellers.</p>
            <div className="contingencies-list">
              <div className="contingency-item">
                <label className="contingency-checkbox">
                  <input
                    type="checkbox"
                    name="inspectionContingency"
                    checked={offerData.inspectionContingency}
                    onChange={handleInputChange}
                  />
                  <span>Inspection Contingency</span>
                  <FieldInfoIcon
                    description="Lets you back out or negotiate repairs if a professional home inspection finds significant issues (e.g. structure, systems, safety). A standard PSA term that protects the buyer."
                    common="Usually included; 7–14 days is typical. Shorter periods can strengthen an offer; waiving it is risky and more common in very competitive deals."
                  />
                </label>
                <p className="contingency-desc">Lets you back out or negotiate repairs if a professional home inspection finds significant issues.</p>
                {offerData.inspectionContingency && (
                  <div className="contingency-details">
                    <label className="form-label-with-info">
                      Number of days
                      <FieldInfoIcon
                        description="Deadline to complete the inspection and notify the seller of any issues or your decision to proceed, renegotiate, or cancel."
                        common="10 days is very common; 7 for a quicker deal, 14 if you want more time to schedule and review."
                      />
                      <input
                        type="number"
                        name="inspectionDays"
                        value={offerData.inspectionDays}
                        onChange={handleInputChange}
                        min="1"
                        max="30"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="contingency-item">
                <label className="contingency-checkbox">
                  <input
                    type="checkbox"
                    name="financingContingency"
                    checked={offerData.financingContingency}
                    onChange={handleInputChange}
                  />
                  <span>Financing Contingency</span>
                  <FieldInfoIcon
                    description="Protects you if your mortgage or loan is not approved on the agreed terms; you can cancel without losing earnest money. A core PSA protection when using a loan."
                    common="Usually included when financing. 17–21 days is common; 30 days gives more cushion. Cash offers often omit this."
                  />
                </label>
                <p className="contingency-desc">Protects you if your mortgage or loan is not approved; you can cancel without losing earnest money.</p>
                {offerData.financingContingency && (
                  <div className="contingency-details">
                    <label className="form-label-with-info">
                      Number of days
                      <FieldInfoIcon
                        description="Deadline to obtain a clear loan commitment (or waive the contingency). If financing falls through after this, you may still have limited protections depending on the contract."
                        common="21 or 30 days are common; 17 in faster deals. Must align with your lender’s typical timeline."
                      />
                      <input
                        type="number"
                        name="financingDays"
                        value={offerData.financingDays}
                        onChange={handleInputChange}
                        min="1"
                        max="60"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="contingency-item">
                <label className="contingency-checkbox">
                  <input
                    type="checkbox"
                    name="appraisalContingency"
                    checked={offerData.appraisalContingency}
                    onChange={handleInputChange}
                  />
                  <span>Appraisal Contingency</span>
                  <FieldInfoIcon
                    description="If the lender’s appraisal comes in below the purchase price, you can renegotiate the price, bring more cash, or walk away without losing earnest money (subject to the contract)."
                    common="Usually included when financing; lenders require an appraisal. Cash buyers sometimes waive it to strengthen an offer."
                  />
                </label>
                <p className="contingency-desc">If the home appraises for less than the purchase price, you can renegotiate or walk away.</p>
              </div>

              <div className="contingency-item">
                <label className="contingency-checkbox">
                  <input
                    type="checkbox"
                    name="homeSaleContingency"
                    checked={offerData.homeSaleContingency}
                    onChange={handleInputChange}
                  />
                  <span>Home Sale Contingency</span>
                  <FieldInfoIcon
                    description="Makes your purchase dependent on selling your current home by a specified date. If your home does not sell, you can cancel. Sellers often see this as a risk because it adds uncertainty."
                    common="Less common; can weaken an offer. If used, sellers may want a kick-out or right to keep marketing. Often 30–60+ days to sell."
                  />
                </label>
                <p className="contingency-desc">Your purchase depends on selling your current home first; the deal can fall through if your home doesn’t sell in time.</p>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Personal Property / Inclusions</h2>
            <div className="form-group">
              <label className="form-label-with-info">
                Items to include in the sale
                <FieldInfoIcon
                  description="Specific items (beyond the real property itself) that will stay with the home. In a PSA, this avoids disputes over appliances, fixtures, or other personal property."
                  common="Often: refrigerator, washer/dryer, window treatments, certain fixtures. Be specific (e.g. ‘Kitchen refrigerator, no garage fridge’)."
                />
              </label>
              <textarea
                name="inclusions"
                value={offerData.inclusions}
                onChange={handleInputChange}
                rows="3"
                placeholder="e.g. refrigerator, washer and dryer, window treatments, mounted TV in living room"
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Additional Terms &amp; Message</h2>
            <div className="form-group">
              <label className="form-label-with-info">
                Additional terms, conditions, or message to the seller
                <FieldInfoIcon
                  description="Anything else you want as part of the PSA or a personal note: repair requests, closing cost credits, sale-leaseback, or a short letter to the seller. Be clear; these can become contract terms."
                  common="Examples: request for a home warranty, seller to complete minor repairs, closing cost assistance, or a brief note about why you love the home."
                />
              </label>
              <textarea
                name="message"
                value={offerData.message}
                onChange={handleInputChange}
                rows="5"
                placeholder="Add any additional terms, conditions, or a personal message to the seller..."
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(`/property/${propertyId}`)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Review Offer
            </button>
          </div>
        </form>
        )}

        {step === 'review' && (
          <div className="offer-review">
            <h2 className="offer-review-title">Review Your Offer</h2>
            <p className="offer-review-hint">Please confirm all terms below. Type your full legal name to sign and submit.</p>

            <div className="offer-review-section">
              <h3>Property</h3>
              <p>{[property?.address, property?.city, property?.state].filter(Boolean).join(', ')}</p>
              <p>Asking: {formatPrice(property?.price)}</p>
            </div>
            <div className="offer-review-section">
              <h3>Offer Terms</h3>
              <ul className="offer-review-list">
                <li>Offer amount: {formatPrice(parseFloat(offerData.offerAmount))}</li>
                <li>Earnest money: {formatPrice(parseFloat(offerData.earnestMoney))} — due {formatEarnestDue(offerData.earnestMoneyDue)}</li>
                <li>Closing date: {formatDate(offerData.closingDate)}</li>
                <li>Financing: {formatFinancing(offerData.financingType)}{offerData.financingType !== 'cash' && offerData.downPayment !== '' ? `, ${offerData.downPayment}% down` : ''}</li>
                <li>Possession: {formatPossession(offerData.possession)}</li>
              </ul>
            </div>
            <div className="offer-review-section">
              <h3>Contingencies</h3>
              <ul className="offer-review-list">
                <li>Inspection: {offerData.inspectionContingency ? `Yes (${offerData.inspectionDays} days)` : 'No'}</li>
                <li>Financing: {offerData.financingContingency ? `Yes (${offerData.financingDays} days)` : 'No'}</li>
                <li>Appraisal: {offerData.appraisalContingency ? 'Yes' : 'No'}</li>
                <li>Home sale: {offerData.homeSaleContingency ? 'Yes' : 'No'}</li>
              </ul>
            </div>
            {offerData.inclusions?.trim() && (
              <div className="offer-review-section">
                <h3>Inclusions</h3>
                <p className="offer-review-message">{offerData.inclusions}</p>
              </div>
            )}
            {offerData.message?.trim() && (
              <div className="offer-review-section">
                <h3>Message to Seller</h3>
                <p className="offer-review-message">{offerData.message}</p>
              </div>
            )}

            <div className="offer-review-sign">
              <label htmlFor="offer-signature">Type your full legal name to confirm and sign</label>
              <input
                id="offer-signature"
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder={verificationData?.buyerInfo?.name || 'Your full legal name'}
                className="offer-review-sign-input"
                autoComplete="name"
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => { setError(null); setStep('form'); }}>
                Back
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={submitting}
                onClick={handleFinalSubmit}
              >
                {submitting ? 'Submitting Offer...' : 'Submit Offer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmitOffer;
