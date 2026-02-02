import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPropertyById } from '../services/propertyService';
import { getPurchaseProfile } from '../services/profileService';
import { createOffer, getOfferById } from '../services/offerService';
import { savePsaDraft, getPsaDraftById, deletePsaDraft } from '../services/psaDraftService';
import FieldInfoIcon from '../components/FieldInfoIcon';
import GamificationNotification from '../components/gamification/GamificationNotification';
import './SubmitOffer.css';

function defaultAgreement() {
  return {
    agreement_metadata: {
      agreement_type: 'Residential Purchase and Sale Agreement',
      version: 'Nationwide Baseline v1.0',
      effective_date: null,
    },
    parties: {
      seller: { legal_names: [], mailing_address: '' },
      buyer: { legal_names: [], mailing_address: '' },
    },
    property: {
      street_address: '',
      city: '',
      state: '',
      zip: '',
      legal_description: { provided: false, text: '', exhibit_reference: 'Exhibit A' },
      included_improvements: 'All permanently affixed structures, fixtures, and improvements',
      excluded_items: [],
    },
    purchase_terms: {
      purchase_price: 0,
      earnest_money: {
        amount: 0,
        due_days_after_effective_date: 0,
        holder: { type: 'escrow_agent', name: '' },
        applied_to_purchase_price_at_closing: true,
      },
    },
    closing: {
      closing_date: '',
      closing_method: 'remote',
      closing_location: '',
      deliverables: { title_standard: 'marketable', deed_type: 'customary' },
    },
    title_review: {
      review_period_days: 0,
      objection_deadline_days_before_closing: 0,
      seller_cure_right: true,
    },
    property_condition: {
      sale_condition: 'as_is_where_is',
      buyer_no_reliance: true,
      statutory_disclosures_required: true,
    },
    inspection_due_diligence: {
      inspection_period_days: 0,
      buyer_rights: { may_terminate_during_period: true, termination_requires_written_notice: true },
      earnest_money_refund_on_termination: true,
    },
    financing: {
      financing_contingency: false,
      loan_type: '',
      loan_amount: 0,
      commitment_deadline: '',
      buyer_good_faith_effort_required: true,
    },
    prorations_and_costs: {
      tax_proration: 'as_of_closing',
      rent_proration: 'as_of_closing',
      buyer_costs: ['lender_fees', 'buyer_recording_fees'],
      seller_costs: ['deed_preparation', 'transfer_taxes_if_customary'],
      escrow_and_title_costs: 'split_equally',
    },
    risk_of_loss: {
      risk_holder_pre_closing: 'seller',
      casualty_threshold: 'material',
      buyer_options_on_casualty: ['terminate', 'proceed_with_insurance_proceeds'],
    },
    default_and_remedies: {
      buyer_default: { earnest_money_as_liquidated_damages: true, subject_to_state_law: true },
      seller_default: { buyer_remedies: ['return_of_earnest_money', 'legal_or_equitable_relief'] },
    },
    representations: {
      seller: ['authority_to_convey', 'no_undisclosed_liens', 'no_pending_condemnation_unless_disclosed'],
      buyer: ['authority_to_enter_agreement'],
    },
    assignment: { assignment_allowed: false, seller_consent_required: false },
    governing_law_and_venue: { governing_law: 'property_state', venue: 'property_county' },
    miscellaneous: {
      entire_agreement: true,
      amendments_in_writing_only: true,
      electronic_signatures_allowed: true,
      severability: true,
      time_is_of_the_essence: true,
    },
    execution: {
      seller_signature: { signed: false, date: null },
      buyer_signature: { signed: false, date: null },
    },
  };
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

/** Pre-fill PSA agreement from accepted LOI terms. User can change any field; changes show in diff. */
function agreementFromLoi(loi) {
  const base = defaultAgreement();
  const l = loi || {};
  if (l.parties?.seller_name) base.parties.seller.legal_names = [l.parties.seller_name].filter(Boolean);
  if (l.parties?.buyer_name) base.parties.buyer.legal_names = [l.parties.buyer_name].filter(Boolean);
  if (l.property) {
    if (l.property.street_address != null) base.property.street_address = l.property.street_address;
    if (l.property.city != null) base.property.city = l.property.city;
    if (l.property.state != null) base.property.state = l.property.state;
    if (l.property.zip != null) base.property.zip = l.property.zip;
  }
  if (l.economic_terms) {
    if (l.economic_terms.purchase_price != null) base.purchase_terms.purchase_price = Number(l.economic_terms.purchase_price) || 0;
    if (l.economic_terms.earnest_money?.amount != null) base.purchase_terms.earnest_money.amount = Number(l.economic_terms.earnest_money.amount) || 0;
    base.purchase_terms.earnest_money.due_days_after_effective_date = l.economic_terms.earnest_money?.due_upon_psa_execution ? 0 : (base.purchase_terms.earnest_money.due_days_after_effective_date ?? 0);
  }
  if (l.timeline) {
    if (l.timeline.due_diligence_days != null) base.inspection_due_diligence.inspection_period_days = Number(l.timeline.due_diligence_days) || 0;
    if (l.timeline.target_closing_days_after_psa != null) {
      const d = new Date();
      d.setDate(d.getDate() + Number(l.timeline.target_closing_days_after_psa));
      base.closing.closing_date = d.toISOString().slice(0, 10);
    }
  }
  if (l.financing) {
    base.financing.financing_contingency = !!l.financing.anticipated_financing;
    base.financing.loan_type = l.financing.anticipated_all_cash ? 'cash' : (l.financing.anticipated_financing ? 'conventional' : '');
  }
  if (l.condition_of_sale) {
    base.property_condition.sale_condition = l.condition_of_sale.anticipated_as_is_purchase ? 'as_is_where_is' : 'seller_disclosure';
  }
  return base;
}

/** Diff: PSA terms that were pre-filled from LOI but user changed. Used for convert-from-LOI flow. */
function getLoiToPsaDiff(sourceLoi, agreement, formatPrice) {
  const fmt = formatPrice || ((n) => (n != null && Number.isFinite(n) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) : String(n ?? '—')));
  const rows = [];
  const l = sourceLoi || {};
  const push = (label, loiVal, psaVal) => {
    const a = loiVal === true || loiVal === false ? (loiVal ? 'Yes' : 'No') : (loiVal ?? '—');
    const b = psaVal === true || psaVal === false ? (psaVal ? 'Yes' : 'No') : (psaVal ?? '—');
    if (String(a) !== String(b)) rows.push({ label, loiValue: a, psaValue: b });
  };
  push('Seller name', l.parties?.seller_name, (agreement.parties?.seller?.legal_names || [])[0] || (agreement.parties?.seller?.legal_names || []).join(', '));
  push('Buyer name', l.parties?.buyer_name, (agreement.parties?.buyer?.legal_names || [])[0] || (agreement.parties?.buyer?.legal_names || []).join(', '));
  push('Property address', [l.property?.street_address, l.property?.city, l.property?.state, l.property?.zip].filter(Boolean).join(', '), [agreement.property?.street_address, agreement.property?.city, agreement.property?.state, agreement.property?.zip].filter(Boolean).join(', '));
  if ((l.economic_terms?.purchase_price ?? agreement.purchase_terms?.purchase_price) !== (agreement.purchase_terms?.purchase_price ?? l.economic_terms?.purchase_price)) rows.push({ label: 'Purchase price', loiValue: fmt(l.economic_terms?.purchase_price), psaValue: fmt(agreement.purchase_terms?.purchase_price) });
  if ((l.economic_terms?.earnest_money?.amount ?? agreement.purchase_terms?.earnest_money?.amount) !== (agreement.purchase_terms?.earnest_money?.amount ?? l.economic_terms?.earnest_money?.amount)) rows.push({ label: 'Earnest money', loiValue: fmt(l.economic_terms?.earnest_money?.amount), psaValue: fmt(agreement.purchase_terms?.earnest_money?.amount) });
  push('Due diligence / inspection period (days)', l.timeline?.due_diligence_days, agreement.inspection_due_diligence?.inspection_period_days);
  push('Financing contingency', l.financing?.anticipated_financing, agreement.financing?.financing_contingency);
  push('All cash', l.financing?.anticipated_all_cash, agreement.financing?.loan_type === 'cash');
  push('As-is purchase', l.condition_of_sale?.anticipated_as_is_purchase, agreement.property_condition?.sale_condition === 'as_is_where_is');
  const loiClosingDays = l.timeline?.target_closing_days_after_psa;
  const psaDate = agreement.closing?.closing_date;
  if (loiClosingDays != null || psaDate) {
    const expectedDate = loiClosingDays != null ? (() => { const d = new Date(); d.setDate(d.getDate() + Number(loiClosingDays)); return d.toISOString().slice(0, 10); })() : null;
    if (expectedDate !== psaDate) rows.push({ label: 'Closing date', loiValue: expectedDate ? `${loiClosingDays} days after PSA` : '—', psaValue: psaDate || '—' });
  }
  return rows;
}

