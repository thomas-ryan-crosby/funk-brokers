import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPreListingChecklist, savePreListingChecklist, isPreListingChecklistComplete } from '../services/preListingChecklistService';
import { getVendorsByUser, VENDOR_TYPES } from '../services/vendorService';
import { uploadFile } from '../services/storageService';
import CompsMap from '../components/CompsMap';
import './PreListingChecklist.css';

const PreListingChecklist = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState([]);

  // Step 1: Legal Authority
  const [step1Data, setStep1Data] = useState({
    questionnaire: {
      currentOwnership: '',
      allOwnersOnBoard: '',
      trustEstateLLC: '',
      signingAuthority: '',
      powerOfAttorney: '',
    },
    deedUrl: null,
    assignedVendorId: null,
    completed: false,
  });

  // Step 2: Title & Ownership
  const [step2Data, setStep2Data] = useState({
    questionnaire: {
      outstandingMortgages: '',
      judgmentsLiens: '',
      unreleasedMortgages: '',
      boundaryIssues: '',
    },
    completed: false,
  });

  // Step 3: Listing Strategy
  const [step3Data, setStep3Data] = useState({
    needsSupport: false,
    cmaCompleted: false,
    listPrice: '',
    timing: '',
    targetBuyer: '',
    repairsStrategy: '',
    concessionsStrategy: '',
    verifiedComps: [], // Array of { parcelId, address, latitude, longitude, closingValue }
    completed: false,
  });
  const [mapCenter, setMapCenter] = useState(null);

  // Step 4: Disclosures
  const [step4Data, setStep4Data] = useState({
    propertyCondition: false,
    leadPaint: false,
    hoaDisclosures: false,
    floodZone: false,
    knownDefects: false,
    priorRepairs: false,
    insuranceClaims: false,
    disclosureFiles: [],
    completed: false,
  });

  // Step 5: Property Prep
  const [step5Data, setStep5Data] = useState({
    cleaning: false,
    decluttering: false,
    staging: false,
    minorRepairs: false,
    landscaping: false,
    appliancesDecision: false,
    securedItems: false,
    completed: false,
  });

  // Step 6: Marketing Assets
  const [step6Data, setStep6Data] = useState({
    professionalPhotos: false,
    floorPlans: false,
    videoDrone: false,
    description: false,
    featureHighlights: false,
    photoFiles: [],
    completed: false,
  });

  // Step 7: Showings & Offers
  const [step7Data, setStep7Data] = useState({
    lockboxPlan: false,
    showingRestrictions: false,
    offerInstructions: false,
    sellerAvailability: false,
    timelineExpectations: false,
    completed: false,
  });

  const [uploadingFiles, setUploadingFiles] = useState({});
  const [requestingSupport, setRequestingSupport] = useState({});

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/sign-in?redirect=/pre-listing-checklist');
      return;
    }
    loadChecklist();
  }, [isAuthenticated, authLoading, navigate]);

  // Auto-save step data when it changes (debounced) - only save incomplete steps
  useEffect(() => {
    if (!user?.uid || loading || step1Data.completed) return;
    const timer = setTimeout(() => {
      saveStep(1, step1Data);
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(step1Data.questionnaire), step1Data.deedUrl, step1Data.assignedVendorId]);

  useEffect(() => {
    if (!user?.uid || loading || step2Data.completed) return;
    const timer = setTimeout(() => {
      saveStep(2, step2Data);
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(step2Data.questionnaire)]);

  useEffect(() => {
    if (!user?.uid || loading || step3Data.completed) return;
    const timer = setTimeout(() => {
      saveStep(3, step3Data);
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step3Data.needsSupport, step3Data.listPrice, step3Data.timing, step3Data.targetBuyer, step3Data.repairsStrategy, step3Data.concessionsStrategy, step3Data.verifiedComps?.length]);

  useEffect(() => {
    if (!user?.uid || loading || step4Data.completed) return;
    const timer = setTimeout(() => {
      saveStep(4, step4Data);
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step4Data.propertyCondition, step4Data.leadPaint, step4Data.hoaDisclosures, step4Data.floodZone, step4Data.knownDefects, step4Data.priorRepairs, step4Data.insuranceClaims, step4Data.disclosureFiles?.length]);

  useEffect(() => {
    if (!user?.uid || loading || step5Data.completed) return;
    const timer = setTimeout(() => {
      saveStep(5, step5Data);
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step5Data.cleaning, step5Data.decluttering, step5Data.staging, step5Data.minorRepairs, step5Data.landscaping, step5Data.appliancesDecision, step5Data.securedItems]);

  useEffect(() => {
    if (!user?.uid || loading || step6Data.completed) return;
    const timer = setTimeout(() => {
      saveStep(6, step6Data);
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step6Data.professionalPhotos, step6Data.floorPlans, step6Data.videoDrone, step6Data.description, step6Data.featureHighlights, step6Data.photoFiles?.length]);

  useEffect(() => {
    if (!user?.uid || loading || step7Data.completed) return;
    const timer = setTimeout(() => {
      saveStep(7, step7Data);
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step7Data.lockboxPlan, step7Data.showingRestrictions, step7Data.offerInstructions, step7Data.sellerAvailability, step7Data.timelineExpectations]);

  const loadChecklist = async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      const saved = await getPreListingChecklist(user.uid);
      const vendorsList = await getVendorsByUser(user.uid);
      setVendors(vendorsList);

      if (saved) {
        setChecklist(saved);
      if (saved.step1LegalAuthority) {
        setStep1Data(saved.step1LegalAuthority);
        // Set map center from deed location if available, or use a default
        if (saved.step1LegalAuthority.deedLocation) {
          setMapCenter(saved.step1LegalAuthority.deedLocation);
        }
      }
      if (saved.step2TitleOwnership) setStep2Data(saved.step2TitleOwnership);
      if (saved.step3ListingStrategy) {
        setStep3Data(saved.step3ListingStrategy);
        // Set map center from first comp if available
        if (saved.step3ListingStrategy.verifiedComps && saved.step3ListingStrategy.verifiedComps.length > 0) {
          const firstComp = saved.step3ListingStrategy.verifiedComps[0];
          if (firstComp.latitude && firstComp.longitude) {
            setMapCenter({ lat: firstComp.latitude, lng: firstComp.longitude });
          }
        }
      }
      if (saved.step4Disclosures) setStep4Data(saved.step4Disclosures);
      if (saved.step5PropertyPrep) setStep5Data(saved.step5PropertyPrep);
      if (saved.step6MarketingAssets) setStep6Data(saved.step6MarketingAssets);
      if (saved.step7ShowingsOffers) setStep7Data(saved.step7ShowingsOffers);
      if (saved.currentStep) setCurrentStep(saved.currentStep);
      }
    } catch (err) {
      console.error('Error loading checklist:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveStep = async (stepNum, stepData) => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const updates = {
        [`step${stepNum}${stepNum === 1 ? 'LegalAuthority' : stepNum === 2 ? 'TitleOwnership' : stepNum === 3 ? 'ListingStrategy' : stepNum === 4 ? 'Disclosures' : stepNum === 5 ? 'PropertyPrep' : stepNum === 6 ? 'MarketingAssets' : 'ShowingsOffers'}`]: stepData,
        currentStep: Math.max(currentStep, stepNum),
      };
      await savePreListingChecklist(user.uid, updates);
      setChecklist((prev) => ({ ...prev, ...updates }));
    } catch (err) {
      console.error('Error saving step:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (stepNum, field, file) => {
    if (!file) return;
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File must be under 10MB');
      return;
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      alert('File must be PDF, JPG, or PNG');
      return;
    }
    setUploadingFiles((prev) => ({ ...prev, [`${stepNum}_${field}`]: true }));
    try {
      const ext = file.name.split('.').pop();
      const path = `pre-listing/${user.uid}/${Date.now()}_${field}.${ext}`;
      const url = await uploadFile(file, path);
      if (stepNum === 1 && field === 'deed') {
        const updated = { ...step1Data, deedUrl: url };
        setStep1Data(updated);
        await saveStep(1, updated);
      } else if (stepNum === 4) {
        const updated = { ...step4Data, disclosureFiles: [...(step4Data.disclosureFiles || []), { url, name: file.name }] };
        setStep4Data(updated);
        await saveStep(4, updated);
      } else if (stepNum === 6) {
        const updated = { ...step6Data, photoFiles: [...(step6Data.photoFiles || []), { url, name: file.name }] };
        setStep6Data(updated);
        await saveStep(6, updated);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload file.');
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [`${stepNum}_${field}`]: false }));
    }
  };

  const handleRequestSupport = async (stepNum) => {
    setRequestingSupport((prev) => ({ ...prev, [stepNum]: true }));
    // TODO: Implement support request (email, notification, etc.)
    setTimeout(() => {
      alert('Professional support request submitted. A team member will contact you shortly.');
      setRequestingSupport((prev) => ({ ...prev, [stepNum]: false }));
    }, 500);
  };

  const markStepComplete = async (stepNum) => {
    let stepData;
    if (stepNum === 1) {
      const q = step1Data.questionnaire;
      if (!q.currentOwnership || !q.allOwnersOnBoard || !q.trustEstateLLC || !q.powerOfAttorney) {
        alert('Please complete all questionnaire questions.');
        return;
      }
      if (!step1Data.deedUrl) {
        alert('Please upload the most recent deed.');
        return;
      }
      if (!step1Data.assignedVendorId) {
        alert('Please assign a legal representative vendor.');
        return;
      }
      stepData = { ...step1Data, completed: true };
      setStep1Data(stepData);
    } else if (stepNum === 2) {
      const q = step2Data.questionnaire;
      if (!q.outstandingMortgages || !q.judgmentsLiens || !q.unreleasedMortgages || !q.boundaryIssues) {
        alert('Please complete all questionnaire questions.');
        return;
      }
      stepData = { ...step2Data, completed: true };
      setStep2Data(stepData);
    } else if (stepNum === 3) {
      if (step3Data.needsSupport) {
        stepData = { ...step3Data, completed: true };
        setStep3Data(stepData);
      } else {
        if (!step3Data.listPrice || !step3Data.timing || !step3Data.targetBuyer) {
          alert('Please complete all required fields.');
          return;
        }
        // Validate comps if any are selected
        const comps = step3Data.verifiedComps || [];
        if (comps.length > 0) {
          const incompleteComps = comps.filter((c) => !c.closingValue || !c.closingValue.trim());
          if (incompleteComps.length > 0) {
            alert('Please enter closing values for all selected comparables.');
            return;
          }
        }
        stepData = { ...step3Data, completed: true };
        setStep3Data(stepData);
      }
    } else if (stepNum === 4) {
      if (!step4Data.propertyCondition || !step4Data.leadPaint || !step4Data.knownDefects) {
        alert('Please complete all required disclosures.');
        return;
      }
      stepData = { ...step4Data, completed: true };
      setStep4Data(stepData);
    } else if (stepNum === 5) {
      stepData = { ...step5Data, completed: true };
      setStep5Data(stepData);
    } else if (stepNum === 6) {
      if (!step6Data.professionalPhotos || !step6Data.description) {
        alert('Professional photos and description are required.');
        return;
      }
      stepData = { ...step6Data, completed: true };
      setStep6Data(stepData);
    } else if (stepNum === 7) {
      if (!step7Data.lockboxPlan || !step7Data.offerInstructions) {
        alert('Please complete all required fields.');
        return;
      }
      stepData = { ...step7Data, completed: true };
      setStep7Data(stepData);
    }
    await saveStep(stepNum, stepData);
  };

  const allStepsComplete = () => {
    return (
      step1Data.completed &&
      step2Data.completed &&
      step3Data.completed &&
      step4Data.completed &&
      step5Data.completed &&
      step6Data.completed &&
      step7Data.completed
    );
  };

  const handleContinueToListing = () => {
    if (allStepsComplete()) {
      const returnTo = location.state?.returnTo || '/list-property';
      navigate(returnTo);
    } else {
      alert('Please complete all steps before listing your property.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="pre-listing-checklist-page">
        <div className="loading-state">Loading checklist...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const steps = [
    { num: 1, title: 'Confirm Legal Authority to Sell', data: step1Data },
    { num: 2, title: 'Resolve Title & Ownership Issues', data: step2Data },
    { num: 3, title: 'Determine Listing Strategy & Pricing', data: step3Data },
    { num: 4, title: 'Complete Required Seller Disclosures', data: step4Data },
    { num: 5, title: 'Prepare the Property', data: step5Data },
    { num: 6, title: 'Create Marketing Assets', data: step6Data },
    { num: 7, title: 'Verify Showing & Offer Logistics', data: step7Data },
  ];

  const completedCount = steps.filter((s) => s.data.completed).length;
  const progress = Math.round((completedCount / 7) * 100);

  return (
    <div className="pre-listing-checklist-page">
      <div className="pre-listing-checklist-container">
        <div className="checklist-header">
          <h1>Pre-Listing Checklist</h1>
          <p>Complete all steps before listing your property for sale.</p>
          <div className="completion-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span>{progress}% Complete ({completedCount}/7 steps)</span>
          </div>
        </div>

        <div className="checklist-steps-nav">
          {steps.map((s) => (
            <button
              key={s.num}
              type="button"
              className={`step-nav-btn ${currentStep === s.num ? 'active' : ''} ${s.data.completed ? 'completed' : ''}`}
              onClick={() => {
                setCurrentStep(s.num);
                savePreListingChecklist(user.uid, { currentStep: s.num }).catch(console.error);
              }}
            >
              <span className="step-nav-number">{s.num}</span>
              <span className="step-nav-title">{s.title}</span>
              {s.data.completed && <span className="step-nav-check">✓</span>}
            </button>
          ))}
        </div>

        <div className="checklist-step-content">
          {currentStep === 1 && (
            <div className="checklist-step">
              <h2>Step 1: Confirm Legal Authority to Sell</h2>
              <p className="step-description">
                Fill out the questionnaire and certify that the information is correct. Also assign a vendor that will be the legal representative assigned to the property at this specific time.
              </p>

              <div className="step-questionnaire">
                <h3>Legal Authority Questionnaire</h3>
                <div className="question-group">
                  <label>Verify current ownership (most recent deed) *</label>
                  <select
                    value={step1Data.questionnaire.currentOwnership}
                    onChange={(e) => setStep1Data((d) => ({ ...d, questionnaire: { ...d.questionnaire, currentOwnership: e.target.value } }))}
                  >
                    <option value="">— Select —</option>
                    <option value="yes">Yes, I have verified current ownership</option>
                    <option value="no">No, I need to verify</option>
                  </select>
                </div>
                <div className="question-group">
                  <label>Confirm all owners are on board (spouses, partners, trusts, LLC members) *</label>
                  <select
                    value={step1Data.questionnaire.allOwnersOnBoard}
                    onChange={(e) => setStep1Data((d) => ({ ...d, questionnaire: { ...d.questionnaire, allOwnersOnBoard: e.target.value } }))}
                  >
                    <option value="">— Select —</option>
                    <option value="yes">Yes, all owners are on board</option>
                    <option value="no">No, some owners need to be consulted</option>
                    <option value="na">N/A - Single owner</option>
                  </select>
                </div>
                <div className="question-group">
                  <label>If held in a trust, estate, or LLC, confirm signing authority *</label>
                  <select
                    value={step1Data.questionnaire.trustEstateLLC}
                    onChange={(e) => setStep1Data((d) => ({ ...d, questionnaire: { ...d.questionnaire, trustEstateLLC: e.target.value } }))}
                  >
                    <option value="">— Select —</option>
                    <option value="yes">Yes, signing authority confirmed</option>
                    <option value="no">No, need to confirm</option>
                    <option value="na">N/A - Not held in trust/estate/LLC</option>
                  </select>
                </div>
                <div className="question-group">
                  <label>Resolve power of attorney if applicable *</label>
                  <select
                    value={step1Data.questionnaire.powerOfAttorney}
                    onChange={(e) => setStep1Data((d) => ({ ...d, questionnaire: { ...d.questionnaire, powerOfAttorney: e.target.value } }))}
                  >
                    <option value="">— Select —</option>
                    <option value="yes">Yes, power of attorney resolved</option>
                    <option value="no">No, need to resolve</option>
                    <option value="na">N/A - No power of attorney</option>
                  </select>
                </div>
              </div>

              <div className="step-deed-upload">
                <h3>Upload Most Recent Deed *</h3>
                {step1Data.deedUrl ? (
                  <div>
                    <a href={step1Data.deedUrl} target="_blank" rel="noopener noreferrer">View uploaded deed</a>
                    <button type="button" className="btn btn-outline btn-small" onClick={() => setStep1Data((d) => ({ ...d, deedUrl: null }))}>Remove</button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      disabled={uploadingFiles['1_deed']}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(1, 'deed', f);
                        e.target.value = '';
                      }}
                    />
                    {uploadingFiles['1_deed'] && <span>Uploading...</span>}
                  </div>
                )}
              </div>

              <div className="step-vendor-assignment">
                <h3>Assign Legal Representative Vendor *</h3>
                {vendors.length === 0 ? (
                  <p className="form-hint">
                    No vendors yet. <a href="/dashboard?tab=vendor-center">Add vendors in Vendor Center</a> first.
                  </p>
                ) : (
                  <select
                    value={step1Data.assignedVendorId || ''}
                    onChange={(e) => setStep1Data((d) => ({ ...d, assignedVendorId: e.target.value || null }))}
                  >
                    <option value="">— Choose vendor —</option>
                    {vendors.filter((v) => v.type === 'title_company' || v.type === 'other').map((v) => (
                      <option key={v.id} value={v.id}>{v.vendorName || 'Unnamed vendor'}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="step-certification">
                <label>
                  <input
                    type="checkbox"
                    checked={step1Data.completed}
                    onChange={(e) => {
                      if (e.target.checked) markStepComplete(1);
                    }}
                  />
                  <strong>I certify that the information provided is correct and complete.</strong>
                </label>
              </div>

              <div className="step-actions">
                <button type="button" className="btn btn-outline" onClick={() => handleRequestSupport(1)} disabled={requestingSupport[1]}>
                  {requestingSupport[1] ? 'Requesting...' : 'Request Professional Support'}
                </button>
                {step1Data.completed && (
                  <button type="button" className="btn btn-primary" onClick={() => setCurrentStep(2)}>Continue to Step 2</button>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="checklist-step">
              <h2>Step 2: Resolve Title & Ownership Issues</h2>
              <p className="step-description">
                Fill out the questionnaire and certify that the information is correct. You don't need full title work yet, but you need to know what's coming.
              </p>

              <div className="step-questionnaire">
                <h3>Title & Ownership Questionnaire</h3>
                <div className="question-group">
                  <label>Outstanding mortgages or liens *</label>
                  <select
                    value={step2Data.questionnaire.outstandingMortgages}
                    onChange={(e) => setStep2Data((d) => ({ ...d, questionnaire: { ...d.questionnaire, outstandingMortgages: e.target.value } }))}
                  >
                    <option value="">— Select —</option>
                    <option value="none">No outstanding mortgages or liens</option>
                    <option value="mortgage">Outstanding mortgage (will be paid at closing)</option>
                    <option value="liens">Outstanding liens (need to resolve)</option>
                    <option value="both">Both mortgage and liens</option>
                  </select>
                </div>
                <div className="question-group">
                  <label>Judgments, tax liens, HOA liens *</label>
                  <select
                    value={step2Data.questionnaire.judgmentsLiens}
                    onChange={(e) => setStep2Data((d) => ({ ...d, questionnaire: { ...d.questionnaire, judgmentsLiens: e.target.value } }))}
                  >
                    <option value="">— Select —</option>
                    <option value="none">None</option>
                    <option value="tax">Tax liens</option>
                    <option value="hoa">HOA liens</option>
                    <option value="judgments">Judgments</option>
                    <option value="multiple">Multiple types</option>
                  </select>
                </div>
                <div className="question-group">
                  <label>Unreleased prior mortgages *</label>
                  <select
                    value={step2Data.questionnaire.unreleasedMortgages}
                    onChange={(e) => setStep2Data((d) => ({ ...d, questionnaire: { ...d.questionnaire, unreleasedMortgages: e.target.value } }))}
                  >
                    <option value="">— Select —</option>
                    <option value="none">No unreleased mortgages</option>
                    <option value="yes">Yes, unreleased mortgages exist</option>
                    <option value="unknown">Unknown, need to check</option>
                  </select>
                </div>
                <div className="question-group">
                  <label>Boundary or access issues (red flags) *</label>
                  <select
                    value={step2Data.questionnaire.boundaryIssues}
                    onChange={(e) => setStep2Data((d) => ({ ...d, questionnaire: { ...d.questionnaire, boundaryIssues: e.target.value } }))}
                  >
                    <option value="">— Select —</option>
                    <option value="none">No boundary or access issues</option>
                    <option value="boundary">Boundary disputes</option>
                    <option value="access">Access/easement issues</option>
                    <option value="both">Both boundary and access issues</option>
                  </select>
                </div>
              </div>

              <div className="step-certification">
                <label>
                  <input
                    type="checkbox"
                    checked={step2Data.completed}
                    onChange={(e) => {
                      if (e.target.checked) markStepComplete(2);
                    }}
                  />
                  <strong>I certify that the information provided is correct and complete.</strong>
                </label>
              </div>

              <div className="step-actions">
                <button type="button" className="btn btn-outline" onClick={() => handleRequestSupport(2)} disabled={requestingSupport[2]}>
                  {requestingSupport[2] ? 'Requesting...' : 'Request Professional Support'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setCurrentStep(1)}>Back</button>
                {step2Data.completed && (
                  <button type="button" className="btn btn-primary" onClick={() => setCurrentStep(3)}>Continue to Step 3</button>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="checklist-step">
              <h2>Step 3: Determine Listing Strategy & Pricing</h2>
              <p className="step-description">
                Option A) I KNOW WHAT I AM DOING and I do not need assistance. Option B) I would like professional support at this step.
              </p>

              <div className="step-support-option">
                <label>
                  <input
                    type="checkbox"
                    checked={step3Data.needsSupport}
                    onChange={(e) => setStep3Data((d) => ({ ...d, needsSupport: e.target.checked }))}
                  />
                  I would like professional support at this step
                </label>
              </div>

              {!step3Data.needsSupport && (
                <>
                  <div className="step-questionnaire">
                    <div className="question-group">
                      <label>List Price *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 500000"
                        value={step3Data.listPrice}
                        onChange={(e) => setStep3Data((d) => ({ ...d, listPrice: e.target.value }))}
                      />
                    </div>
                    <div className="question-group">
                      <label>Timing *</label>
                      <select
                        value={step3Data.timing}
                        onChange={(e) => setStep3Data((d) => ({ ...d, timing: e.target.value }))}
                      >
                        <option value="">— Select —</option>
                        <option value="asap">ASAP</option>
                        <option value="seasonal">Seasonal (wait for best time)</option>
                        <option value="flexible">Flexible</option>
                      </select>
                    </div>
                    <div className="question-group">
                      <label>Target Buyer *</label>
                      <select
                        value={step3Data.targetBuyer}
                        onChange={(e) => setStep3Data((d) => ({ ...d, targetBuyer: e.target.value }))}
                      >
                        <option value="">— Select —</option>
                        <option value="owner-occupant">Owner-occupant</option>
                        <option value="investor">Investor</option>
                        <option value="luxury">Luxury buyer</option>
                        <option value="any">Any qualified buyer</option>
                      </select>
                    </div>
                    <div className="question-group">
                      <label>Repairs vs selling as-is</label>
                      <textarea
                        placeholder="Describe your strategy for repairs..."
                        value={step3Data.repairsStrategy}
                        onChange={(e) => setStep3Data((d) => ({ ...d, repairsStrategy: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    <div className="question-group">
                      <label>Seller concessions strategy</label>
                      <textarea
                        placeholder="Describe your concessions strategy..."
                        value={step3Data.concessionsStrategy}
                        onChange={(e) => setStep3Data((d) => ({ ...d, concessionsStrategy: e.target.value }))}
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="step-comps-section">
                    <h3>Verified Comparables (Optional)</h3>
                    <p className="step-comps-description">
                      Select up to 3 nearby properties on the map and enter their closing values to use as verified comparables for pricing.
                    </p>
                    
                    {!mapCenter && (
                      <div className="step-comps-center-prompt">
                        <p>Enter your property address in Step 1 to center the map, or manually navigate to your area.</p>
                      </div>
                    )}
                    
                    <CompsMap
                      center={mapCenter}
                      selectedComps={step3Data.verifiedComps || []}
                      onCompSelect={(parcel) => {
                        const comps = step3Data.verifiedComps || [];
                        const existingIndex = comps.findIndex((c) => c.parcelId === parcel.attomId);
                        
                        if (existingIndex >= 0) {
                          // Remove if already selected
                          const updated = comps.filter((_, i) => i !== existingIndex);
                          setStep3Data((d) => ({ ...d, verifiedComps: updated }));
                        } else if (comps.length < 3) {
                          // Add new comp
                          const newComp = {
                            parcelId: parcel.attomId,
                            address: parcel.address || 'Address unknown',
                            latitude: parcel.latitude,
                            longitude: parcel.longitude,
                            closingValue: '',
                            estimate: parcel.estimate,
                            lastSalePrice: parcel.lastSalePrice,
                            lastSaleDate: parcel.lastSaleDate,
                          };
                          const updated = [...comps, newComp];
                          setStep3Data((d) => ({ ...d, verifiedComps: updated }));
                          // Center map on first comp
                          if (updated.length === 1 && parcel.latitude && parcel.longitude) {
                            setMapCenter({ lat: parcel.latitude, lng: parcel.longitude });
                          }
                        } else {
                          alert('You can select a maximum of 3 comparables.');
                        }
                      }}
                    />

                    {step3Data.verifiedComps && step3Data.verifiedComps.length > 0 && (
                      <div className="step-comps-list">
                        <h4>Selected Comparables ({step3Data.verifiedComps.length}/3)</h4>
                        {step3Data.verifiedComps.map((comp, index) => (
                          <div key={comp.parcelId || index} className="step-comp-item">
                            <div className="step-comp-header">
                              <div className="step-comp-info">
                                <strong>{comp.address}</strong>
                                {comp.estimate && (
                                  <span className="step-comp-estimate">Est: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(comp.estimate)}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                className="step-comp-remove"
                                onClick={() => {
                                  const updated = step3Data.verifiedComps.filter((_, i) => i !== index);
                                  setStep3Data((d) => ({ ...d, verifiedComps: updated }));
                                }}
                                title="Remove comp"
                              >
                                ×
                              </button>
                            </div>
                            <div className="step-comp-closing-value">
                              <label>Closing Value *</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Enter closing value (e.g. 450000)"
                                value={comp.closingValue}
                                onChange={(e) => {
                                  const updated = [...step3Data.verifiedComps];
                                  updated[index] = { ...updated[index], closingValue: e.target.value };
                                  setStep3Data((d) => ({ ...d, verifiedComps: updated }));
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="step-certification">
                    <label>
                      <input
                        type="checkbox"
                        checked={step3Data.completed}
                        onChange={(e) => {
                          if (e.target.checked) markStepComplete(3);
                        }}
                      />
                      <strong>I have determined my listing strategy and pricing.</strong>
                    </label>
                  </div>
                </>
              )}

              {step3Data.needsSupport && (
                <div className="step-support-requested">
                  <p>Professional support has been requested. A team member will contact you to help with listing strategy and pricing.</p>
                  <label>
                    <input
                      type="checkbox"
                      checked={step3Data.completed}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const updated = { ...step3Data, completed: true };
                          setStep3Data(updated);
                          saveStep(3, updated);
                        }
                      }}
                    />
                    <strong>I have completed this step with professional support.</strong>
                  </label>
                </div>
              )}

              <div className="step-actions">
                <button type="button" className="btn btn-outline" onClick={() => handleRequestSupport(3)} disabled={requestingSupport[3]}>
                  {requestingSupport[3] ? 'Requesting...' : 'Request Professional Support'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setCurrentStep(2)}>Back</button>
                {step3Data.completed && (
                  <button type="button" className="btn btn-primary" onClick={() => setCurrentStep(4)}>Continue to Step 4</button>
                )}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="checklist-step">
              <h2>Step 4: Complete Required Seller Disclosures</h2>
              <p className="step-description">
                These vary by state, but typically include property condition, lead-based paint, HOA disclosures, flood zone, known defects, prior repairs, and insurance claims. Disclosures must be completed before or at listing—not after an offer.
              </p>

              <div className="step-disclosures">
                <label>
                  <input
                    type="checkbox"
                    checked={step4Data.propertyCondition}
                    onChange={(e) => setStep4Data((d) => ({ ...d, propertyCondition: e.target.checked }))}
                  />
                  Property condition disclosure *
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step4Data.leadPaint}
                    onChange={(e) => setStep4Data((d) => ({ ...d, leadPaint: e.target.checked }))}
                  />
                  Lead-based paint disclosure (pre-1978) *
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step4Data.hoaDisclosures}
                    onChange={(e) => setStep4Data((d) => ({ ...d, hoaDisclosures: e.target.checked }))}
                  />
                  HOA disclosures (if applicable)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step4Data.floodZone}
                    onChange={(e) => setStep4Data((d) => ({ ...d, floodZone: e.target.checked }))}
                  />
                  Flood zone disclosure
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step4Data.knownDefects}
                    onChange={(e) => setStep4Data((d) => ({ ...d, knownDefects: e.target.checked }))}
                  />
                  Known defects disclosure *
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step4Data.priorRepairs}
                    onChange={(e) => setStep4Data((d) => ({ ...d, priorRepairs: e.target.checked }))}
                  />
                  Prior repairs disclosure
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step4Data.insuranceClaims}
                    onChange={(e) => setStep4Data((d) => ({ ...d, insuranceClaims: e.target.checked }))}
                  />
                  Insurance claims disclosure
                </label>
              </div>

              <div className="step-file-uploads">
                <h3>Upload Disclosure Documents</h3>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  disabled={uploadingFiles['4_disclosures']}
                  onChange={(e) => {
                    Array.from(e.target.files || []).forEach((f) => handleFileUpload(4, 'disclosures', f));
                    e.target.value = '';
                  }}
                />
                {uploadingFiles['4_disclosures'] && <span>Uploading...</span>}
                {step4Data.disclosureFiles && step4Data.disclosureFiles.length > 0 && (
                  <ul>
                    {step4Data.disclosureFiles.map((f, idx) => (
                      <li key={idx}>
                        <a href={f.url} target="_blank" rel="noopener noreferrer">{f.name}</a>
                        <button type="button" className="btn btn-outline btn-small" onClick={() => {
                          const updated = { ...step4Data, disclosureFiles: step4Data.disclosureFiles.filter((_, i) => i !== idx) };
                          setStep4Data(updated);
                          saveStep(4, updated);
                        }}>Remove</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="step-certification">
                <label>
                  <input
                    type="checkbox"
                    checked={step4Data.completed}
                    onChange={(e) => {
                      if (e.target.checked) markStepComplete(4);
                    }}
                  />
                  <strong>I have completed all required disclosures.</strong>
                </label>
              </div>

              <div className="step-actions">
                <button type="button" className="btn btn-outline" onClick={() => handleRequestSupport(4)} disabled={requestingSupport[4]}>
                  {requestingSupport[4] ? 'Requesting...' : 'Request Professional Support'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setCurrentStep(3)}>Back</button>
                {step4Data.completed && (
                  <button type="button" className="btn btn-primary" onClick={() => setCurrentStep(5)}>Continue to Step 5</button>
                )}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="checklist-step">
              <h2>Step 5: Prepare the Property</h2>
              <p className="step-description">
                This directly affects value and days on market. You're setting first impressions here.
              </p>

              <div className="step-prep-checklist">
                <label>
                  <input
                    type="checkbox"
                    checked={step5Data.cleaning}
                    onChange={(e) => setStep5Data((d) => ({ ...d, cleaning: e.target.checked }))}
                  />
                  Cleaning completed
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step5Data.decluttering}
                    onChange={(e) => setStep5Data((d) => ({ ...d, decluttering: e.target.checked }))}
                  />
                  Decluttering completed
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step5Data.staging}
                    onChange={(e) => setStep5Data((d) => ({ ...d, staging: e.target.checked }))}
                  />
                  Staging completed (if applicable)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step5Data.minorRepairs}
                    onChange={(e) => setStep5Data((d) => ({ ...d, minorRepairs: e.target.checked }))}
                  />
                  Minor repairs (paint, fixtures, landscaping)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step5Data.landscaping}
                    onChange={(e) => setStep5Data((d) => ({ ...d, landscaping: e.target.checked }))}
                  />
                  Landscaping prepared
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step5Data.appliancesDecision}
                    onChange={(e) => setStep5Data((d) => ({ ...d, appliancesDecision: e.target.checked }))}
                  />
                  Decided what stays vs goes (appliances, fixtures)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step5Data.securedItems}
                    onChange={(e) => setStep5Data((d) => ({ ...d, securedItems: e.target.checked }))}
                  />
                  Secured pets, valuables, and personal items
                </label>
              </div>

              <div className="step-certification">
                <label>
                  <input
                    type="checkbox"
                    checked={step5Data.completed}
                    onChange={(e) => {
                      if (e.target.checked) markStepComplete(5);
                    }}
                  />
                  <strong>I have prepared the property for listing.</strong>
                </label>
              </div>

              <div className="step-actions">
                <button type="button" className="btn btn-outline" onClick={() => handleRequestSupport(5)} disabled={requestingSupport[5]}>
                  {requestingSupport[5] ? 'Requesting...' : 'Request Professional Support'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setCurrentStep(4)}>Back</button>
                {step5Data.completed && (
                  <button type="button" className="btn btn-primary" onClick={() => setCurrentStep(6)}>Continue to Step 6</button>
                )}
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="checklist-step">
              <h2>Step 6: Create Marketing Assets</h2>
              <p className="step-description">
                You cannot list without marketing content. This is where most listings win or lose.
              </p>

              <div className="step-marketing-checklist">
                <label>
                  <input
                    type="checkbox"
                    checked={step6Data.professionalPhotos}
                    onChange={(e) => setStep6Data((d) => ({ ...d, professionalPhotos: e.target.checked }))}
                  />
                  Professional photos * (required)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step6Data.floorPlans}
                    onChange={(e) => setStep6Data((d) => ({ ...d, floorPlans: e.target.checked }))}
                  />
                  Floor plans (if applicable)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step6Data.videoDrone}
                    onChange={(e) => setStep6Data((d) => ({ ...d, videoDrone: e.target.checked }))}
                  />
                  Video / drone (market-dependent)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step6Data.description}
                    onChange={(e) => setStep6Data((d) => ({ ...d, description: e.target.checked }))}
                  />
                  Compelling property description * (required)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step6Data.featureHighlights}
                    onChange={(e) => setStep6Data((d) => ({ ...d, featureHighlights: e.target.checked }))}
                  />
                  Feature highlights
                </label>
              </div>

              <div className="step-file-uploads">
                <h3>Upload Marketing Photos</h3>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  multiple
                  disabled={uploadingFiles['6_photos']}
                  onChange={(e) => {
                    Array.from(e.target.files || []).forEach((f) => handleFileUpload(6, 'photos', f));
                    e.target.value = '';
                  }}
                />
                {uploadingFiles['6_photos'] && <span>Uploading...</span>}
                {step6Data.photoFiles && step6Data.photoFiles.length > 0 && (
                  <div className="photo-preview-grid">
                    {step6Data.photoFiles.map((f, idx) => (
                      <div key={idx} className="photo-preview">
                        <img src={f.url} alt={f.name} />
                        <button
                          type="button"
                          className="remove-photo"
                          onClick={() => {
                            const updated = { ...step6Data, photoFiles: step6Data.photoFiles.filter((_, i) => i !== idx) };
                            setStep6Data(updated);
                            saveStep(6, updated);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="step-certification">
                <label>
                  <input
                    type="checkbox"
                    checked={step6Data.completed}
                    onChange={(e) => {
                      if (e.target.checked) markStepComplete(6);
                    }}
                  />
                  <strong>I have created all required marketing assets.</strong>
                </label>
              </div>

              <div className="step-actions">
                <button type="button" className="btn btn-outline" onClick={() => handleRequestSupport(6)} disabled={requestingSupport[6]}>
                  {requestingSupport[6] ? 'Requesting...' : 'Request Professional Support'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setCurrentStep(5)}>Back</button>
                {step6Data.completed && (
                  <button type="button" className="btn btn-primary" onClick={() => setCurrentStep(7)}>Continue to Step 7</button>
                )}
              </div>
            </div>
          )}

          {currentStep === 7 && (
            <div className="checklist-step">
              <h2>Step 7: Verify Showing & Offer Logistics</h2>
              <p className="step-description">
                Before the first showing: lockbox or access plan, showing restrictions, offer submission instructions, seller availability for counters, timeline expectations. This avoids chaos once traffic starts.
              </p>

              <div className="step-logistics-checklist">
                <label>
                  <input
                    type="checkbox"
                    checked={step7Data.lockboxPlan}
                    onChange={(e) => setStep7Data((d) => ({ ...d, lockboxPlan: e.target.checked }))}
                  />
                  Lockbox or access plan * (required)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step7Data.showingRestrictions}
                    onChange={(e) => setStep7Data((d) => ({ ...d, showingRestrictions: e.target.checked }))}
                  />
                  Showing restrictions determined
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step7Data.offerInstructions}
                    onChange={(e) => setStep7Data((d) => ({ ...d, offerInstructions: e.target.checked }))}
                  />
                  Offer submission instructions * (required)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step7Data.sellerAvailability}
                    onChange={(e) => setStep7Data((d) => ({ ...d, sellerAvailability: e.target.checked }))}
                  />
                  Seller availability for counters
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={step7Data.timelineExpectations}
                    onChange={(e) => setStep7Data((d) => ({ ...d, timelineExpectations: e.target.checked }))}
                  />
                  Timeline expectations set
                </label>
              </div>

              <div className="step-certification">
                <label>
                  <input
                    type="checkbox"
                    checked={step7Data.completed}
                    onChange={(e) => {
                      if (e.target.checked) markStepComplete(7);
                    }}
                  />
                  <strong>I have verified all showing and offer logistics.</strong>
                </label>
              </div>

              <div className="step-actions">
                <button type="button" className="btn btn-outline" onClick={() => handleRequestSupport(7)} disabled={requestingSupport[7]}>
                  {requestingSupport[7] ? 'Requesting...' : 'Request Professional Support'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setCurrentStep(6)}>Back</button>
                {step7Data.completed && (
                  <button type="button" className="btn btn-primary" onClick={handleContinueToListing}>Continue to Create Listing</button>
                )}
              </div>
            </div>
          )}
        </div>

        {allStepsComplete() && (
          <div className="checklist-complete">
            <h2>✓ All Steps Complete!</h2>
            <p>You can now create your property listing.</p>
            <button type="button" className="btn btn-primary btn-large" onClick={handleContinueToListing}>
              Continue to Create Listing
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreListingChecklist;
