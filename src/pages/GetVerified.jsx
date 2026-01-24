import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPropertyById, updateProperty } from '../services/propertyService';
import { uploadFile, uploadMultipleFiles } from '../services/storageService';
import './GetVerified.css';

const GetVerified = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1 – Confirm the home
  const [deedFile, setDeedFile] = useState(null);
  const [propertyTaxFile, setPropertyTaxFile] = useState(null);
  const [disclosureFile, setDisclosureFile] = useState(null);
  const [hoaDocsFile, setHoaDocsFile] = useState(null);
  const [payoffFile, setPayoffFile] = useState(null);
  const [taxesCurrent, setTaxesCurrent] = useState('');
  const [hasHOA, setHasHOA] = useState('');
  const [hoaFee, setHoaFee] = useState('');
  const [hasMortgage, setHasMortgage] = useState('');
  const [hasLiens, setHasLiens] = useState('');
  const [lienDetails, setLienDetails] = useState('');

  // Step 2 – Price the home
  const [valuationFile, setValuationFile] = useState(null);

  // Step 3 – Home readiness
  const [hasMajorDefects, setHasMajorDefects] = useState('');
  const [majorDefectsNote, setMajorDefectsNote] = useState('');
  const [readyForShowings, setReadyForShowings] = useState('');
  const [readyForShowingsDate, setReadyForShowingsDate] = useState('');
  const [inspectionFile, setInspectionFile] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/sign-in?redirect=' + encodeURIComponent(`/property/${id}/get-verified`));
    }
  }, [isAuthenticated, authLoading, navigate, id]);

  useEffect(() => {
    if (isAuthenticated && user && id) loadProperty();
  }, [isAuthenticated, user, id]);

  const loadProperty = async () => {
    try {
      setLoading(true);
      setError(null);
      const p = await getPropertyById(id);
      if (p.sellerId !== user?.uid) {
        setError('You can only verify your own listings.');
        setLoading(false);
        return;
      }
      if (p.verified) {
        setError('This listing is already verified.');
        setLoading(false);
        return;
      }
      setProperty(p);
      setHoaFee(p.hoaFee != null ? String(p.hoaFee) : '');
      if (p.taxesCurrent === true) setTaxesCurrent('yes');
      else if (p.taxesCurrent === false) setTaxesCurrent('no');
      if (p.hasHOA === true) setHasHOA('yes');
      else if (p.hasHOA === false) setHasHOA('no');
      if (p.hasMortgage === true) setHasMortgage('yes');
      else if (p.hasMortgage === false) setHasMortgage('no');
      if (p.hasLiens === true) setHasLiens('yes');
      else if (p.hasLiens === false) setHasLiens('no');
      if (p.lienDetails != null) setLienDetails(String(p.lienDetails));
      if (p.hasMajorDefects === true) setHasMajorDefects('yes');
      else if (p.hasMajorDefects === false) setHasMajorDefects('no');
      if (p.majorDefectsNote != null) setMajorDefectsNote(String(p.majorDefectsNote));
      if (p.readyForShowings === true) setReadyForShowings('yes');
      else if (p.readyForShowings === false) setReadyForShowings('no');
      if (p.readyForShowingsDate != null) setReadyForShowingsDate(String(p.readyForShowingsDate));
    } catch (err) {
      setError('Property not found or failed to load.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalPhotoCount = (property?.photos?.length ?? 0) + (photoFiles?.length ?? 0);

  const getVerificationProgress = () => {
    let completed = 0;
    let total = 0;
    const inc = (cond) => { total++; if (cond) completed++; };

    inc(!!(property?.deedUrl || deedFile));
    inc(!!(property?.propertyTaxRecordUrl || propertyTaxFile));
    inc(!!(taxesCurrent === 'yes' || taxesCurrent === 'no'));
    inc(!!(property?.disclosureFormsUrl || disclosureFile));
    inc(!!(hasHOA === 'yes' || hasHOA === 'no'));
    if (hasHOA === 'yes') {
      inc(!!(property?.hoaDocsUrl || hoaDocsFile));
      inc(!isNaN(parseFloat(hoaFee)) && parseFloat(hoaFee) >= 0);
    }
    inc(!!(hasMortgage === 'yes' || hasMortgage === 'no'));
    inc(!!(hasLiens === 'yes' || hasLiens === 'no'));
    if (hasMortgage === 'yes' || hasLiens === 'yes') {
      inc(!!(property?.payoffOrLienReleaseUrl || payoffFile));
    }
    if (hasLiens === 'yes') inc(!!lienDetails?.trim());
    inc(!!(property?.valuationDocUrl || valuationFile));
    inc(!!(hasMajorDefects === 'yes' || hasMajorDefects === 'no'));
    if (hasMajorDefects === 'yes') inc(!!majorDefectsNote?.trim());
    inc(totalPhotoCount >= 5);
    inc(!!(readyForShowings === 'yes' || readyForShowings === 'no'));
    if (readyForShowings === 'no') inc(!!readyForShowingsDate?.trim());

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const handlePhotoFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    setPhotoFiles(files);
    setPhotoPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const validateAndCollect = () => {
    const errs = [];

    // Step 1
    if (!property.deedUrl && !deedFile) errs.push('Deed (upload or already on file)');
    if (!property.propertyTaxRecordUrl && !propertyTaxFile) errs.push('Property tax record');
    if (!taxesCurrent) errs.push('Property taxes current (Yes/No)');
    if (!property.disclosureFormsUrl && !disclosureFile) errs.push('Disclosure forms');
    if (!hasHOA) errs.push('HOA (Yes/No)');
    if (hasHOA === 'yes') {
      if (!property.hoaDocsUrl && !hoaDocsFile) errs.push('HOA documents');
      const fee = parseFloat(hoaFee);
      if (isNaN(fee) || fee < 0) errs.push('HOA dues ($/month)');
    }
    if (!hasMortgage) errs.push('Mortgage (Yes/No)');
    if (!hasLiens) errs.push('Liens (Yes/No)');
    if (hasMortgage === 'yes' || hasLiens === 'yes') {
      if (!property.payoffOrLienReleaseUrl && !payoffFile) errs.push('Payoff statement or lien release');
    }
    if (hasLiens === 'yes' && !lienDetails.trim()) errs.push('Lien details');

    // Step 2
    if (!property.valuationDocUrl && !valuationFile) errs.push('Appraisal, BPO, or CMA (valuation)');

    // Step 3
    if (!hasMajorDefects) errs.push('Major known defects (Yes/No)');
    if (hasMajorDefects === 'yes' && !majorDefectsNote.trim()) errs.push('Description of major defects');
    if (!readyForShowings) errs.push('Ready for showings (Yes/No)');
    if (readyForShowings === 'no' && !readyForShowingsDate.trim()) errs.push('Date when ready for showings');
    if (totalPhotoCount < 5) errs.push('At least 5 property photos (add below)');

    return errs;
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedMessage('');
    try {
      const prefix = `properties/${id}/verification`;
      const ext = (f) => (f?.name?.split('.').pop() || 'pdf');
      const updates = {};

      if (deedFile) {
        const url = await uploadFile(deedFile, `${prefix}/deed_${Date.now()}.${ext(deedFile)}`);
        updates.deedUrl = url;
        setDeedFile(null);
      }
      if (propertyTaxFile) {
        const url = await uploadFile(propertyTaxFile, `${prefix}/propertyTax_${Date.now()}.${ext(propertyTaxFile)}`);
        updates.propertyTaxRecordUrl = url;
        setPropertyTaxFile(null);
      }
      if (disclosureFile) {
        const url = await uploadFile(disclosureFile, `${prefix}/disclosure_${Date.now()}.${ext(disclosureFile)}`);
        updates.disclosureFormsUrl = url;
        setDisclosureFile(null);
      }
      if (hasHOA === 'yes') {
        if (hoaDocsFile) {
          const url = await uploadFile(hoaDocsFile, `${prefix}/hoa_${Date.now()}.${ext(hoaDocsFile)}`);
          updates.hoaDocsUrl = url;
          setHoaDocsFile(null);
        }
        const fee = parseFloat(hoaFee);
        if (!isNaN(fee) && fee >= 0) updates.hoaFee = fee;
      }
      if ((hasMortgage === 'yes' || hasLiens === 'yes') && payoffFile) {
        const url = await uploadFile(payoffFile, `${prefix}/payoffOrLien_${Date.now()}.${ext(payoffFile)}`);
        updates.payoffOrLienReleaseUrl = url;
        setPayoffFile(null);
      }
      if (valuationFile) {
        const url = await uploadFile(valuationFile, `${prefix}/valuation_${Date.now()}.${ext(valuationFile)}`);
        updates.valuationDocUrl = url;
        setValuationFile(null);
      }
      if (inspectionFile) {
        const url = await uploadFile(inspectionFile, `${prefix}/inspection_${Date.now()}.${ext(inspectionFile)}`);
        updates.inspectionReportUrl = url;
        setInspectionFile(null);
      }
      if (photoFiles.length > 0) {
        const urls = await uploadMultipleFiles(photoFiles, `properties/${id}/photos`);
        updates.photos = [...(property.photos || []), ...urls];
        setPhotoFiles([]);
        setPhotoPreviews([]);
      }

      if (taxesCurrent === 'yes' || taxesCurrent === 'no') updates.taxesCurrent = taxesCurrent === 'yes';
      if (hasHOA === 'yes' || hasHOA === 'no') updates.hasHOA = hasHOA === 'yes';
      if (hasMortgage === 'yes' || hasMortgage === 'no') updates.hasMortgage = hasMortgage === 'yes';
      if (hasLiens === 'yes' || hasLiens === 'no') updates.hasLiens = hasLiens === 'yes';
      if (hasLiens === 'yes') updates.lienDetails = lienDetails?.trim() || null;
      if (hasMajorDefects === 'yes' || hasMajorDefects === 'no') updates.hasMajorDefects = hasMajorDefects === 'yes';
      if (hasMajorDefects === 'yes') updates.majorDefectsNote = majorDefectsNote?.trim() || null;
      if (readyForShowings === 'yes' || readyForShowings === 'no') updates.readyForShowings = readyForShowings === 'yes';
      if (readyForShowings === 'no') updates.readyForShowingsDate = readyForShowingsDate?.trim() || null;

      if (Object.keys(updates).length > 0) {
        await updateProperty(id, updates);
        await loadProperty();
        setSavedMessage('Progress saved');
        setTimeout(() => setSavedMessage(''), 3000);
      }
    } catch (err) {
      setError('Failed to save progress. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateAndCollect();
    if (errs.length > 0) {
      setError('Please complete: ' + errs.join(', '));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const prefix = `properties/${id}/verification`;
      const ext = (f) => (f?.name?.split('.').pop() || 'pdf');

      let deedUrl = property.deedUrl;
      if (!deedUrl && deedFile) {
        deedUrl = await uploadFile(deedFile, `${prefix}/deed_${Date.now()}.${ext(deedFile)}`);
      }
      let propertyTaxRecordUrl = property.propertyTaxRecordUrl;
      if (!propertyTaxRecordUrl && propertyTaxFile) {
        propertyTaxRecordUrl = await uploadFile(propertyTaxFile, `${prefix}/propertyTax_${Date.now()}.${ext(propertyTaxFile)}`);
      }
      let disclosureFormsUrl = property.disclosureFormsUrl;
      if (!disclosureFormsUrl && disclosureFile) {
        disclosureFormsUrl = await uploadFile(disclosureFile, `${prefix}/disclosure_${Date.now()}.${ext(disclosureFile)}`);
      }
      let hoaDocsUrl = property.hoaDocsUrl;
      if (hasHOA === 'yes' && !hoaDocsUrl && hoaDocsFile) {
        hoaDocsUrl = await uploadFile(hoaDocsFile, `${prefix}/hoa_${Date.now()}.${ext(hoaDocsFile)}`);
      }
      let payoffOrLienReleaseUrl = property.payoffOrLienReleaseUrl;
      if ((hasMortgage === 'yes' || hasLiens === 'yes') && !payoffOrLienReleaseUrl && payoffFile) {
        payoffOrLienReleaseUrl = await uploadFile(payoffFile, `${prefix}/payoffOrLien_${Date.now()}.${ext(payoffFile)}`);
      }
      let valuationDocUrl = property.valuationDocUrl;
      if (!valuationDocUrl && valuationFile) {
        valuationDocUrl = await uploadFile(valuationFile, `${prefix}/valuation_${Date.now()}.${ext(valuationFile)}`);
      }
      let inspectionReportUrl = property.inspectionReportUrl;
      if (!inspectionReportUrl && inspectionFile) {
        inspectionReportUrl = await uploadFile(inspectionFile, `${prefix}/inspection_${Date.now()}.${ext(inspectionFile)}`);
      }
      let photos = property.photos || [];
      if (photoFiles.length > 0) {
        const urls = await uploadMultipleFiles(photoFiles, `properties/${id}/photos`);
        photos = [...photos, ...urls];
      }

      const updates = {
        verified: true,
        verifiedAt: new Date(),
        taxesCurrent: taxesCurrent === 'yes',
        hasHOA: hasHOA === 'yes',
        hasMortgage: hasMortgage === 'yes',
        hasLiens: hasLiens === 'yes',
        lienDetails: hasLiens === 'yes' ? lienDetails.trim() : null,
        hasMajorDefects: hasMajorDefects === 'yes',
        majorDefectsNote: hasMajorDefects === 'yes' ? majorDefectsNote.trim() : null,
        readyForShowings: readyForShowings === 'yes',
        readyForShowingsDate: readyForShowings === 'no' ? readyForShowingsDate.trim() : null,
        valuationDocUrl,
        payoffOrLienReleaseUrl: hasMortgage === 'yes' || hasLiens === 'yes' ? payoffOrLienReleaseUrl : null,
        photos,
      };
      if (deedFile) updates.deedUrl = deedUrl;
      if (propertyTaxFile) updates.propertyTaxRecordUrl = propertyTaxRecordUrl;
      if (disclosureFile) updates.disclosureFormsUrl = disclosureFormsUrl;
      if (hasHOA === 'yes') {
        if (hoaDocsFile) updates.hoaDocsUrl = hoaDocsUrl;
        updates.hoaFee = parseFloat(hoaFee);
      }
      if (inspectionFile) updates.inspectionReportUrl = inspectionReportUrl;

      await updateProperty(id, updates);
      setSuccess(true);
    } catch (err) {
      setError('Failed to complete verification. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="get-verified-page">
        <div className="loading-state">Loading...</div>
      </div>
    );
  }
  if (!isAuthenticated) return null;
  if (error && !property) {
    return (
      <div className="get-verified-page">
        <div className="get-verified-container">
          <p className="error-message">{error}</p>
          <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
        </div>
      </div>
    );
  }
  if (success) {
    return (
      <div className="get-verified-page">
        <div className="get-verified-container get-verified-success">
          <h2>Your listing is now verified</h2>
          <p>Buyers will see a Verified badge on your property.</p>
          <Link to={`/property/${id}`} className="btn btn-primary btn-large">View Property</Link>
        </div>
      </div>
    );
  }
  if (!property) return null;

  const { percentage } = getVerificationProgress();

  return (
    <div className="get-verified-page">
      <div className="get-verified-container">
        <h1>Get your listing verified</h1>
        <p className="get-verified-intro">
          Complete the steps below so buyers see a Verified badge. Existing documents on your listing are reused when possible.
        </p>
        <div className="verification-progress">
          <div className="verification-progress-bar">
            <div className="verification-progress-fill" style={{ width: `${percentage}%` }} />
          </div>
          <span className="verification-progress-text">{percentage}% complete</span>
        </div>
        <div className="step-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Confirm the home</div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Price the home</div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Home readiness</div>
        </div>
        {error && <div className="error-message">{error}</div>}
        {savedMessage && <div className="saved-message">{savedMessage}</div>}
        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="form-step">
              <h2>Confirm the home</h2>
              <p className="form-note">Ownership, taxes, HOA, mortgage, and liens.</p>

              <div className="form-group">
                <label>Deed *</label>
                {property.deedUrl ? (
                  <p className="on-file">✓ Deed on file</p>
                ) : (
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDeedFile(e.target.files?.[0] || null)} />
                )}
              </div>
              <div className="form-group">
                <label>Property tax record *</label>
                {property.propertyTaxRecordUrl ? (
                  <p className="on-file">✓ Property tax record on file</p>
                ) : (
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPropertyTaxFile(e.target.files?.[0] || null)} />
                )}
              </div>
              <div className="form-group">
                <label>Property taxes current? *</label>
                <select value={taxesCurrent} onChange={(e) => setTaxesCurrent(e.target.value)} required>
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="form-group">
                <label>Disclosure forms *</label>
                {property.disclosureFormsUrl ? (
                  <p className="on-file">✓ Disclosures on file</p>
                ) : (
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDisclosureFile(e.target.files?.[0] || null)} />
                )}
              </div>
              <div className="form-group">
                <label>HOA? *</label>
                <select value={hasHOA} onChange={(e) => setHasHOA(e.target.value)} required>
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              {hasHOA === 'yes' && (
                <>
                  <div className="form-group">
                    <label>HOA documents *</label>
                    {property.hoaDocsUrl ? (
                      <p className="on-file">✓ HOA docs on file</p>
                    ) : (
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setHoaDocsFile(e.target.files?.[0] || null)} />
                    )}
                  </div>
                  <div className="form-group">
                    <label>HOA dues ($/month) *</label>
                    <input type="number" min="0" step="1" value={hoaFee} onChange={(e) => setHoaFee(e.target.value)} placeholder="e.g. 150" />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Mortgage? *</label>
                <select value={hasMortgage} onChange={(e) => setHasMortgage(e.target.value)} required>
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="form-group">
                <label>Known liens or encumbrances? *</label>
                <select value={hasLiens} onChange={(e) => setHasLiens(e.target.value)} required>
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              {(hasMortgage === 'yes' || hasLiens === 'yes') && (
                <div className="form-group">
                  <label>Payoff statement or lien release *</label>
                  {property.payoffOrLienReleaseUrl ? (
                    <p className="on-file">✓ Document on file</p>
                  ) : (
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPayoffFile(e.target.files?.[0] || null)} />
                  )}
                </div>
              )}
              {hasLiens === 'yes' && (
                <div className="form-group">
                  <label>Lien details *</label>
                  <textarea value={lienDetails} onChange={(e) => setLienDetails(e.target.value)} rows={3} placeholder="Describe the lien(s) and how they will be cleared." />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <h2>Price the home</h2>
              <p className="form-note">Support your list price with a valuation.</p>
              <div className="form-group">
                <label>List price</label>
                <p className="read-only-value">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(property.price)}
                </p>
              </div>
              <div className="form-group">
                <label>Appraisal, BPO, or CMA (opinion of value) *</label>
                {property.valuationDocUrl ? (
                  <p className="on-file">✓ Valuation on file</p>
                ) : (
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setValuationFile(e.target.files?.[0] || null)} />
                )}
                <p className="form-hint">Upload at least one: appraisal, broker price opinion, or comparable market analysis.</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-step">
              <h2>Home readiness</h2>
              <p className="form-note">Defects, photos, and showings.</p>
              <div className="form-group">
                <label>Major known defects? *</label>
                <select value={hasMajorDefects} onChange={(e) => setHasMajorDefects(e.target.value)} required>
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              {hasMajorDefects === 'yes' && (
                <div className="form-group">
                  <label>Describe major defects *</label>
                  <textarea value={majorDefectsNote} onChange={(e) => setMajorDefectsNote(e.target.value)} rows={3} placeholder="Or state: See inspection report." />
                </div>
              )}
              <div className="form-group">
                <label>Photos *</label>
                <p className="form-hint">At least 5 photos required. Add or upload below.</p>
                <p className={totalPhotoCount >= 5 ? 'on-file' : 'form-hint form-hint--warn'}>
                  {totalPhotoCount >= 5 ? `✓ ${totalPhotoCount} photos` : `${totalPhotoCount} of 5 photos`}
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoFilesChange}
                  className="input-file"
                />
                {((property?.photos?.length ?? 0) > 0 || photoPreviews.length > 0) && (
                  <div className="photo-previews">
                    {property?.photos?.map((url, i) => (
                      <div key={`ex-${i}`} className="photo-preview"><img src={url} alt={`Photo ${i + 1}`} /></div>
                    ))}
                    {photoPreviews.map((url, i) => (
                      <div key={`new-${i}`} className="photo-preview"><img src={url} alt={`New ${i + 1}`} /></div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Ready for showings? *</label>
                <select value={readyForShowings} onChange={(e) => setReadyForShowings(e.target.value)} required>
                  <option value="">Select</option>
                  <option value="yes">Yes, now</option>
                  <option value="no">No, by a specific date</option>
                </select>
              </div>
              {readyForShowings === 'no' && (
                <div className="form-group">
                  <label>Date when ready for showings *</label>
                  <input type="date" value={readyForShowingsDate} onChange={(e) => setReadyForShowingsDate(e.target.value)} />
                </div>
              )}
              <div className="form-group">
                <label>Inspection report (optional)</label>
                {property.inspectionReportUrl ? (
                  <p className="on-file">✓ Inspection on file</p>
                ) : (
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setInspectionFile(e.target.files?.[0] || null)} />
                )}
              </div>
            </div>
          )}

          <div className="form-actions">
            {step > 1 && (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-secondary">Back</button>
            )}
            {step < 3 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)} className="btn-primary">Next</button>
            ) : (
              <button type="submit" disabled={saving || totalPhotoCount < 5} className="btn-primary">
                {saving ? 'Completing...' : 'Complete verification'}
              </button>
            )}
            <button type="button" onClick={handleSaveProgress} disabled={saving} className="btn-secondary">
              Save progress
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GetVerified;