const SubmitOffer = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [verificationData, setVerificationData] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [documentType, setDocumentType] = useState(null); // 'psa' | 'loi'
  const [step, setStep] = useState('choose-type');
  const [congratsDismissed, setCongratsDismissed] = useState(false);
  /** When converting from accepted LOI: source LOI object for diff report. */
  const [sourceLoiRef, setSourceLoiRef] = useState(null);
  /** When converting: show modal with accepted LOI for quick reference. */
  const [showViewLoiModal, setShowViewLoiModal] = useState(false);
  /** Current PSA draft id when resuming or after saving a draft. */
  const [currentDraftId, setCurrentDraftId] = useState(null);
  /** Dismiss the LOI→PSA gamification bump (shown when converting from accepted LOI). */
  const [dismissedLoiToPsaBump, setDismissedLoiToPsaBump] = useState(false);
  const confettiPieces = useMemo(() => Array.from({ length: 60 }, (_, i) => {
    const angle = (i / 60) * 2 * Math.PI + Math.random() * 0.5;
    const dist = 120 + Math.random() * 180;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 40;
    return { key: i, dx, dy, delay: `${Math.random() * 0.25}s`, color: ['#ff3ea5', '#f9a8d4', '#7c3aed', '#a855f7', '#fbbf24', '#34d399', '#60a5fa'][i % 7] };
  }), []);
  const [unlistedAcknowledged, setUnlistedAcknowledged] = useState(false);
  const [disclosureAcknowledged, setDisclosureAcknowledged] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [agreement, setAgreement] = useState(defaultAgreement);
  const [loi, setLoi] = useState(defaultLoi);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate(`/sign-in?redirect=${encodeURIComponent(`/submit-offer/${propertyId}`)}`);
      return;
    }
    if (!user?.uid || !propertyId) return;
    load();
  }, [propertyId, isAuthenticated, authLoading, user?.uid, navigate]);

  /** Convert from LOI: when navigated with state.convertFromLoi + offerId, fetch LOI and pre-fill PSA form. */
  useEffect(() => {
    const offerId = location.state?.offerId;
    if (loading || !location.state?.convertFromLoi || !offerId) return;
    let cancelled = false;
    getOfferById(offerId)
      .then((offer) => {
        if (cancelled) return;
        if (offer?.offerType !== 'loi' || !offer?.loi) return;
        setSourceLoiRef(offer.loi);
        setAgreement(agreementFromLoi(offer.loi));
        setDocumentType('psa');
        setStep('form');
        setCongratsDismissed(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [loading, location.state?.convertFromLoi, location.state?.offerId]);

  /** Load PSA draft when resuming from Deal Center (state.draftId). */
  useEffect(() => {
    const draftId = location.state?.draftId;
    if (loading || !draftId || !user?.uid) return;
    let cancelled = false;
    getPsaDraftById(draftId)
      .then((draft) => {
        if (cancelled || !draft) return;
        setAgreement(draft.agreement || defaultAgreement());
        setSourceLoiRef(draft.sourceLoi ?? null);
        setDocumentType('psa');
        setStep('form');
        setCongratsDismissed(true);
        setCurrentDraftId(draft.id);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [loading, location.state?.draftId, user?.uid]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, profile] = await Promise.all([
        getPropertyById(propertyId),
        getPurchaseProfile(user.uid).catch(() => null),
      ]);
      setProperty(data);
      setVerificationData(profile ? {
        proofOfFunds: profile.verificationDocuments?.proofOfFunds,
        preApprovalLetter: profile.verificationDocuments?.preApprovalLetter,
        bankLetter: profile.verificationDocuments?.bankLetter,
        governmentId: profile.verificationDocuments?.governmentId,
        buyerInfo: profile.buyerInfo,
      } : {});
      const next = defaultAgreement();
      if (data) {
        next.property.street_address = data.address || '';
        next.property.city = data.city || '';
        next.property.state = data.state || '';
        next.property.zip = data.zip || '';
        next.purchase_terms.purchase_price = Number(data.price) || 0;
        next.purchase_terms.earnest_money.amount = Number(data.price) ? Number(data.price) * 0.01 : 0;
        next.parties.seller.mailing_address = [data.address, data.city, data.state, data.zip].filter(Boolean).join(', ');
      }
      const name = profile?.buyerInfo?.name;
      next.parties.buyer.legal_names = name ? [name.trim()].filter(Boolean) : [];
      next.parties.buyer.mailing_address = profile?.buyerInfo?.address || '';
      setAgreement(next);

      const loiNext = defaultLoi();
      if (data) {
        loiNext.property.street_address = data.address || '';
        loiNext.property.city = data.city || '';
        loiNext.property.state = data.state || '';
        loiNext.property.zip = data.zip || '';
        loiNext.economic_terms.purchase_price = Number(data.price) || 0;
        loiNext.economic_terms.earnest_money.amount = Number(data.price) ? Number(data.price) * 0.01 : 0;
      }
      loiNext.parties.buyer_name = name ? name.trim() : '';
      setLoi(loiNext);
    } catch (err) {
      setError('Failed to load. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const setAgreementPath = (path, value) => {
    setAgreement((prev) => setNested(prev, path, value));
  };
  const setLoiPath = (path, value) => {
    setLoi((prev) => setNested(prev, path, value));
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price || 0);

  const ATTENTION_MSG =
    'Attention: By submitting an offer, you are entering into a legally binding agreement. If the seller accepts your offer, you may be obligated to purchase this property under the terms you specify. Do you wish to proceed?';

  const buildOffer = () => {
    const base = {
      propertyId,
      buyerId: user.uid,
      buyerEmail: verificationData?.buyerInfo?.email ?? '',
      buyerPhone: verificationData?.buyerInfo?.phone ?? '',
      verificationDocuments: verificationData ? {
        proofOfFunds: verificationData.proofOfFunds,
        preApprovalLetter: verificationData.preApprovalLetter,
        bankLetter: verificationData.bankLetter,
        governmentId: verificationData.governmentId,
      } : {},
      createdBy: user.uid,
    };
    if (documentType === 'loi') {
      const buyerName = (loi.parties.buyer_name || '').trim() || (verificationData?.buyerInfo?.name ?? '');
      const loiDate = loi.loi_metadata.date || new Date().toISOString().slice(0, 10);
      return {
        ...base,
        buyerName: buyerName || '',
        offerType: 'loi',
        loi: { ...loi, loi_metadata: { ...loi.loi_metadata, date: loiDate } },
        offerAmount: loi.economic_terms.purchase_price,
        proposedClosingDate: null,
      };
    }
    const effectiveDate = agreement.agreement_metadata.effective_date || new Date().toISOString().slice(0, 10);
    const buyerName = verificationData?.buyerInfo?.name ?? (agreement.parties.buyer.legal_names?.[0] ?? '');
    return {
      ...base,
      buyerName: buyerName.trim() || '',
      offerType: 'psa',
      agreement: {
        ...agreement,
        agreement_metadata: { ...agreement.agreement_metadata, effective_date: effectiveDate },
      },
      offerAmount: agreement.purchase_terms.purchase_price,
      proposedClosingDate: agreement.closing.closing_date ? new Date(agreement.closing.closing_date) : null,
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
  const goToReviewLoi = () => {
    setError(null);
    setSignatureName('');
    setStep('review');
  };

  const handleSaveDraft = async () => {
    if (!user?.uid || !propertyId) return;
    setError(null);
    try {
      const id = await savePsaDraft({
        propertyId,
        buyerId: user.uid,
        agreement,
        sourceLoiOfferId: location.state?.offerId ?? null,
        sourceLoi: sourceLoiRef ?? null,
      }, currentDraftId || undefined);
      setCurrentDraftId(id);
      navigate(`/dashboard?tab=deal-center&sub=sent`, { replace: true });
    } catch (err) {
      setError('Failed to save draft. Please try again.');
      console.error(err);
    }
  };

  const handleFinalSubmit = async () => {
    const expectedName = (verificationData?.buyerInfo?.name || (agreement.parties.buyer.legal_names?.[0] ?? '')).trim().toLowerCase();
    const signed = signatureName.trim().toLowerCase();
    if (expectedName && signed !== expectedName) {
      setError('Please type your full legal name exactly as it appears on this offer.');
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
      await createOffer(buildOffer());
      if (currentDraftId) {
        try { await deletePsaDraft(currentDraftId); } catch (_) {}
        setCurrentDraftId(null);
      }
      if (documentType === 'loi') {
        navigate(`/dashboard?tab=deal-center&sub=sent`, { replace: true });
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError('Failed to submit offer. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const parseNumber = (v) => (v === '' || v == null ? 0 : Number(v));
  const parseArrayFromComma = (s) => (typeof s === 'string' ? s.split(',').map((x) => x.trim()).filter(Boolean) : Array.isArray(s) ? s : []);

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
            <button onClick={() => navigate('/browse')} className="btn btn-primary">Browse More Properties</button>
            <button onClick={() => navigate(`/property/${propertyId}`)} className="btn btn-outline">View Property</button>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
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
          <h1>{sourceLoiRef ? 'Convert LOI to PSA' : 'Submit an Offer'}</h1>
          {property && (
            <div className="property-summary">
              <p className="property-address">{property.address}, {property.city}, {property.state}</p>
              {!sourceLoiRef && (
                <p className="property-price">Estimated Price: {formatPrice(property.funkEstimate ?? property.price)}</p>
              )}
            </div>
          )}
        </div>

        {sourceLoiRef && !dismissedLoiToPsaBump && (
          <GamificationNotification
            type="loi-to-psa"
            onDismiss={() => setDismissedLoiToPsaBump(true)}
          />
        )}

        {sourceLoiRef && (
          <div className="offer-view-loi-float" aria-hidden="true">
            <button type="button" className="offer-view-loi-btn" onClick={() => setShowViewLoiModal(true)}>
              View accepted LOI
            </button>
          </div>
        )}

        {sourceLoiRef && showViewLoiModal && (
          <div className="offer-view-loi-overlay" role="dialog" aria-modal="true" aria-labelledby="view-loi-title">
            <div className="offer-view-loi-modal">
              <div className="offer-view-loi-modal-header">
                <h2 id="view-loi-title">Accepted Letter of Intent</h2>
                <button type="button" className="offer-view-loi-close" onClick={() => setShowViewLoiModal(false)} aria-label="Close">×</button>
              </div>
              <div className="offer-view-loi-body">
                <section className="offer-view-loi-section">
                  <h3>Parties</h3>
                  <p><strong>Seller:</strong> {sourceLoiRef.parties?.seller_name || '—'}</p>
                  <p><strong>Buyer:</strong> {sourceLoiRef.parties?.buyer_name || '—'}</p>
                </section>
                <section className="offer-view-loi-section">
                  <h3>Property</h3>
                  <p>{[sourceLoiRef.property?.street_address, sourceLoiRef.property?.city, sourceLoiRef.property?.state, sourceLoiRef.property?.zip].filter(Boolean).join(', ') || '—'}</p>
                </section>
                <section className="offer-view-loi-section">
                  <h3>Economic terms</h3>
                  <p><strong>Purchase price:</strong> {formatPrice(sourceLoiRef.economic_terms?.purchase_price)}</p>
                  <p><strong>Earnest money:</strong> {formatPrice(sourceLoiRef.economic_terms?.earnest_money?.amount)} {sourceLoiRef.economic_terms?.earnest_money?.due_upon_psa_execution ? '(due upon PSA execution)' : ''}</p>
                </section>
                <section className="offer-view-loi-section">
                  <h3>Timeline</h3>
                  <p><strong>Due diligence:</strong> {sourceLoiRef.timeline?.due_diligence_days ?? '—'} days</p>
                  <p><strong>Target closing:</strong> {sourceLoiRef.timeline?.target_closing_days_after_psa ?? '—'} days after PSA</p>
                </section>
                <section className="offer-view-loi-section">
                  <h3>Financing</h3>
                  <p>Anticipated financing: {sourceLoiRef.financing?.anticipated_financing ? 'Yes' : 'No'}</p>
                  <p>Anticipated all cash: {sourceLoiRef.financing?.anticipated_all_cash ? 'Yes' : 'No'}</p>
                </section>
                <section className="offer-view-loi-section">
                  <h3>Condition of sale</h3>
                  <p>As-is purchase: {sourceLoiRef.condition_of_sale?.anticipated_as_is_purchase ? 'Yes' : 'No'}</p>
                  <p>Subject to inspections: {sourceLoiRef.condition_of_sale?.subject_to_inspections ? 'Yes' : 'No'}</p>
                </section>
                {sourceLoiRef.assignment && (sourceLoiRef.assignment.assignment_contemplated || sourceLoiRef.assignment.affiliate_assignment_allowed) && (
                  <section className="offer-view-loi-section">
                    <h3>Assignment</h3>
                    <p>Assignment contemplated: {sourceLoiRef.assignment.assignment_contemplated ? 'Yes' : 'No'}</p>
                    <p>Affiliate assignment allowed: {sourceLoiRef.assignment.affiliate_assignment_allowed ? 'Yes' : 'No'}</p>
                  </section>
                )}
                {sourceLoiRef.exclusivity?.exclusive && (
                  <section className="offer-view-loi-section">
                    <h3>Exclusivity</h3>
                    <p>Exclusive: {sourceLoiRef.exclusivity.exclusivity_period_days} days</p>
                  </section>
                )}
              </div>
            </div>
            <button type="button" className="offer-view-loi-backdrop" onClick={() => setShowViewLoiModal(false)} aria-label="Close modal" />
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {step === 'choose-type' && (
          <div className="offer-choose-type">
            {!congratsDismissed ? (
              <>
                <div className="offer-congrats-overlay" aria-modal="true" role="dialog">
                  <div className="offer-congrats-confetti" aria-hidden="true">
                    {confettiPieces.map((p) => (
                      <div
                        key={p.key}
                        className="offer-congrats-confetti-piece"
                        style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--delay': p.delay, '--color': p.color }}
                      />
                    ))}
                  </div>
                  <div className="offer-congrats-pop">
                    <h2 className="offer-congrats-pop-title">Congratulations!</h2>
                    <p className="offer-congrats-pop-message">
                      You&apos;re OpenTo transacting real estate via our platform. We guarantee it&apos;s easier than you think.
                    </p>
                    <p className="offer-congrats-pop-savings">
                      Estimate savings: {((property?.funkEstimate ?? property?.price) != null && Number.isFinite(Number(property.funkEstimate ?? property.price))) ? formatPrice(Number(property.funkEstimate ?? property.price) * 0.055) : '—'} (typical broker commission)
                    </p>
                    <button type="button" className="btn-primary offer-congrats-pop-cta" onClick={() => setCongratsDismissed(true)}>
                      Let&apos;s go!
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className="offer-choose-type-title">What would you like to send?</h2>
                <p className="offer-choose-type-intro">Choose a full Purchase and Sale Agreement (PSA) or start with a non-binding Letter of Intent (LOI).</p>
                <div className="offer-choose-type-cards">
                  <button
                    type="button"
                    className="offer-choose-type-card"
                    onClick={() => { setDocumentType('psa'); setStep('attention'); }}
                  >
                    <span className="offer-choose-type-card-title">Full Purchase and Sale Agreement</span>
                    <span className="offer-choose-type-card-desc">A complete, binding contract with all terms. Best when you and the seller are ready to commit.</span>
                  </button>
                  <button
                    type="button"
                    className="offer-choose-type-card"
                    onClick={() => { setDocumentType('loi'); setStep('loi-intro'); }}
                  >
                    <span className="offer-choose-type-card-title">Letter of Intent (LOI)</span>
                    <span className="offer-choose-type-card-desc">A shorter, non-binding outline of key terms. Use to gauge interest before negotiating a full PSA.</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

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
              onClick={() => setStep(property.availableForSale === false && property.acceptingOffers === true ? 'unlisted-ack' : 'form')}
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
              <input type="checkbox" checked={unlistedAcknowledged} onChange={(e) => setUnlistedAcknowledged(e.target.checked)} aria-describedby="offer-unlisted-ack-desc" />
              <span id="offer-unlisted-ack-desc">I acknowledge that this property is not formally listed. Willingness to sell, responsiveness, and disclosures may not be ready at this point. I understand the seller can get these in place if we move forward.</span>
            </label>
            <button type="button" className="btn-primary" disabled={!unlistedAcknowledged} onClick={() => setStep('form')}>
              Continue to Offer Form
            </button>
          </div>
        )}

        {step === 'loi-intro' && (
          <div className="offer-disclosures">
            <h2 className="offer-disclosures-title">Letter of Intent</h2>
            <p className="offer-disclosures-intro">
              A Letter of Intent is generally <strong>non-binding</strong> except for specific sections (e.g. governing law, confidentiality, exclusivity if selected). It outlines your proposed economic terms and timeline so the seller can gauge your interest before you both commit to a full Purchase and Sale Agreement.
            </p>
            <p className="offer-disclosures-intro">Complete the form on the next screen. Once signed, the LOI will be sent to the seller.</p>
            <button type="button" className="btn-primary" onClick={() => setStep('loi-form')}>
              Continue to LOI Form
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
              <input type="checkbox" checked={disclosureAcknowledged} onChange={(e) => setDisclosureAcknowledged(e.target.checked)} aria-describedby="offer-disclosures-desc" />
              <span id="offer-disclosures-desc">I have read the required disclosures above and acknowledge that I accept them. I understand that I am responsible for reviewing any seller-provided disclosures and for my own inspections and due diligence.</span>
            </label>
            <button type="button" className="btn-primary" disabled={!disclosureAcknowledged} onClick={() => setStep('form')}>
              Continue to Offer Form
            </button>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleReviewOffer} className="offer-form">
            {sourceLoiRef && (() => {
              const diffRows = getLoiToPsaDiff(sourceLoiRef, agreement, formatPrice);
              if (diffRows.length === 0) return null;
              return (
                <div className="form-section offer-convert-diff">
                  <h2>Changes from agreed LOI terms</h2>
                  <p className="form-hint">LOIs are non-binding. You may change terms; any changes from the accepted LOI are listed below.</p>
                  <ul className="offer-convert-diff-list">
                    {diffRows.map((row, i) => (
                      <li key={i} className="offer-convert-diff-row">
                        <span className="offer-convert-diff-label">{row.label}</span>
                        <span className="offer-convert-diff-loi">{row.loiValue}</span>
                        <span className="offer-convert-diff-arrow">→</span>
                        <span className="offer-convert-diff-psa">{row.psaValue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
            {/* Agreement metadata */}
            <div className="form-section">
              <h2>Agreement</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Agreement type</label>
                  <input type="text" value={agreement.agreement_metadata.agreement_type} onChange={(e) => setAgreementPath('agreement_metadata.agreement_type', e.target.value)} readOnly className="form-readonly" />
                </div>
                <div className="form-group">
                  <label>Version</label>
                  <input type="text" value={agreement.agreement_metadata.version} onChange={(e) => setAgreementPath('agreement_metadata.version', e.target.value)} readOnly className="form-readonly" />
                </div>
              </div>
            </div>

            {/* Parties */}
            <div className="form-section">
              <h2>Parties</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label-with-info">Seller legal name(s) <FieldInfoIcon description="Full legal name(s) of seller(s)." common="Comma-separated if multiple." /></label>
                  <input type="text" value={(agreement.parties.seller.legal_names || []).join(', ')} onChange={(e) => setAgreementPath('parties.seller.legal_names', parseArrayFromComma(e.target.value))} placeholder="e.g. Jane Doe, John Doe" />
                </div>
                <div className="form-group">
                  <label>Seller mailing address</label>
                  <input type="text" value={agreement.parties.seller.mailing_address} onChange={(e) => setAgreementPath('parties.seller.mailing_address', e.target.value)} placeholder="Street, City, State, Zip" />
                </div>
                <div className="form-group">
                  <label>Buyer legal name(s)</label>
                  <input type="text" value={(agreement.parties.buyer.legal_names || []).join(', ')} onChange={(e) => setAgreementPath('parties.buyer.legal_names', parseArrayFromComma(e.target.value))} placeholder="Your full legal name(s)" />
                </div>
                <div className="form-group">
                  <label>Buyer mailing address</label>
                  <input type="text" value={agreement.parties.buyer.mailing_address} onChange={(e) => setAgreementPath('parties.buyer.mailing_address', e.target.value)} placeholder="Your address" />
                </div>
              </div>
            </div>

            {/* Property */}
            <div className="form-section">
              <h2>Property</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Street address *</label>
                  <input type="text" value={agreement.property.street_address} onChange={(e) => setAgreementPath('property.street_address', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>City *</label>
                  <input type="text" value={agreement.property.city} onChange={(e) => setAgreementPath('property.city', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>State *</label>
                  <input type="text" value={agreement.property.state} onChange={(e) => setAgreementPath('property.state', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>ZIP *</label>
                  <input type="text" value={agreement.property.zip} onChange={(e) => setAgreementPath('property.zip', e.target.value)} required />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="contingency-checkbox">
                  <input type="checkbox" checked={agreement.property.legal_description?.provided} onChange={(e) => setAgreementPath('property.legal_description.provided', e.target.checked)} />
                  <span>Legal description provided</span>
                </label>
              </div>
              {(agreement.property.legal_description?.provided) && (
                <div className="form-grid" style={{ marginTop: 12 }}>
                  <div className="form-group">
                    <label>Legal description text</label>
                    <textarea value={agreement.property.legal_description?.text || ''} onChange={(e) => setAgreementPath('property.legal_description.text', e.target.value)} rows={2} />
                  </div>
                  <div className="form-group">
                    <label>Exhibit reference</label>
                    <input type="text" value={agreement.property.legal_description?.exhibit_reference || 'Exhibit A'} onChange={(e) => setAgreementPath('property.legal_description.exhibit_reference', e.target.value)} />
                  </div>
                </div>
              )}
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Included improvements</label>
                <input type="text" value={agreement.property.included_improvements} onChange={(e) => setAgreementPath('property.included_improvements', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Excluded items (comma-separated)</label>
                <input type="text" value={(agreement.property.excluded_items || []).join(', ')} onChange={(e) => setAgreementPath('property.excluded_items', parseArrayFromComma(e.target.value))} placeholder="e.g. chandelier, mirror" />
              </div>
            </div>

            {/* Purchase terms */}
            <div className="form-section">
              <h2>Purchase Terms</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Purchase price ($) *</label>
                  <input type="number" min={0} step={1000} value={agreement.purchase_terms.purchase_price || ''} onChange={(e) => setAgreementPath('purchase_terms.purchase_price', parseNumber(e.target.value))} required />
                  {((property?.funkEstimate ?? property?.price) != null) && (
                  <span className="form-hint">{formatPrice(agreement.purchase_terms.purchase_price)} — {agreement.purchase_terms.purchase_price >= (property.funkEstimate ?? property.price) ? 'at or above' : 'below'} estimated price</span>
                )}
                </div>
                <div className="form-group">
                  <label>Earnest money amount ($) *</label>
                  <input type="number" min={0} step={500} value={agreement.purchase_terms.earnest_money?.amount ?? ''} onChange={(e) => setAgreementPath('purchase_terms.earnest_money.amount', parseNumber(e.target.value))} required />
                </div>
                <div className="form-group">
                  <label>Earnest money due (days after effective date)</label>
                  <input type="number" min={0} value={agreement.purchase_terms.earnest_money?.due_days_after_effective_date ?? ''} onChange={(e) => setAgreementPath('purchase_terms.earnest_money.due_days_after_effective_date', parseNumber(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Earnest money holder name</label>
                  <input type="text" value={agreement.purchase_terms.earnest_money?.holder?.name ?? ''} onChange={(e) => setAgreementPath('purchase_terms.earnest_money.holder.name', e.target.value)} placeholder="Escrow or title company" />
                </div>
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={agreement.purchase_terms.earnest_money?.applied_to_purchase_price_at_closing !== false} onChange={(e) => setAgreementPath('purchase_terms.earnest_money.applied_to_purchase_price_at_closing', e.target.checked)} />
                    <span>Applied to purchase price at closing</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Closing */}
            <div className="form-section">
              <h2>Closing</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Closing date *</label>
                  <input type="date" value={agreement.closing.closing_date || ''} onChange={(e) => setAgreementPath('closing.closing_date', e.target.value)} min={new Date().toISOString().slice(0, 10)} required />
                </div>
                <div className="form-group">
                  <label>Closing method</label>
                  <select value={agreement.closing.closing_method} onChange={(e) => setAgreementPath('closing.closing_method', e.target.value)}>
                    <option value="remote">Remote</option>
                    <option value="in_person">In person</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Closing location</label>
                  <input type="text" value={agreement.closing.closing_location || ''} onChange={(e) => setAgreementPath('closing.closing_location', e.target.value)} placeholder="Address or N/A for remote" />
                </div>
                <div className="form-group">
                  <label>Title standard</label>
                  <select value={agreement.closing.deliverables?.title_standard} onChange={(e) => setAgreementPath('closing.deliverables.title_standard', e.target.value)}>
                    <option value="marketable">Marketable</option>
                    <option value="insurable">Insurable</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Deed type</label>
                  <select value={agreement.closing.deliverables?.deed_type} onChange={(e) => setAgreementPath('closing.deliverables.deed_type', e.target.value)}>
                    <option value="customary">Customary</option>
                    <option value="warranty">Warranty</option>
                    <option value="quitclaim">Quitclaim</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Title review */}
            <div className="form-section">
              <h2>Title Review</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Review period (days)</label>
                  <input type="number" min={0} value={agreement.title_review.review_period_days ?? ''} onChange={(e) => setAgreementPath('title_review.review_period_days', parseNumber(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Objection deadline (days before closing)</label>
                  <input type="number" min={0} value={agreement.title_review.objection_deadline_days_before_closing ?? ''} onChange={(e) => setAgreementPath('title_review.objection_deadline_days_before_closing', parseNumber(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={agreement.title_review.seller_cure_right} onChange={(e) => setAgreementPath('title_review.seller_cure_right', e.target.checked)} />
                    <span>Seller cure right</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Property condition */}
            <div className="form-section">
              <h2>Property Condition</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Sale condition</label>
                  <select value={agreement.property_condition.sale_condition} onChange={(e) => setAgreementPath('property_condition.sale_condition', e.target.value)}>
                    <option value="as_is_where_is">As-is, where-is</option>
                    <option value="seller_disclosure">Seller disclosure</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={agreement.property_condition.buyer_no_reliance} onChange={(e) => setAgreementPath('property_condition.buyer_no_reliance', e.target.checked)} />
                    <span>Buyer no reliance</span>
                  </label>
                </div>
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={agreement.property_condition.statutory_disclosures_required} onChange={(e) => setAgreementPath('property_condition.statutory_disclosures_required', e.target.checked)} />
                    <span>Statutory disclosures required</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Inspection / due diligence */}
            <div className="form-section">
              <h2>Inspection &amp; Due Diligence</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Inspection period (days)</label>
                  <input type="number" min={0} value={agreement.inspection_due_diligence.inspection_period_days ?? ''} onChange={(e) => setAgreementPath('inspection_due_diligence.inspection_period_days', parseNumber(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={agreement.inspection_due_diligence.buyer_rights?.may_terminate_during_period} onChange={(e) => setAgreementPath('inspection_due_diligence.buyer_rights.may_terminate_during_period', e.target.checked)} />
                    <span>Buyer may terminate during period</span>
                  </label>
                </div>
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={agreement.inspection_due_diligence.buyer_rights?.termination_requires_written_notice} onChange={(e) => setAgreementPath('inspection_due_diligence.buyer_rights.termination_requires_written_notice', e.target.checked)} />
                    <span>Termination requires written notice</span>
                  </label>
                </div>
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={agreement.inspection_due_diligence.earnest_money_refund_on_termination} onChange={(e) => setAgreementPath('inspection_due_diligence.earnest_money_refund_on_termination', e.target.checked)} />
                    <span>Earnest money refund on termination</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Financing */}
            <div className="form-section">
              <h2>Financing</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={agreement.financing.financing_contingency} onChange={(e) => setAgreementPath('financing.financing_contingency', e.target.checked)} />
                    <span>Financing contingency</span>
                  </label>
                </div>
                <div className="form-group">
                  <label>Loan type</label>
                  <select value={agreement.financing.loan_type} onChange={(e) => setAgreementPath('financing.loan_type', e.target.value)}>
                    <option value="">—</option>
                    <option value="cash">Cash</option>
                    <option value="conventional">Conventional</option>
                    <option value="fha">FHA</option>
                    <option value="va">VA</option>
                    <option value="usda">USDA</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Loan amount ($)</label>
                  <input type="number" min={0} step={1000} value={agreement.financing.loan_amount || ''} onChange={(e) => setAgreementPath('financing.loan_amount', parseNumber(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Commitment deadline</label>
                  <input type="date" value={agreement.financing.commitment_deadline || ''} onChange={(e) => setAgreementPath('financing.commitment_deadline', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={agreement.financing.buyer_good_faith_effort_required} onChange={(e) => setAgreementPath('financing.buyer_good_faith_effort_required', e.target.checked)} />
                    <span>Buyer good-faith effort required</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Prorations and costs */}
            <div className="form-section">
              <h2>Prorations &amp; Costs</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Tax proration</label>
                  <select value={agreement.prorations_and_costs.tax_proration} onChange={(e) => setAgreementPath('prorations_and_costs.tax_proration', e.target.value)}>
                    <option value="as_of_closing">As of closing</option>
                    <option value="as_of_possession">As of possession</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Rent proration</label>
                  <select value={agreement.prorations_and_costs.rent_proration} onChange={(e) => setAgreementPath('prorations_and_costs.rent_proration', e.target.value)}>
                    <option value="as_of_closing">As of closing</option>
                    <option value="as_of_possession">As of possession</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Escrow and title costs</label>
                  <select value={agreement.prorations_and_costs.escrow_and_title_costs} onChange={(e) => setAgreementPath('prorations_and_costs.escrow_and_title_costs', e.target.value)}>
                    <option value="split_equally">Split equally</option>
                    <option value="buyer_pays">Buyer pays</option>
                    <option value="seller_pays">Seller pays</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Risk of loss */}
            <div className="form-section">
              <h2>Risk of Loss</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Risk holder pre-closing</label>
                  <select value={agreement.risk_of_loss.risk_holder_pre_closing} onChange={(e) => setAgreementPath('risk_of_loss.risk_holder_pre_closing', e.target.value)}>
                    <option value="seller">Seller</option>
                    <option value="buyer">Buyer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Casualty threshold</label>
                  <select value={agreement.risk_of_loss.casualty_threshold} onChange={(e) => setAgreementPath('risk_of_loss.casualty_threshold', e.target.value)}>
                    <option value="material">Material</option>
                    <option value="substantial">Substantial</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Default and remedies */}
            <div className="form-section">
              <h2>Default &amp; Remedies</h2>
              <div className="contingencies-list">
                <div className="contingency-item">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={agreement.default_and_remedies.buyer_default?.earnest_money_as_liquidated_damages} onChange={(e) => setAgreementPath('default_and_remedies.buyer_default.earnest_money_as_liquidated_damages', e.target.checked)} />
                    <span>Earnest money as liquidated damages (buyer default)</span>
                  </label>
                </div>
                <div className="contingency-item">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={agreement.default_and_remedies.buyer_default?.subject_to_state_law} onChange={(e) => setAgreementPath('default_and_remedies.buyer_default.subject_to_state_law', e.target.checked)} />
                    <span>Subject to state law</span>
                  </label>
                </div>
              </div>
              <p className="contingencies-intro">Seller default: buyer remedies include return of earnest money and legal or equitable relief (per agreement).</p>
            </div>

            {/* Representations — display only or checkboxes */}
            <div className="form-section">
              <h2>Representations</h2>
              <p className="contingencies-intro">Seller: authority to convey, no undisclosed liens, no pending condemnation unless disclosed. Buyer: authority to enter agreement.</p>
            </div>

            {/* Assignment */}
            <div className="form-section">
              <h2>Assignment</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={agreement.assignment.assignment_allowed} onChange={(e) => setAgreementPath('assignment.assignment_allowed', e.target.checked)} />
                    <span>Assignment allowed</span>
                  </label>
                </div>
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={agreement.assignment.seller_consent_required} onChange={(e) => setAgreementPath('assignment.seller_consent_required', e.target.checked)} />
                    <span>Seller consent required</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Governing law */}
            <div className="form-section">
              <h2>Governing Law &amp; Venue</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Governing law</label>
                  <select value={agreement.governing_law_and_venue.governing_law} onChange={(e) => setAgreementPath('governing_law_and_venue.governing_law', e.target.value)}>
                    <option value="property_state">Property state</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Venue</label>
                  <select value={agreement.governing_law_and_venue.venue} onChange={(e) => setAgreementPath('governing_law_and_venue.venue', e.target.value)}>
                    <option value="property_county">Property county</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Miscellaneous */}
            <div className="form-section">
              <h2>Miscellaneous</h2>
              <div className="contingencies-list">
                {['entire_agreement', 'amendments_in_writing_only', 'electronic_signatures_allowed', 'severability', 'time_is_of_the_essence'].map((key) => (
                  <div key={key} className="contingency-item">
                    <label className="contingency-checkbox">
                      <input type="checkbox" checked={agreement.miscellaneous[key]} onChange={(e) => setAgreementPath(`miscellaneous.${key}`, e.target.checked)} />
                      <span>{key.replace(/_/g, ' ')}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => navigate(`/property/${propertyId}`)} className="btn-secondary">Cancel</button>
              {documentType === 'psa' && (
                <button type="button" className="btn btn-outline" onClick={handleSaveDraft}>
                  Save draft
                </button>
              )}
              <button type="submit" className="btn-primary">Review Offer</button>
            </div>
          </form>
        )}

        {step === 'loi-form' && (
          <div className="offer-form">
            <div className="form-section">
              <h2>LOI — Document</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Document type</label>
                  <input type="text" value={loi.loi_metadata.document_type} readOnly className="form-readonly" />
                </div>
                <div className="form-group">
                  <label>Binding status</label>
                  <input type="text" value={loi.loi_metadata.binding_status} readOnly className="form-readonly" />
                </div>
                <div className="form-group">
                  <label>Version</label>
                  <input type="text" value={loi.loi_metadata.version} readOnly className="form-readonly" />
                </div>
              </div>
            </div>
            <div className="form-section">
              <h2>Parties</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Seller name *</label>
                  <input type="text" value={loi.parties.seller_name} onChange={(e) => setLoiPath('parties.seller_name', e.target.value)} placeholder="Seller legal name" required />
                </div>
                <div className="form-group">
                  <label>Buyer name *</label>
                  <input type="text" value={loi.parties.buyer_name} onChange={(e) => setLoiPath('parties.buyer_name', e.target.value)} placeholder="Your full legal name" required />
                </div>
              </div>
            </div>
            <div className="form-section">
              <h2>Property</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Street address *</label>
                  <input type="text" value={loi.property.street_address} onChange={(e) => setLoiPath('property.street_address', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>City *</label>
                  <input type="text" value={loi.property.city} onChange={(e) => setLoiPath('property.city', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>State *</label>
                  <input type="text" value={loi.property.state} onChange={(e) => setLoiPath('property.state', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>ZIP *</label>
                  <input type="text" value={loi.property.zip} onChange={(e) => setLoiPath('property.zip', e.target.value)} required />
                </div>
              </div>
            </div>
            <div className="form-section">
              <h2>Economic Terms</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Purchase price ($) *</label>
                  <input type="number" min={0} step={1000} value={loi.economic_terms.purchase_price || ''} onChange={(e) => setLoiPath('economic_terms.purchase_price', parseNumber(e.target.value))} required />
                </div>
                <div className="form-group">
                  <label>Earnest money ($) *</label>
                  <input type="number" min={0} step={500} value={loi.economic_terms.earnest_money?.amount ?? ''} onChange={(e) => setLoiPath('economic_terms.earnest_money.amount', parseNumber(e.target.value))} required />
                </div>
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={loi.economic_terms.earnest_money?.due_upon_psa_execution !== false} onChange={(e) => setLoiPath('economic_terms.earnest_money.due_upon_psa_execution', e.target.checked)} />
                    <span>Earnest money due upon PSA execution</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="form-section">
              <h2>Timeline</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Target closing (days after PSA)</label>
                  <input type="number" min={0} value={loi.timeline.target_closing_days_after_psa ?? ''} onChange={(e) => setLoiPath('timeline.target_closing_days_after_psa', parseNumber(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Due diligence (days)</label>
                  <input type="number" min={0} value={loi.timeline.due_diligence_days ?? ''} onChange={(e) => setLoiPath('timeline.due_diligence_days', parseNumber(e.target.value))} />
                </div>
              </div>
            </div>
            <div className="form-section">
              <h2>Financing</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={loi.financing.anticipated_financing} onChange={(e) => setLoiPath('financing.anticipated_financing', e.target.checked)} />
                    <span>Anticipated financing</span>
                  </label>
                </div>
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={loi.financing.anticipated_all_cash} onChange={(e) => setLoiPath('financing.anticipated_all_cash', e.target.checked)} />
                    <span>Anticipated all cash</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="form-section">
              <h2>Condition of Sale</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={loi.condition_of_sale.anticipated_as_is_purchase} onChange={(e) => setLoiPath('condition_of_sale.anticipated_as_is_purchase', e.target.checked)} />
                    <span>Anticipated as-is purchase</span>
                  </label>
                </div>
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={loi.condition_of_sale.subject_to_inspections} onChange={(e) => setLoiPath('condition_of_sale.subject_to_inspections', e.target.checked)} />
                    <span>Subject to inspections</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="form-section">
              <h2>Assignment</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={loi.assignment.assignment_contemplated} onChange={(e) => setLoiPath('assignment.assignment_contemplated', e.target.checked)} />
                    <span>Assignment contemplated</span>
                  </label>
                </div>
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={loi.assignment.affiliate_assignment_allowed} onChange={(e) => setLoiPath('assignment.affiliate_assignment_allowed', e.target.checked)} />
                    <span>Affiliate assignment allowed</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="form-section">
              <h2>Exclusivity</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={loi.exclusivity.exclusive} onChange={(e) => setLoiPath('exclusivity.exclusive', e.target.checked)} />
                    <span>Exclusive</span>
                  </label>
                </div>
                <div className="form-group">
                  <label>Exclusivity period (days)</label>
                  <input type="number" min={0} value={loi.exclusivity.exclusivity_period_days ?? ''} onChange={(e) => setLoiPath('exclusivity.exclusivity_period_days', parseNumber(e.target.value))} />
                </div>
              </div>
            </div>
            <div className="form-section">
              <h2>Legal</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label className="contingency-checkbox">
                    <input type="checkbox" checked={loi.legal.non_binding} onChange={(e) => setLoiPath('legal.non_binding', e.target.checked)} />
                    <span>Non-binding (except specified sections)</span>
                  </label>
                </div>
                <div className="form-group">
                  <label>Governing law</label>
                  <select value={loi.legal.governing_law} onChange={(e) => setLoiPath('legal.governing_law', e.target.value)}>
                    <option value="property_state">Property state</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <p className="contingencies-intro">Binding sections typically include: governing law, confidentiality, and exclusivity (if selected).</p>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => navigate(`/property/${propertyId}`)} className="btn-secondary">Cancel</button>
              <button type="button" className="btn-primary" onClick={goToReviewLoi}>Review LOI</button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="offer-review">
            <h2 className="offer-review-title">{documentType === 'loi' ? 'Review Your Letter of Intent' : 'Review Your Offer'}</h2>
            <p className="offer-review-hint">Please confirm all terms below. Type your full legal name to sign and submit.</p>

            {documentType === 'psa' && sourceLoiRef && (() => {
              const diffRows = getLoiToPsaDiff(sourceLoiRef, agreement, formatPrice);
              if (diffRows.length === 0) return null;
              return (
                <div className="offer-review-section offer-convert-diff">
                  <h3>Changes from agreed LOI terms</h3>
                  <p className="form-hint">These terms differ from the accepted LOI (LOIs are non-binding).</p>
                  <ul className="offer-convert-diff-list">
                    {diffRows.map((row, i) => (
                      <li key={i} className="offer-convert-diff-row">
                        <span className="offer-convert-diff-label">{row.label}</span>
                        <span className="offer-convert-diff-loi">{row.loiValue}</span>
                        <span className="offer-convert-diff-arrow">→</span>
                        <span className="offer-convert-diff-psa">{row.psaValue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {documentType === 'loi' ? (
              <>
                <div className="offer-review-section">
                  <h3>Document</h3>
                  <ul className="offer-review-list">
                    <li>{loi.loi_metadata.document_type} — {loi.loi_metadata.version}</li>
                    <li>Status: {loi.loi_metadata.binding_status}</li>
                  </ul>
                </div>
                <div className="offer-review-section">
                  <h3>Parties</h3>
                  <ul className="offer-review-list">
                    <li>Seller: {loi.parties.seller_name || '—'}</li>
                    <li>Buyer: {loi.parties.buyer_name || '—'}</li>
                  </ul>
                </div>
                <div className="offer-review-section">
                  <h3>Property</h3>
                  <ul className="offer-review-list">
                    <li>{[loi.property.street_address, loi.property.city, loi.property.state, loi.property.zip].filter(Boolean).join(', ')}</li>
                  </ul>
                </div>
                <div className="offer-review-section">
                  <h3>Economic Terms</h3>
                  <ul className="offer-review-list">
                    <li>Purchase price: {formatPrice(loi.economic_terms.purchase_price)}</li>
                    <li>Earnest money: {formatPrice(loi.economic_terms.earnest_money?.amount)} — due upon PSA execution: {loi.economic_terms.earnest_money?.due_upon_psa_execution ? 'Yes' : 'No'}</li>
                  </ul>
                </div>
                <div className="offer-review-section">
                  <h3>Timeline</h3>
                  <ul className="offer-review-list">
                    <li>Target closing: {loi.timeline.target_closing_days_after_psa ?? '—'} days after PSA</li>
                    <li>Due diligence: {loi.timeline.due_diligence_days ?? '—'} days</li>
                  </ul>
                </div>
                <div className="offer-review-section">
                  <h3>Financing &amp; Condition</h3>
                  <ul className="offer-review-list">
                    <li>Anticipated financing: {loi.financing.anticipated_financing ? 'Yes' : 'No'}</li>
                    <li>Anticipated all cash: {loi.financing.anticipated_all_cash ? 'Yes' : 'No'}</li>
                    <li>As-is purchase: {loi.condition_of_sale.anticipated_as_is_purchase ? 'Yes' : 'No'}</li>
                    <li>Subject to inspections: {loi.condition_of_sale.subject_to_inspections ? 'Yes' : 'No'}</li>
                  </ul>
                </div>
                <div className="offer-review-section">
                  <h3>Assignment &amp; Exclusivity</h3>
                  <ul className="offer-review-list">
                    <li>Assignment contemplated: {loi.assignment.assignment_contemplated ? 'Yes' : 'No'}</li>
                    <li>Exclusive: {loi.exclusivity.exclusive ? 'Yes' : 'No'}{loi.exclusivity.exclusive ? ` (${loi.exclusivity.exclusivity_period_days} days)` : ''}</li>
                  </ul>
                </div>
                <div className="offer-review-section">
                  <h3>Legal</h3>
                  <ul className="offer-review-list">
                    <li>Non-binding: {loi.legal.non_binding ? 'Yes' : 'No'}</li>
                    <li>Governing law: {loi.legal.governing_law}</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <div className="offer-review-section">
                  <h3>Agreement</h3>
                  <ul className="offer-review-list">
                    <li>{agreement.agreement_metadata.agreement_type} — {agreement.agreement_metadata.version}</li>
                  </ul>
                </div>
                <div className="offer-review-section">
                  <h3>Property</h3>
                  <ul className="offer-review-list">
                    <li>{[agreement.property.street_address, agreement.property.city, agreement.property.state, agreement.property.zip].filter(Boolean).join(', ')}</li>
                  </ul>
                </div>
                <div className="offer-review-section">
                  <h3>Purchase Terms</h3>
                  <ul className="offer-review-list">
                    <li>Purchase price: {formatPrice(agreement.purchase_terms.purchase_price)}</li>
                    <li>Earnest money: {formatPrice(agreement.purchase_terms.earnest_money?.amount)} — due {agreement.purchase_terms.earnest_money?.due_days_after_effective_date} days after effective date</li>
                    <li>Holder: {agreement.purchase_terms.earnest_money?.holder?.name || '—'}</li>
                  </ul>
                </div>
                <div className="offer-review-section">
                  <h3>Closing</h3>
                  <ul className="offer-review-list">
                    <li>Date: {agreement.closing.closing_date || '—'}</li>
                    <li>Method: {agreement.closing.closing_method}</li>
                    <li>Title: {agreement.closing.deliverables?.title_standard}, Deed: {agreement.closing.deliverables?.deed_type}</li>
                  </ul>
                </div>
                <div className="offer-review-section">
                  <h3>Title, Condition &amp; Inspection</h3>
                  <ul className="offer-review-list">
                    <li>Title review: {agreement.title_review.review_period_days} days; objection {agreement.title_review.objection_deadline_days_before_closing} days before closing</li>
                    <li>Sale condition: {agreement.property_condition.sale_condition}</li>
                    <li>Inspection period: {agreement.inspection_due_diligence.inspection_period_days} days</li>
                  </ul>
                </div>
                <div className="offer-review-section">
                  <h3>Financing</h3>
                  <ul className="offer-review-list">
                    <li>Contingency: {agreement.financing.financing_contingency ? 'Yes' : 'No'}</li>
                    {agreement.financing.loan_type && <li>Loan type: {agreement.financing.loan_type}</li>}
                    {agreement.financing.loan_amount > 0 && <li>Loan amount: {formatPrice(agreement.financing.loan_amount)}</li>}
                  </ul>
                </div>
                <div className="offer-review-section">
                  <h3>Costs &amp; Risk</h3>
                  <ul className="offer-review-list">
                    <li>Tax/rent proration: {agreement.prorations_and_costs.tax_proration}; escrow/title: {agreement.prorations_and_costs.escrow_and_title_costs}</li>
                    <li>Risk: {agreement.risk_of_loss.risk_holder_pre_closing}; casualty: {agreement.risk_of_loss.casualty_threshold}</li>
                  </ul>
                </div>
              </>
            )}

            <div className="offer-review-sign">
              <label htmlFor="offer-signature">Type your full legal name to confirm and sign</label>
              <input
                id="offer-signature"
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder={documentType === 'loi' ? (loi.parties.buyer_name || verificationData?.buyerInfo?.name || 'Your full legal name') : (verificationData?.buyerInfo?.name || agreement.parties.buyer.legal_names?.[0] || 'Your full legal name')}
                className="offer-review-sign-input"
                autoComplete="name"
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => { setError(null); setStep(documentType === 'loi' ? 'loi-form' : 'form'); }}>Back</button>
              <button type="button" className="btn-primary" disabled={submitting} onClick={handleFinalSubmit}>
                {submitting ? 'Submitting...' : documentType === 'loi' ? 'Submit LOI' : 'Submit Offer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmitOffer;
