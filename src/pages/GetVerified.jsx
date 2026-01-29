import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPropertyById, updateProperty } from '../services/propertyService';
import { uploadFile, uploadMultipleFiles } from '../services/storageService';
import CompsMap from '../components/CompsMap';
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

  // Step 1 – About Home (property basics)
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [squareFeet, setSquareFeet] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [hasHOA, setHasHOA] = useState('');
  const [hoaFee, setHoaFee] = useState('');
  const [propertyTaxEstimate, setPropertyTaxEstimate] = useState('');
  const [hasInsurance, setHasInsurance] = useState('');
  const [insuranceApproximation, setInsuranceApproximation] = useState('');
  const [features, setFeatures] = useState([]);
  const [step1Confirmed, setStep1Confirmed] = useState(false);

  // Step 2 – Confirm the home (documents)
  const [deedFile, setDeedFile] = useState(null);
  const [propertyTaxFile, setPropertyTaxFile] = useState(null);
  const [hoaDocsFile, setHoaDocsFile] = useState(null);
  const [hasMortgage, setHasMortgage] = useState('');
  const [remainingMortgage, setRemainingMortgage] = useState('');
  const [mortgageFile, setMortgageFile] = useState(null);
  const [lienTax, setLienTax] = useState('');
  const [lienHOA, setLienHOA] = useState('');
  const [lienMechanic, setLienMechanic] = useState('');
  const [lienOther, setLienOther] = useState('');
  const [payoffFile, setPayoffFile] = useState(null);
  const [step2Confirmed, setStep2Confirmed] = useState(false);

  // Step 3 – Price the home
  const [estimatedWorth, setEstimatedWorth] = useState('');
  const [makeMeMovePrice, setMakeMeMovePrice] = useState('');
  const [useCompAnalysis, setUseCompAnalysis] = useState(false);
  const [verifiedComps, setVerifiedComps] = useState([]);
  const [step3Confirmed, setStep3Confirmed] = useState(false);
  const [compPriceModal, setCompPriceModal] = useState(null); // { index, address, closingValue }

  // Step 4 – Content (photos/videos)
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
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
        setError('This property is already verified.');
        setLoading(false);
        return;
      }
      setProperty(p);
      setBedrooms(p.bedrooms != null ? String(p.bedrooms) : '');
      setBathrooms(p.bathrooms != null ? String(p.bathrooms) : '');
      setSquareFeet(p.squareFeet != null ? String(p.squareFeet) : '');
      setLotSize(p.lotSize != null ? String(p.lotSize) : '');
      setYearBuilt(p.yearBuilt != null ? String(p.yearBuilt) : '');
      if (p.hasHOA === true) setHasHOA('yes');
      else if (p.hasHOA === false) setHasHOA('no');
      setHoaFee(p.hoaFee != null ? String(p.hoaFee) : '');
      setPropertyTaxEstimate(p.propertyTax != null ? String(p.propertyTax) : '');
      if (p.hasInsurance === true) setHasInsurance('yes');
      else if (p.hasInsurance === false) setHasInsurance('no');
      setInsuranceApproximation(p.insuranceApproximation != null ? String(p.insuranceApproximation) : '');
      setFeatures(Array.isArray(p.features) ? [...p.features] : []);
      if (p.hasMortgage === true) setHasMortgage('yes');
      else if (p.hasMortgage === false) setHasMortgage('no');
      setRemainingMortgage(p.remainingMortgage != null ? String(p.remainingMortgage) : '');
      setLienTax(p.lienTax === true ? 'yes' : p.lienTax === false ? 'no' : '');
      setLienHOA(p.lienHOA === true ? 'yes' : p.lienHOA === false ? 'no' : '');
      setLienMechanic(p.lienMechanic === true ? 'yes' : p.lienMechanic === false ? 'no' : '');
      setLienOther(p.lienOtherDetails != null ? String(p.lienOtherDetails) : '');
      setEstimatedWorth(p.estimatedWorth != null ? String(p.estimatedWorth) : p.price != null ? String(p.price) : '');
      setMakeMeMovePrice(p.makeMeMovePrice != null ? String(p.makeMeMovePrice) : '');
      setUseCompAnalysis(!!(p.verifiedComps && p.verifiedComps.length > 0));
      setVerifiedComps(Array.isArray(p.verifiedComps) ? [...p.verifiedComps] : []);
    } catch (err) {
      setError('Property not found or failed to load.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalPhotoCount = (property?.photos?.length ?? 0) + (photoFiles?.length ?? 0);
  const commonFeaturesList = ['Garage', 'Fireplace', 'Pool', 'Garden', 'Hardwood Floors', 'Updated Kitchen', 'Updated Bathroom', 'Central Air', 'Central Heat', 'Washer/Dryer', 'Dishwasher', 'Garbage Disposal'];

  const toggleFeature = (f) => {
    setFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const getVerificationProgress = () => {
    let completed = 0;
    let total = 0;
    const inc = (cond) => { total++; if (cond) completed++; };

    inc(!!(bedrooms !== '' && bathrooms !== ''));
    inc(!!(squareFeet !== '' || lotSize !== '' || yearBuilt !== ''));
    inc(!!(hasHOA === 'yes' || hasHOA === 'no'));
    if (hasHOA === 'yes') inc(!isNaN(parseFloat(hoaFee)) && parseFloat(hoaFee) >= 0);
    inc(!!(propertyTaxEstimate !== ''));
    inc(!!(hasInsurance === 'yes' || hasInsurance === 'no'));
    if (hasInsurance === 'yes') inc(!!(insuranceApproximation !== ''));
    inc(!!(property?.deedUrl || deedFile));
    inc(!!(property?.propertyTaxRecordUrl || propertyTaxFile));
    if (hasHOA === 'yes') inc(!!(property?.hoaDocsUrl || hoaDocsFile));
    inc(!!(hasMortgage === 'yes' || hasMortgage === 'no'));
    if (hasMortgage === 'yes') inc(!!(remainingMortgage !== '' || property?.mortgageDocUrl || mortgageFile));
    inc(!!(lienTax !== '' && lienHOA !== '' && lienMechanic !== ''));
    inc(!!(estimatedWorth !== '' && !isNaN(parseFloat(estimatedWorth))));
    inc(!!(makeMeMovePrice !== '' && !isNaN(parseFloat(makeMeMovePrice))));
    inc(totalPhotoCount >= 1);

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

    if (!step1Confirmed) errs.push('Confirm property basics (Step 1)');
    if (!step2Confirmed) errs.push('Confirm documents (Step 2)');
    if (!step3Confirmed) errs.push('Confirm pricing (Step 3)');

    if (!bedrooms.trim()) errs.push('Bedrooms');
    if (!bathrooms.trim()) errs.push('Bathrooms');
    if (!propertyTaxEstimate.trim() || isNaN(parseFloat(propertyTaxEstimate))) errs.push('Property taxes estimate');
    if (!hasHOA) errs.push('HOA (Yes/No)');
    if (hasHOA === 'yes') {
      const fee = parseFloat(hoaFee);
      if (isNaN(fee) || fee < 0) errs.push('HOA fees ($/month)');
    }
    if (!hasInsurance) errs.push('Insurance (Yes/No)');
    if (hasInsurance === 'yes' && (!insuranceApproximation.trim() || isNaN(parseFloat(insuranceApproximation)))) errs.push('Annual insurance approximation');

    if (!property.deedUrl && !deedFile) errs.push('Deed');
    if (!property.propertyTaxRecordUrl && !propertyTaxFile) errs.push('Property tax record');
    if (hasHOA === 'yes' && !property.hoaDocsUrl && !hoaDocsFile) errs.push('HOA bylaws/covenants or critical HOA docs');
    if (!hasMortgage) errs.push('Mortgage (Yes/No)');
    if (hasMortgage === 'yes' && !remainingMortgage.trim()) errs.push('Approximate remaining mortgage');
    if (lienTax === '' || lienHOA === '' || lienMechanic === '') errs.push('Liens/encumbrances (answer each)');

    if (!estimatedWorth.trim() || isNaN(parseFloat(estimatedWorth))) errs.push('What you think the property is worth');
    if (!makeMeMovePrice.trim() || isNaN(parseFloat(makeMeMovePrice))) errs.push('Make me move price');

    if (totalPhotoCount < 1) errs.push('At least one photo or video');

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

      if (bedrooms !== '') updates.bedrooms = parseInt(bedrooms, 10);
      if (bathrooms !== '') updates.bathrooms = parseFloat(bathrooms);
      if (squareFeet !== '') updates.squareFeet = parseFloat(squareFeet);
      if (lotSize !== '') updates.lotSize = parseFloat(lotSize);
      if (yearBuilt !== '') updates.yearBuilt = parseInt(yearBuilt, 10);
      updates.hasHOA = hasHOA === 'yes';
      if (hasHOA === 'yes') {
        const fee = parseFloat(hoaFee);
        if (!isNaN(fee) && fee >= 0) updates.hoaFee = fee;
      }
      if (propertyTaxEstimate !== '') updates.propertyTax = parseFloat(propertyTaxEstimate);
      updates.hasInsurance = hasInsurance === 'yes';
      if (hasInsurance === 'yes' && insuranceApproximation !== '') updates.insuranceApproximation = parseFloat(insuranceApproximation);
      updates.features = features;

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
      if (hasHOA === 'yes' && hoaDocsFile) {
        const url = await uploadFile(hoaDocsFile, `${prefix}/hoa_${Date.now()}.${ext(hoaDocsFile)}`);
        updates.hoaDocsUrl = url;
        setHoaDocsFile(null);
      }
      updates.hasMortgage = hasMortgage === 'yes';
      if (hasMortgage === 'yes' && remainingMortgage !== '') updates.remainingMortgage = parseFloat(remainingMortgage);
      if (hasMortgage === 'yes' && mortgageFile) {
        const url = await uploadFile(mortgageFile, `${prefix}/mortgage_${Date.now()}.${ext(mortgageFile)}`);
        updates.mortgageDocUrl = url;
        setMortgageFile(null);
      }
      if (payoffFile) {
        const url = await uploadFile(payoffFile, `${prefix}/payoffOrLien_${Date.now()}.${ext(payoffFile)}`);
        updates.payoffOrLienReleaseUrl = url;
        setPayoffFile(null);
      }
      updates.lienTax = lienTax === 'yes';
      updates.lienHOA = lienHOA === 'yes';
      updates.lienMechanic = lienMechanic === 'yes';
      if (lienOther.trim()) updates.lienOtherDetails = lienOther.trim();

      if (estimatedWorth !== '') updates.estimatedWorth = parseFloat(estimatedWorth);
      if (makeMeMovePrice !== '') updates.makeMeMovePrice = parseFloat(makeMeMovePrice);
      updates.verifiedComps = useCompAnalysis ? verifiedComps : [];

      if (photoFiles.length > 0) {
        const urls = await uploadMultipleFiles(photoFiles, `properties/${id}/photos`);
        updates.photos = [...(property.photos || []), ...urls];
        setPhotoFiles([]);
        setPhotoPreviews([]);
      }

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
      if (!deedUrl && deedFile) deedUrl = await uploadFile(deedFile, `${prefix}/deed_${Date.now()}.${ext(deedFile)}`);
      let propertyTaxRecordUrl = property.propertyTaxRecordUrl;
      if (!propertyTaxRecordUrl && propertyTaxFile) propertyTaxRecordUrl = await uploadFile(propertyTaxFile, `${prefix}/propertyTax_${Date.now()}.${ext(propertyTaxFile)}`);
      let hoaDocsUrl = property.hoaDocsUrl;
      if (hasHOA === 'yes' && !hoaDocsUrl && hoaDocsFile) hoaDocsUrl = await uploadFile(hoaDocsFile, `${prefix}/hoa_${Date.now()}.${ext(hoaDocsFile)}`);
      let mortgageDocUrl = property.mortgageDocUrl;
      if (hasMortgage === 'yes' && !mortgageDocUrl && mortgageFile) mortgageDocUrl = await uploadFile(mortgageFile, `${prefix}/mortgage_${Date.now()}.${ext(mortgageFile)}`);
      let payoffOrLienReleaseUrl = property.payoffOrLienReleaseUrl;
      if (!payoffOrLienReleaseUrl && payoffFile) payoffOrLienReleaseUrl = await uploadFile(payoffFile, `${prefix}/payoffOrLien_${Date.now()}.${ext(payoffFile)}`);
      let photos = property.photos || [];
      if (photoFiles.length > 0) {
        const urls = await uploadMultipleFiles(photoFiles, `properties/${id}/photos`);
        photos = [...photos, ...urls];
      }

      const updates = {
        verified: true,
        verifiedAt: new Date(),
        bedrooms: bedrooms !== '' ? parseInt(bedrooms, 10) : property.bedrooms,
        bathrooms: bathrooms !== '' ? parseFloat(bathrooms) : property.bathrooms,
        squareFeet: squareFeet !== '' ? parseFloat(squareFeet) : property.squareFeet,
        lotSize: lotSize !== '' ? parseFloat(lotSize) : property.lotSize,
        yearBuilt: yearBuilt !== '' ? parseInt(yearBuilt, 10) : property.yearBuilt,
        hasHOA: hasHOA === 'yes',
        hoaFee: hasHOA === 'yes' ? parseFloat(hoaFee) : null,
        propertyTax: propertyTaxEstimate !== '' ? parseFloat(propertyTaxEstimate) : null,
        hasInsurance: hasInsurance === 'yes',
        insuranceApproximation: hasInsurance === 'yes' && insuranceApproximation !== '' ? parseFloat(insuranceApproximation) : null,
        features,
        deedUrl: deedUrl ?? null,
        propertyTaxRecordUrl: propertyTaxRecordUrl ?? null,
        hoaDocsUrl: hasHOA === 'yes' ? (hoaDocsUrl ?? null) : null,
        hasMortgage: hasMortgage === 'yes',
        remainingMortgage: hasMortgage === 'yes' && remainingMortgage !== '' ? parseFloat(remainingMortgage) : null,
        mortgageDocUrl: hasMortgage === 'yes' ? (mortgageDocUrl ?? null) : null,
        payoffOrLienReleaseUrl: payoffOrLienReleaseUrl ?? null,
        lienTax: lienTax === 'yes',
        lienHOA: lienHOA === 'yes',
        lienMechanic: lienMechanic === 'yes',
        lienOtherDetails: lienOther.trim() || null,
        estimatedWorth: estimatedWorth !== '' ? parseFloat(estimatedWorth) : null,
        makeMeMovePrice: makeMeMovePrice !== '' ? parseFloat(makeMeMovePrice) : null,
        verifiedComps: useCompAnalysis ? verifiedComps : [],
        price: estimatedWorth !== '' ? parseFloat(estimatedWorth) : property.price,
        photos,
      };
      Object.keys(updates).forEach((key) => {
        if (updates[key] === undefined) delete updates[key];
      });

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
          <h2>Your property is now verified</h2>
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
        <h1>Get your property verified</h1>
        <p className="get-verified-intro">
          Complete the steps below so buyers see a Verified badge. Confirm each section to the best of your knowledge before continuing.
        </p>
        <div className="verification-progress">
          <div className="verification-progress-bar">
            <div className="verification-progress-fill" style={{ width: `${percentage}%` }} />
          </div>
          <span className="verification-progress-text">{percentage}% complete</span>
        </div>
        <div className="step-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1. About Home</div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Confirm the home</div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Price the home</div>
          <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Content</div>
        </div>
        {error && <div className="error-message">{error}</div>}
        {savedMessage && <div className="saved-message">{savedMessage}</div>}
        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="form-step">
              <h2>About Home</h2>
              <p className="form-note">Confirm the property basics to the best of your knowledge.</p>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Bedrooms *</label>
                  <input type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="e.g. 3" required />
                </div>
                <div className="form-group">
                  <label>Bathrooms *</label>
                  <input type="number" min="0" step="0.5" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="e.g. 2.5" required />
                </div>
                <div className="form-group">
                  <label>Square footage</label>
                  <input type="number" min="0" value={squareFeet} onChange={(e) => setSquareFeet(e.target.value)} placeholder="e.g. 2200" />
                </div>
                <div className="form-group">
                  <label>Lot size (sq ft)</label>
                  <input type="number" min="0" value={lotSize} onChange={(e) => setLotSize(e.target.value)} placeholder="e.g. 8000" />
                </div>
                <div className="form-group">
                  <label>Year built</label>
                  <input type="number" min="1800" max={new Date().getFullYear() + 1} value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} placeholder="e.g. 1995" />
                </div>
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
                <div className="form-group">
                  <label>HOA fees ($/month) *</label>
                  <input type="number" min="0" step="1" value={hoaFee} onChange={(e) => setHoaFee(e.target.value)} placeholder="e.g. 150" />
                </div>
              )}
              <div className="form-group">
                <label>Property taxes estimate ($/year) *</label>
                <input type="number" min="0" step="100" value={propertyTaxEstimate} onChange={(e) => setPropertyTaxEstimate(e.target.value)} placeholder="e.g. 6000" required />
              </div>
              <div className="form-group">
                <label>Insurance? *</label>
                <select value={hasInsurance} onChange={(e) => setHasInsurance(e.target.value)} required>
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              {hasInsurance === 'yes' && (
                <div className="form-group">
                  <label>Annual insurance approximation ($/year)</label>
                  <input type="number" min="0" step="100" value={insuranceApproximation} onChange={(e) => setInsuranceApproximation(e.target.value)} placeholder="e.g. 1800" />
                </div>
              )}
              <div className="form-group">
                <label>Features</label>
                <div className="feature-chips">
                  {commonFeaturesList.map((f) => (
                    <button key={f} type="button" className={`feature-chip ${features.includes(f) ? 'active' : ''}`} onClick={() => toggleFeature(f)}>{f}</button>
                  ))}
                </div>
              </div>
              <label className="confirm-checkbox">
                <input type="checkbox" checked={step1Confirmed} onChange={(e) => setStep1Confirmed(e.target.checked)} />
                <span>I confirm this is accurate to the best of my knowledge.</span>
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <h2>Confirm the home</h2>
              <p className="form-note">Upload documents and confirm ownership, taxes, HOA (if applicable), mortgage, and liens.</p>
              <div className="form-group">
                <label>Deed *</label>
                <p className="form-instruction">This was provided with the title company upon property closure and is likely recorded with your local municipality.</p>
                {property.deedUrl ? <p className="on-file">✓ Deed on file</p> : <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDeedFile(e.target.files?.[0] || null)} />}
              </div>
              <div className="form-group">
                <label>Property tax record *</label>
                <p className="form-instruction">Available via your municipality assessor portal.</p>
                {property.propertyTaxRecordUrl ? <p className="on-file">✓ Property tax record on file</p> : <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPropertyTaxFile(e.target.files?.[0] || null)} />}
              </div>
              {hasHOA === 'yes' && (
                <>
                  <div className="form-group">
                    <label>HOA bylaws and covenants / critical HOA docs *</label>
                    <p className="form-instruction">Obtain and upload HOA bylaws, covenants, and other critical HOA documents.</p>
                    {property.hoaDocsUrl ? <p className="on-file">✓ HOA docs on file</p> : <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setHoaDocsFile(e.target.files?.[0] || null)} />}
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
              {hasMortgage === 'yes' && (
                <>
                  <div className="form-group">
                    <label>Approximate remaining mortgage balance ($) *</label>
                    <input type="number" min="0" step="1000" value={remainingMortgage} onChange={(e) => setRemainingMortgage(e.target.value)} placeholder="e.g. 250000" />
                  </div>
                  <div className="form-group">
                    <label>Mortgage document (optional)</label>
                    {property.mortgageDocUrl ? <p className="on-file">✓ Mortgage doc on file</p> : <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setMortgageFile(e.target.files?.[0] || null)} />}
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Known liens or encumbrances</label>
                <p className="form-instruction">Toggle yes or no for each; describe any other in the box below.</p>
                <div className="lien-toggles">
                  <label><span>Tax lien?</span> <select value={lienTax} onChange={(e) => setLienTax(e.target.value)}><option value="">—</option><option value="yes">Yes</option><option value="no">No</option></select></label>
                  <label><span>HOA lien?</span> <select value={lienHOA} onChange={(e) => setLienHOA(e.target.value)}><option value="">—</option><option value="yes">Yes</option><option value="no">No</option></select></label>
                  <label><span>Mechanic&apos;s lien?</span> <select value={lienMechanic} onChange={(e) => setLienMechanic(e.target.value)}><option value="">—</option><option value="yes">Yes</option><option value="no">No</option></select></label>
                </div>
                <textarea value={lienOther} onChange={(e) => setLienOther(e.target.value)} rows={2} placeholder="Describe any other liens or encumbrances..." className="lien-other-input" />
              </div>
              {(lienTax === 'yes' || lienHOA === 'yes' || lienMechanic === 'yes' || lienOther.trim()) && (
                <div className="form-group">
                  <label>Payoff statement or lien release (if applicable)</label>
                  {property.payoffOrLienReleaseUrl ? <p className="on-file">✓ Document on file</p> : <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setPayoffFile(e.target.files?.[0] || null)} />}
                </div>
              )}
              <label className="confirm-checkbox">
                <input type="checkbox" checked={step2Confirmed} onChange={(e) => setStep2Confirmed(e.target.checked)} />
                <span>I confirm this is accurate to the best of my knowledge.</span>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="form-step">
              <h2>Price the home</h2>
              <p className="form-note">What you think the property is worth and your &quot;make me move&quot; price.</p>
              <div className="form-group">
                <label>What do you think the property is worth? ($) *</label>
                <input type="number" min="0" step="1000" value={estimatedWorth} onChange={(e) => setEstimatedWorth(e.target.value)} placeholder="e.g. 450000" required />
              </div>
              <div className="form-group">
                <label>Make me move price ($) *</label>
                <p className="form-hint">If I got this, I would pack my bags tomorrow.</p>
                <input type="number" min="0" step="1000" value={makeMeMovePrice} onChange={(e) => setMakeMeMovePrice(e.target.value)} placeholder="e.g. 500000" required />
              </div>
              <div className="form-group">
                <label className="toggle-label">
                  <input type="checkbox" checked={useCompAnalysis} onChange={(e) => setUseCompAnalysis(e.target.checked)} />
                  <span>Use comparative property analysis (select recent sales)</span>
                </label>
                {useCompAnalysis && (
                  <div className="comps-section">
                    <p className="form-hint">Select comparable recent sales on the map (up to 5). Set the sale price for each comp below.</p>
                    <div className="get-verified-comps-map">
                      <CompsMap
                        center={property?.latitude != null && property?.longitude != null ? { lat: property.latitude, lng: property.longitude } : null}
                        selectedComps={verifiedComps}
                        onCompSelect={(parcel) => {
                          const existing = verifiedComps.find((c) => (c.parcelId || c.attomId) === (parcel.attomId || parcel.parcelId));
                          if (existing) {
                            setVerifiedComps(verifiedComps.filter((c) => (c.parcelId || c.attomId) !== (parcel.attomId || parcel.parcelId)));
                          } else if (verifiedComps.length < 5) {
                            const newComp = {
                              parcelId: parcel.attomId || parcel.parcelId,
                              attomId: parcel.attomId || parcel.parcelId,
                              address: parcel.address || 'Address unknown',
                              latitude: parcel.latitude,
                              longitude: parcel.longitude,
                              closingValue: String(parcel.estimate ?? parcel.closingValue ?? ''),
                            };
                            setVerifiedComps([...verifiedComps, newComp]);
                            setCompPriceModal({ index: verifiedComps.length, address: newComp.address, closingValue: newComp.closingValue });
                          }
                        }}
                      />
                    </div>
                    {verifiedComps.length > 0 && (
                      <div className="comps-list-verified">
                        {verifiedComps.map((comp, idx) => (
                          <div key={comp.parcelId || comp.attomId || idx} className="comp-row">
                            <span className="comp-address">{comp.address}</span>
                            <span className="comp-price">
                              {comp.closingValue ? `$${Number(comp.closingValue).toLocaleString()}` : 'Price not set'}
                            </span>
                            <button type="button" className="btn btn-outline btn-small" onClick={() => setCompPriceModal({ index: idx, address: comp.address, closingValue: comp.closingValue || '' })}>
                              {comp.closingValue ? 'Edit price' : 'Set price'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="form-hint">Selected: {verifiedComps.length} of 5 comps.</p>
                  </div>
                )}
                {compPriceModal != null && (
                  <div className="comp-price-modal-overlay" onClick={() => setCompPriceModal(null)} role="presentation">
                    <div className="comp-price-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="comp-price-modal-title">
                      <h3 id="comp-price-modal-title">Set sale price for comparable</h3>
                      <p className="comp-price-modal-address">{compPriceModal.address}</p>
                      <div className="form-group">
                        <label>Sale / closing price ($) *</label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={compPriceModal.closingValue}
                          onChange={(e) => setCompPriceModal((m) => ({ ...m, closingValue: e.target.value }))}
                          placeholder="e.g. 425000"
                          autoFocus
                        />
                      </div>
                      <div className="comp-price-modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setCompPriceModal(null)}>Cancel</button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            const val = compPriceModal.closingValue.trim();
                            setVerifiedComps((prev) => {
                              const next = [...prev];
                              if (next[compPriceModal.index]) next[compPriceModal.index] = { ...next[compPriceModal.index], closingValue: val };
                              return next;
                            });
                            setCompPriceModal(null);
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <label className="confirm-checkbox">
                <input type="checkbox" checked={step3Confirmed} onChange={(e) => setStep3Confirmed(e.target.checked)} />
                <span>I confirm this is accurate to the best of my knowledge.</span>
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="form-step">
              <h2>Content</h2>
              <p className="form-note">Upload current photos and videos of the property. Home readiness is addressed in the listing checklist when you&apos;re ready to list.</p>
              <div className="form-group">
                <label>Photos</label>
                <p className="form-hint">Upload one or more current photos.</p>
                <p className={totalPhotoCount >= 1 ? 'on-file' : 'form-hint form-hint--warn'}>{totalPhotoCount >= 1 ? `✓ ${totalPhotoCount} photo(s)` : 'Add at least one photo'}</p>
                <input type="file" accept="image/*" multiple onChange={handlePhotoFilesChange} className="input-file" />
              </div>
              <div className="form-group">
                <label>Videos (optional)</label>
                <input type="file" accept="video/*" multiple onChange={(e) => setVideoFiles(Array.from(e.target.files || []))} className="input-file" />
                {videoFiles.length > 0 && <p className="form-hint">{videoFiles.length} video(s) selected</p>}
              </div>
              {((property?.photos?.length ?? 0) > 0 || photoPreviews.length > 0) && (
                <div className="photo-previews">
                  {property?.photos?.map((url, i) => <div key={`ex-${i}`} className="photo-preview"><img src={url} alt={`Photo ${i + 1}`} /></div>)}
                  {photoPreviews.map((url, i) => <div key={`new-${i}`} className="photo-preview"><img src={url} alt={`New ${i + 1}`} /></div>)}
                </div>
              )}
            </div>
          )}

          <div className="form-actions">
            {step > 1 && <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-secondary">Back</button>}
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="btn-primary"
                disabled={(step === 1 && !step1Confirmed) || (step === 2 && !step2Confirmed) || (step === 3 && !step3Confirmed)}
              >
                Next
              </button>
            ) : (
              <button type="submit" disabled={saving || totalPhotoCount < 1} className="btn-primary">
                {saving ? 'Completing...' : 'Complete verification'}
              </button>
            )}
            <button type="button" onClick={handleSaveProgress} disabled={saving} className="btn-secondary">Save progress</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GetVerified;
