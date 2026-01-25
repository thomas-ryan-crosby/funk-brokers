import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPropertyById } from '../services/propertyService';
import { getPurchaseProfile } from '../services/profileService';
import { createOffer } from '../services/offerService';
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
    proposedClosingDate: new Date(offerData.closingDate),
    financingType: offerData.financingType,
    contingencies: {
      inspection: { included: offerData.inspectionContingency, days: offerData.inspectionContingency ? parseInt(offerData.inspectionDays) : null },
      financing: { included: offerData.financingContingency, days: offerData.financingContingency ? parseInt(offerData.financingDays) : null },
      appraisal: { included: offerData.appraisalContingency },
      homeSale: { included: offerData.homeSaleContingency },
    },
    message: offerData.message,
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
            <h2>Offer Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Offer Amount ($) *</label>
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
                <label>Earnest Money ($) *</label>
                <input
                  type="number"
                  name="earnestMoney"
                  value={offerData.earnestMoney}
                  onChange={handleInputChange}
                  min="0"
                  step="1000"
                  required
                />
                <span className="form-hint">
                  Typically 1-3% of offer amount
                </span>
              </div>

              <div className="form-group">
                <label>Proposed Closing Date *</label>
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
                <label>Financing Type *</label>
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
            </div>
          </div>

          <div className="form-section">
            <h2>Contingencies</h2>
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
                </label>
                {offerData.inspectionContingency && (
                  <div className="contingency-details">
                    <label>
                      Number of Days:
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
                </label>
                {offerData.financingContingency && (
                  <div className="contingency-details">
                    <label>
                      Number of Days:
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
                </label>
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
                </label>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Additional Message</h2>
            <div className="form-group">
              <textarea
                name="message"
                value={offerData.message}
                onChange={handleInputChange}
                rows="6"
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
                <li>Earnest money: {formatPrice(parseFloat(offerData.earnestMoney))}</li>
                <li>Closing date: {formatDate(offerData.closingDate)}</li>
                <li>Financing: {formatFinancing(offerData.financingType)}</li>
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
