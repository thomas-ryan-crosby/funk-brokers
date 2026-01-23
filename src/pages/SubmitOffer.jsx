import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPropertyById } from '../services/propertyService';
import { createOffer } from '../services/offerService';
import BuyerVerificationChecklist from '../components/BuyerVerificationChecklist';
import './SubmitOffer.css';

const SubmitOffer = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [showChecklist, setShowChecklist] = useState(true);
  const [verificationData, setVerificationData] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

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
    loadProperty();
  }, [propertyId]);

  const loadProperty = async () => {
    try {
      setLoading(true);
      const data = await getPropertyById(propertyId);
      setProperty(data);
      // Pre-fill offer amount slightly below asking price
      if (data.price) {
        setOfferData((prev) => ({
          ...prev,
          offerAmount: (data.price * 0.95).toFixed(0),
          earnestMoney: (data.price * 0.01).toFixed(0),
        }));
      }
    } catch (err) {
      setError('Failed to load property. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistComplete = (data) => {
    setVerificationData(data);
    setShowChecklist(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const offer = {
        propertyId,
        buyerId: 'temp-buyer-id', // TODO: Replace with actual user ID when auth is added
        buyerName: verificationData.buyerInfo.name,
        buyerEmail: verificationData.buyerInfo.email,
        buyerPhone: verificationData.buyerInfo.phone,
        offerAmount: parseFloat(offerData.offerAmount),
        earnestMoney: parseFloat(offerData.earnestMoney),
        proposedClosingDate: new Date(offerData.closingDate),
        financingType: offerData.financingType,
        contingencies: {
          inspection: {
            included: offerData.inspectionContingency,
            days: offerData.inspectionContingency ? parseInt(offerData.inspectionDays) : null,
          },
          financing: {
            included: offerData.financingContingency,
            days: offerData.financingContingency ? parseInt(offerData.financingDays) : null,
          },
          appraisal: {
            included: offerData.appraisalContingency,
          },
          homeSale: {
            included: offerData.homeSaleContingency,
          },
        },
        message: offerData.message,
        verificationDocuments: {
          proofOfFunds: verificationData.proofOfFunds,
          preApprovalLetter: verificationData.preApprovalLetter,
          bankLetter: verificationData.bankLetter,
          governmentId: verificationData.governmentId,
        },
      };

      const offerId = await createOffer(offer);
      setSuccess(true);
      console.log('Offer created with ID:', offerId);
    } catch (err) {
      setError('Failed to submit offer. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
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
          <button onClick={() => navigate('/#/')}>Back to Properties</button>
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
            <button onClick={() => navigate('/#/')}>Browse More Properties</button>
            <button onClick={() => navigate(`/#/property/${propertyId}`)}>
              View Property
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showChecklist) {
    return (
      <div className="submit-offer-page">
        <div className="submit-offer-container">
          <BuyerVerificationChecklist onComplete={handleChecklistComplete} />
        </div>
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

        <form onSubmit={handleSubmit} className="offer-form">
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
              onClick={() => navigate(`/#/property/${propertyId}`)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Submitting Offer...' : 'Submit Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitOffer;
