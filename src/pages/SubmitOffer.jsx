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

  const [step, setStep] = useState('attention'); // 'attention' | 'unlisted-ack' | 'disclosures' | 'form' | 'review'
  const [unlistedAcknowledged, setUnlistedAcknowledged] = useState(false);
  const [disclosureAcknowledged, setDisclosureAcknowledged] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [offerData, setOfferData] = useState({
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
      const d = new Date();
      d.setDate(d.getDate() + 3);
      const defaultExpiry = d.toISOString().slice(0, 10);
      if (data?.price) {
        setOfferData((prev) => ({
          ...prev,
          offerAmount: (data.price * 0.95).toFixed(0),
          earnestMoney: (data.price * 0.01).toFixed(0),
          offerExpirationDate: prev.offerExpirationDate || defaultExpiry,
        }));
      } else {
        setOfferData((prev) => ({ ...prev, offerExpirationDate: prev.offerExpirationDate || defaultExpiry }));
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

  const buildOffer = () => {
    const pct = offerData.sellerConcessionsPercent !== '' && Number.isFinite(parseFloat(offerData.sellerConcessionsPercent));
    const amt = offerData.sellerConcessionsAmount !== '' && Number.isFinite(parseFloat(offerData.sellerConcessionsAmount));
    const sellerConcessions = pct
      ? { type: 'percent', value: parseFloat(offerData.sellerConcessionsPercent) }
      : amt
        ? { type: 'amount', value: parseFloat(offerData.sellerConcessionsAmount) }
        : null;
    return {
      propertyId,
      buyerId: user.uid,
      buyerName: verificationData.buyerInfo.name,
      buyerEmail: verificationData.buyerInfo.email,
      buyerPhone: verificationData.buyerInfo.phone,
      offerAmount: parseFloat(offerData.offerAmount),
      earnestMoney: parseFloat(offerData.earnestMoney),
      earnestMoneyForm: offerData.earnestMoneyForm || null,
      earnestMoneyDepositedWith: offerData.earnestMoneyDepositedWith || null,
      earnestMoneyDue: offerData.earnestMoneyDue || null,
      proposedClosingDate: new Date(offerData.closingDate),
      financingType: offerData.financingType,
      downPayment: (offerData.financingType === 'cash' || ['assumption', 'seller_carryback'].includes(offerData.financingType)) ? null : (offerData.downPayment !== '' && Number.isFinite(parseFloat(offerData.downPayment)) ? parseFloat(offerData.downPayment) : null),
      sellerConcessions,
      possession: offerData.possession || null,
      contingencies: {
        inspection: { included: offerData.inspectionContingency, days: offerData.inspectionContingency ? parseInt(offerData.inspectionDays) : null },
        financing: { included: offerData.financingContingency, days: offerData.financingContingency ? parseInt(offerData.financingDays) : null },
        appraisal: { included: offerData.appraisalContingency, paidBy: offerData.appraisalContingency ? (offerData.appraisalPaidBy || 'buyer') : null },
        homeSale: { included: offerData.homeSaleContingency },
      },
      inclusions: (offerData.inclusions || '').trim() || null,
      offerExpirationDate: (offerData.offerExpirationDate || '').trim() || null,
      offerExpirationTime: (offerData.offerExpirationTime || '').trim() || null,
      message: (offerData.message || '').trim() || null,
      verificationDocuments: {
        proofOfFunds: verificationData.proofOfFunds,
        preApprovalLetter: verificationData.preApprovalLetter,
        bankLetter: verificationData.bankLetter,
        governmentId: verificationData.governmentId,
      },
      createdBy: user.uid,
    };
  };

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
    if (!disclosureAcknowledged) {
      setError('You must read and acknowledge the required disclosures before submitting an offer.');
      return;
    }
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
    const map = { cash: 'Cash', conventional: 'Conventional', fha: 'FHA', va: 'VA', usda: 'USDA', assumption: 'Assumption', seller_carryback: 'Seller Carryback' };
    return map[v] || (v || '').replace(/-/g, ' ');
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

  if (error && (!property || !verificationData)) {
    return (
      <div className="submit-offer-page">
        <div className="error-state">
          <p>{error}</p>
          <button onClick={() => navigate(property ? `/property/${property.id}` : '/browse')} className="btn btn-primary">
            {property ? 'Back to Property' : 'Back to Properties'}
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
            <h2 className="offer-attention-title">Attention Buyer</h2>
            <p className="offer-attention-text">
              You are entering into a <strong>legally binding agreement</strong>. If the seller accepts your offer, you may be obligated to purchase this property under the terms you specify.
            </p>
            <ul className="offer-attention-checklist">
              <li>Read the entire offer and all sections before you sign.</li>
              <li>Review any seller disclosure(s) and investigate items important to you.</li>
              <li>During the inspection period, conduct inspections (home, pest, etc.) and verify square footage, sewer/septic, and insurability.</li>
              <li>Apply for your loan promptly if financing and provide your lender all requested information.</li>
              <li>Confirm wiring instructions independently; beware of wire fraud.</li>
            </ul>
            <p className="offer-attention-text">Consult an attorney, inspector, or other professional as needed. Verify anything important to you.</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setStep(property.availableForSale === false && property.acceptingOffers === true ? 'unlisted-ack' : 'disclosures')}
            >
              I Understand — Continue
            </button>
          </div>
        )}

        {step === 'unlisted-ack' && (
          <div className="offer-unlisted-ack">
            <h2 className="offer-unlisted-ack-title">This property is not formally listed</h2>
            <p className="offer-unlisted-ack-intro">
              The seller is open to offers but has not completed a full listing. That means willingness to sell, responsiveness, and disclosures may not be ready at this point.
            </p>
            <p className="offer-unlisted-ack-reassure">
              That is not inherently a problem. If you are interested, it is very simple for the seller to get this in place. You can submit your offer and they can respond when ready.
            </p>
            <label className="offer-unlisted-ack-checkbox">
              <input
                type="checkbox"
                checked={unlistedAcknowledged}
                onChange={(e) => setUnlistedAcknowledged(e.target.checked)}
                aria-describedby="offer-unlisted-ack-desc"
              />
              <span id="offer-unlisted-ack-desc">
                I acknowledge that this property is not formally listed. Willingness to sell, responsiveness, and disclosures may not be ready at this point. I understand the seller can get these in place if we move forward.
              </span>
            </label>
            <button
              type="button"
              className="btn-primary"
              disabled={!unlistedAcknowledged}
              onClick={() => setStep('disclosures')}
            >
              Continue to Disclosures
            </button>
          </div>
        )}

        {step === 'disclosures' && (
          <div className="offer-disclosures">
            <h2 className="offer-disclosures-title">Required Disclosures</h2>
            <p className="offer-disclosures-intro">Before submitting an offer, you must read and acknowledge the following required disclosures.</p>
            <div className="offer-disclosures-content">
              <h3>Lead-Based Paint</h3>
              <p>For residential property built before 1978, federal law requires disclosure of known lead-based paint and hazards. You have the right to conduct a lead-based paint inspection and may receive a 10-day period to do so.</p>
              <h3>Property Condition &amp; Material Facts</h3>
              <p>Sellers are required to disclose known material facts that affect the value or desirability of the property, including structural issues, water intrusion, pest damage, and other defects. Review all seller disclosure documents and conduct your own inspections during any contingency period.</p>
              <h3>Other Disclosures</h3>
              <p>Additional disclosures may apply (e.g., HOA documents, flood zone, natural hazards). You are responsible for reviewing any disclosures provided by the seller and for your own due diligence.</p>
            </div>
            <label className="offer-disclosures-ack">
              <input
                type="checkbox"
                checked={disclosureAcknowledged}
                onChange={(e) => setDisclosureAcknowledged(e.target.checked)}
                aria-describedby="offer-disclosures-desc"
              />
              <span id="offer-disclosures-desc">I have read the required disclosures above and acknowledge that I accept them. I understand that I am responsible for reviewing any seller-provided disclosures and for my own inspections and due diligence.</span>
            </label>
            <button
              type="button"
              className="btn-primary"
              disabled={!disclosureAcknowledged}
              onClick={() => setStep('form')}
            >
              Continue to Offer Form
            </button>
          </div>
        )}

        {step === 'form' && (
        <form onSubmit={handleReviewOffer} className="offer-form">
          <div className="form-section">
            <h2>1. Property &amp; Purchase Price</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label-with-info">
                  Full Purchase Price ($) *
                  <FieldInfoIcon
                    description="The total price you are offering. This becomes the contract price if the seller accepts. The contract defines the deal as the Premises plus the personal property described herein."
                    common="Often at or slightly below asking in a balanced market; may go over in a competitive market. Sellers may counter."
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
                  Earnest Money ($) *
                  <FieldInfoIcon
                    description="Good-faith deposit held in escrow or broker’s trust account, typically applied to down payment or closing costs. If you back out without a valid contingency, the seller may keep it."
                    common="Usually 1–3% of the purchase price. 2–3% can strengthen an offer."
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
                <span className="form-hint">Typically 1–3% of purchase price</span>
              </div>

              <div className="form-group">
                <label className="form-label-with-info">
                  Earnest Money form
                  <FieldInfoIcon
                    description="Form of the earnest money payment. Upon acceptance, the earnest money will be deposited per the terms selected."
                    common="Personal check and wire transfer are most common. Wire is often required for faster or larger deposits."
                  />
                </label>
                <select name="earnestMoneyForm" value={offerData.earnestMoneyForm} onChange={handleInputChange}>
                  <option value="personal_check">Personal Check</option>
                  <option value="wire_transfer">Wire Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label-with-info">
                  Earnest Money deposited with
                  <FieldInfoIcon
                    description="Where the earnest money will be held upon acceptance: Escrow Company or Broker’s Trust Account."
                    common="Escrow Company is typical. Broker’s Trust Account is used when the broker holds funds."
                  />
                </label>
                <select name="earnestMoneyDepositedWith" value={offerData.earnestMoneyDepositedWith} onChange={handleInputChange}>
                  <option value="escrow_company">Escrow Company</option>
                  <option value="brokers_trust_account">Broker's Trust Account</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label-with-info">
                  Earnest Money due
                  <FieldInfoIcon
                    description="When the earnest money must be delivered to escrow or the broker. The contract may require delivery in sufficient time to allow COE on the COE Date."
                    common="Within 3 business days of acceptance is very common. Upon acceptance or at closing are also used."
                  />
                </label>
                <select name="earnestMoneyDue" value={offerData.earnestMoneyDue} onChange={handleInputChange}>
                  <option value="upon_acceptance">Upon acceptance</option>
                  <option value="within_3_business_days">Within 3 business days of acceptance</option>
                  <option value="within_5_business_days">Within 5 business days of acceptance</option>
                  <option value="at_closing">At closing</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label-with-info">
                  COE Date (Close of Escrow) *
                  <FieldInfoIcon
                    description="Close of Escrow (COE) is when the deed is recorded at the county recorder’s office. Buyer and Seller must perform all acts in sufficient time to allow COE to occur on this date."
                    common="Often 30–60 days from acceptance for financing, inspections, and title. Cash deals can close in 2–3 weeks."
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
                  Possession
                  <FieldInfoIcon
                    description="When Seller delivers possession, keys, mailbox, security system, and common area access to Buyer. Typically at COE or as otherwise agreed."
                    common="At COE is most common. Other arrangements (e.g. rent-back) can be listed in Additional Terms."
                  />
                </label>
                <select name="possession" value={offerData.possession} onChange={handleInputChange}>
                  <option value="at_closing">At closing (COE)</option>
                  <option value="upon_recording">Upon recording</option>
                  <option value="other">Other (state in Additional Terms)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>2. Financing</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label-with-info">
                  Type of Financing *
                  <FieldInfoIcon
                    description="How the purchase will be funded. Conventional, FHA, VA, USDA are new financing. Assumption and Seller Carryback use other arrangements; see addendum if applicable."
                    common="Conventional is most common. Cash can strengthen offers. FHA/VA/USDA have specific rules. All-cash: attach proof of funds or letter of credit if required."
                  />
                </label>
                <select name="financingType" value={offerData.financingType} onChange={handleInputChange} required>
                  <option value="cash">Cash</option>
                  <option value="conventional">Conventional</option>
                  <option value="fha">FHA</option>
                  <option value="va">VA</option>
                  <option value="usda">USDA</option>
                  <option value="assumption">Assumption</option>
                  <option value="seller_carryback">Seller Carryback</option>
                </select>
              </div>

              {!['cash', 'assumption', 'seller_carryback'].includes(offerData.financingType) && (
                <div className="form-group">
                  <label className="form-label-with-info">
                    Down Payment (%)
                    <FieldInfoIcon
                      description="Percentage of the purchase price paid upfront (not financed). Lenders use this for loan terms. Failure to have necessary funds can affect loan approval and is not an unfulfilled loan contingency."
                      common="Conventional: 5%, 10%, or 20%. FHA: as low as 3.5%. VA/USDA: often 0%."
                    />
                  </label>
                  <input type="number" name="downPayment" value={offerData.downPayment} onChange={handleInputChange} min="0" max="100" step="0.5" placeholder="e.g. 20" />
                  <span className="form-hint">Leave blank if unsure.</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label-with-info">
                  Seller Concessions (% of purchase price)
                  <FieldInfoIcon
                    description="Credit from Seller to Buyer at closing, in addition to other costs Seller pays. May be used for Buyer fees, costs, or charges to the extent allowed by Buyer’s lender. Use either % or $, not both."
                    common="Often 0. Leave blank if none. 1–3% is sometimes negotiated for closing cost assistance."
                  />
                </label>
                <input type="number" name="sellerConcessionsPercent" value={offerData.sellerConcessionsPercent} onChange={handleInputChange} min="0" max="100" step="0.5" placeholder="e.g. 2" />
              </div>

              <div className="form-group">
                <label className="form-label-with-info">
                  Seller Concessions ($)
                  <FieldInfoIcon
                    description="Credit from Seller to Buyer at closing as a dollar amount. Use either % or $, not both. If both are filled, % takes precedence."
                    common="Leave blank if using % or if none. Sometimes used for a fixed contribution (e.g. $5,000)."
                  />
                </label>
                <input type="number" name="sellerConcessionsAmount" value={offerData.sellerConcessionsAmount} onChange={handleInputChange} min="0" step="500" placeholder="e.g. 5000" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>6. Due Diligence / Contingencies</h2>
            <p className="contingencies-intro">Contingencies allow you to cancel or renegotiate under certain conditions. They protect you but may make your offer less attractive. Conduct inspections and investigations during the inspection period.</p>
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
                    description="Your obligation is contingent on an appraisal acceptable to the lender for at least the purchase price. If the Premises fail to appraise for the purchase price, you typically have a set period to cancel and receive earnest money back, or the contingency is waived."
                    common="Usually included when financing. Cash buyers sometimes waive it. Initial appraisal fee is often paid by Buyer; can be negotiated."
                  />
                </label>
                <p className="contingency-desc">If the home appraises for less than the purchase price, you can renegotiate, bring more cash, or walk away (per contract terms).</p>
                {offerData.appraisalContingency && (
                  <div className="contingency-details">
                    <label className="form-label-with-info">
                      Appraisal fee paid by
                      <FieldInfoIcon
                        description="Who pays the initial appraisal fee at the time the lender requires it. Fee is non-refundable. If Seller pays, it may or may not apply against Seller Concessions at COE."
                        common="Buyer pays in most cases. Seller sometimes pays to facilitate the sale."
                      />
                      <select name="appraisalPaidBy" value={offerData.appraisalPaidBy} onChange={handleInputChange}>
                        <option value="buyer">Buyer</option>
                        <option value="seller">Seller</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                  </div>
                )}
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
            <h2>1g. Fixtures &amp; Personal Property</h2>
            <p className="contingencies-intro">Fixtures (built-in appliances, ceiling fans, floor coverings, light fixtures, etc.) convey. If owned by Seller, you may specify: refrigerator, washer, dryer, above-ground spa/hot tub, or other personal property to include. Leased items are not included.</p>
            <div className="form-group">
              <label className="form-label-with-info">
                Additional personal property included (description)
                <FieldInfoIcon
                  description="List items beyond standard fixtures that will convey: e.g. refrigerator (description), washer, dryer, above-ground spa, window treatments, or other. Be specific. Items transfer with no monetary value and free of liens."
                  common="Refrigerator, washer, dryer, spa, window treatments. Specify which if multiple (e.g. kitchen refrigerator only)."
                />
              </label>
              <textarea
                name="inclusions"
                value={offerData.inclusions}
                onChange={handleInputChange}
                rows="3"
                placeholder="e.g. refrigerator (kitchen), washer and dryer, above-ground spa and equipment, window coverings"
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Terms of Acceptance</h2>
            <p className="contingencies-intro">This offer will become a binding contract when acceptance is signed by Seller and a signed copy is delivered and received by the deadline below. If no signed acceptance is received by this date and time, this offer is deemed withdrawn and earnest money returned.</p>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label-with-info">
                  Offer expires (date) *
                  <FieldInfoIcon
                    description="Date and time by which Seller must sign and deliver acceptance. If no signed acceptance is received by then, the offer is deemed withdrawn and Buyer’s earnest money returned."
                    common="Typically 2–5 days. Gives Seller time to respond without leaving the offer open indefinitely."
                  />
                </label>
                <input
                  type="date"
                  name="offerExpirationDate"
                  value={offerData.offerExpirationDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label-with-info">
                  Offer expires (time)
                  <FieldInfoIcon
                    description="Time on the expiration date by which acceptance must be received (e.g. 5:00 p.m.). Often local time."
                    common="5:00 p.m. is common. Leave default or adjust. Specify time zone if material."
                  />
                </label>
                <input
                  type="text"
                  name="offerExpirationTime"
                  value={offerData.offerExpirationTime}
                  onChange={handleInputChange}
                  placeholder="e.g. 5:00 p.m."
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>8. Additional Terms &amp; Message</h2>
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
              <h3>1. Property &amp; Purchase Price</h3>
              <ul className="offer-review-list">
                <li>Full Purchase Price: {formatPrice(parseFloat(offerData.offerAmount))}</li>
                <li>Earnest Money: {formatPrice(parseFloat(offerData.earnestMoney))} — {formatEarnestForm(offerData.earnestMoneyForm)}, deposited with {formatEarnestDepositedWith(offerData.earnestMoneyDepositedWith)}, due {formatEarnestDue(offerData.earnestMoneyDue)}</li>
                <li>COE Date: {formatDate(offerData.closingDate)}</li>
                <li>Possession: {formatPossession(offerData.possession)}</li>
              </ul>
            </div>
            <div className="offer-review-section">
              <h3>2. Financing</h3>
              <ul className="offer-review-list">
                <li>Type: {formatFinancing(offerData.financingType)}{!['cash', 'assumption', 'seller_carryback'].includes(offerData.financingType) && offerData.downPayment !== '' ? `, ${offerData.downPayment}% down` : ''}</li>
                {(offerData.sellerConcessionsPercent !== '' && Number.isFinite(parseFloat(offerData.sellerConcessionsPercent))) || (offerData.sellerConcessionsAmount !== '' && Number.isFinite(parseFloat(offerData.sellerConcessionsAmount))) ? (
                  <li>Seller Concessions: {offerData.sellerConcessionsPercent !== '' && Number.isFinite(parseFloat(offerData.sellerConcessionsPercent)) ? `${offerData.sellerConcessionsPercent}% of purchase price` : formatPrice(parseFloat(offerData.sellerConcessionsAmount))}</li>
                ) : null}
              </ul>
            </div>
            <div className="offer-review-section">
              <h3>6. Contingencies</h3>
              <ul className="offer-review-list">
                <li>Inspection: {offerData.inspectionContingency ? `Yes (${offerData.inspectionDays} days)` : 'No'}</li>
                <li>Financing: {offerData.financingContingency ? `Yes (${offerData.financingDays} days)` : 'No'}</li>
                <li>Appraisal: {offerData.appraisalContingency ? `Yes (fee paid by ${formatAppraisalPaidBy(offerData.appraisalPaidBy)})` : 'No'}</li>
                <li>Home sale: {offerData.homeSaleContingency ? 'Yes' : 'No'}</li>
              </ul>
            </div>
            <div className="offer-review-section">
              <h3>Terms of Acceptance</h3>
              <ul className="offer-review-list">
                <li>Offer expires: {formatDate(offerData.offerExpirationDate)}{offerData.offerExpirationTime ? ` at ${offerData.offerExpirationTime}` : ''}</li>
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
