import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPropertyById, updateProperty } from '../services/propertyService';
import { getVendorsByUser } from '../services/vendorService';
import { uploadFile, uploadMultipleFiles, uploadMultipleFilesWithProgress } from '../services/storageService';
import { getListingTier, getListingTierLabel } from '../utils/verificationScores';
import CompsMap from '../components/CompsMap';
import DragDropFileInput from '../components/DragDropFileInput';
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
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratingTier, setCelebratingTier] = useState('');
  const [step, setStep] = useState(1);
  const [currentTier, setCurrentTier] = useState(null);

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

  // Step 4 – Content (photos/videos) and Advanced Assets
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [inspectionReportFile, setInspectionReportFile] = useState(null);
  const [floorPlanFile, setFloorPlanFile] = useState(null);
  const [valuationDocFile, setValuationDocFile] = useState(null);
  const [compReportFile, setCompReportFile] = useState(null);
  const [disclosureFormsFile, setDisclosureFormsFile] = useState(null);
  const [professionalPhotos, setProfessionalPhotos] = useState(false);
  const [matterportTourUrl, setMatterportTourUrl] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [uploadingMessage, setUploadingMessage] = useState('');
  const [videoUploadProgress, setVideoUploadProgress] = useState(null);
  const [hasInsuranceClaims, setHasInsuranceClaims] = useState('');
  const [insuranceClaimsDescription, setInsuranceClaimsDescription] = useState('');
  const [insuranceClaimsFile, setInsuranceClaimsFile] = useState(null);

  const tierOrder = ['basic', 'complete', 'verified', 'enhanced', 'premium', 'elite'];
  const getTierIndex = (tier) => tierOrder.indexOf(tier);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/sign-in?redirect=' + encodeURIComponent(`/property/${id}/get-verified`));
    }
  }, [isAuthenticated, authLoading, navigate, id]);

  useEffect(() => {
    if (isAuthenticated && user && id) loadProperty();
  }, [isAuthenticated, user, id]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    getVendorsByUser(user.uid).then(setVendors).catch(() => setVendors([]));
  }, [isAuthenticated, user]);

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
      // Check current tier - GetVerified is for Verified tier+ to advance with documents
      const tier = getListingTier(p);
      setCurrentTier(tier);
      if (tier === 'basic' || tier === 'complete') {
        setError('Please add property information first using "Edit Property". Documents are only needed after reaching Verified tier.');
        setLoading(false);
        return;
      }
      setProperty(p);
      
      setStep(1);
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
      setProfessionalPhotos(!!p.professionalPhotos);
      setMatterportTourUrl(p.matterportTourUrl || '');
      setHasInsuranceClaims(p.hasInsuranceClaims === true ? 'yes' : p.hasInsuranceClaims === false ? 'no' : '');
      setInsuranceClaimsDescription(p.insuranceClaimsDescription || '');
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

    const hasVerifiedPricing = !!(property?.valuationDocUrl || property?.compReportUrl || valuationDocFile || compReportFile || (useCompAnalysis && verifiedComps.length >= 1));
    const totalPhotos = totalPhotoCount;
    const hasVideo = (Array.isArray(property?.videoFiles) && property.videoFiles.length > 0) || videoFiles.length > 0;
    const hasFloorPlan = !!(property?.floorPlanUrl || floorPlanFile);
    const hasMatterport = !!(matterportTourUrl.trim() || property?.matterportTourUrl);
    const hasProPhotos = professionalPhotos || property?.professionalPhotos === true;
    const hasDisclosure = !!(property?.disclosureFormsUrl || disclosureFormsFile);
    const hasInspection = !!(property?.inspectionReportUrl || inspectionReportFile);
    const hasMortgageDocs = hasMortgage === 'yes'
      ? !!(property?.mortgageDocUrl || mortgageFile || property?.payoffOrLienReleaseUrl || payoffFile)
      : (hasMortgage === 'no');
    const insuranceAnswered = hasInsuranceClaims === 'yes' || hasInsuranceClaims === 'no';
    const insuranceSatisfied = hasInsuranceClaims === 'yes'
      ? !!((insuranceClaimsDescription || '').trim() && (property?.insuranceClaimsReportUrl || insuranceClaimsFile))
      : (hasInsuranceClaims === 'no');
    const hasValueDoc = !!(property?.valuationDocUrl || valuationDocFile || property?.compReportUrl || compReportFile);

    if (currentTier === 'verified') {
      inc(!!(property?.deedUrl || deedFile));
      if (hasHOA === 'yes') inc(!!(property?.hoaDocsUrl || hoaDocsFile));
      inc(hasVerifiedPricing);
      inc(hasProPhotos);
      inc(totalPhotos >= 15);
      inc(hasFloorPlan);
      inc(hasVideo);
    } else if (currentTier === 'enhanced') {
      inc(hasDisclosure);
      inc(hasMatterport);
    } else if (currentTier === 'premium') {
      inc(hasMortgageDocs);
      inc(hasInspection);
      inc(insuranceAnswered);
      inc(insuranceSatisfied);
      inc(hasValueDoc);
    } else {
      return { completed: 1, total: 1, percentage: 100 };
    }

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const handlePhotoFiles = (files) => {
    const list = Array.isArray(files) ? files : (files ? [files] : []);
    setPhotoFiles(list);
    setPhotoPreviews(list.map((f) => URL.createObjectURL(f)));
  };

  const validateAndCollect = () => {
    const errs = [];
    console.debug('[GetVerified] validateAndCollect start', {
      id,
      currentTier,
      step,
      hasHOA,
      hasMortgage,
      hasInsuranceClaims,
      photoFiles: photoFiles.length,
      videoFiles: videoFiles.length,
      verifiedComps: verifiedComps.length,
    });
    if (currentTier === 'verified') {
      if (!step1Confirmed) errs.push('Confirm documents (Step 1)');
      if (!step2Confirmed) errs.push('Confirm verified pricing (Step 2)');
      if (!step3Confirmed) errs.push('Confirm professional assets (Step 3)');

      if (!property.deedUrl && !deedFile) errs.push('Deed');
      if (hasHOA === 'yes' && !property.hoaDocsUrl && !hoaDocsFile) errs.push('HOA documents');
      const hasVerifiedPricing = !!(property.valuationDocUrl || property.compReportUrl || valuationDocFile || compReportFile || (useCompAnalysis && verifiedComps.length >= 1));
      if (!hasVerifiedPricing) errs.push('Verified pricing (comps or appraisal)');
      const totalPhotos = totalPhotoCount;
      const hasFloorPlan = !!(property.floorPlanUrl || floorPlanFile);
      const hasVideo = (Array.isArray(property.videoFiles) && property.videoFiles.length > 0) || videoFiles.length > 0;
      if (!professionalPhotos && property.professionalPhotos !== true) errs.push('Professional photos checkbox');
      if (totalPhotos < 15) errs.push('15+ photos');
      if (!hasFloorPlan) errs.push('Floor plan');
      if (!hasVideo) errs.push('Video');
      console.debug('[GetVerified] Verified tier checks', {
        hasDeed: !!(property.deedUrl || deedFile),
        hasHoaDocs: hasHOA === 'yes' ? !!(property.hoaDocsUrl || hoaDocsFile) : true,
        hasVerifiedPricing,
        totalPhotos,
        hasFloorPlan,
        hasVideo,
        professionalPhotos: professionalPhotos || property.professionalPhotos === true,
      });
    }

    if (currentTier === 'enhanced') {
      if (!step1Confirmed) errs.push('Confirm disclosures (Step 1)');
      if (!step2Confirmed) errs.push('Confirm no additional info (Step 2)');
      if (!step3Confirmed) errs.push('Confirm professional assets (Step 3)');
      const hasDisclosures = !!(property.disclosureFormsUrl || disclosureFormsFile);
      const hasMatterport = !!((matterportTourUrl || '').trim() || property.matterportTourUrl);
      if (!hasDisclosures) errs.push('Disclosure forms');
      if (!hasMatterport) errs.push('Matterport URL');
      console.debug('[GetVerified] Enhanced tier checks', { hasDisclosures, hasMatterport });
    }

    if (currentTier === 'premium') {
      if (!step1Confirmed) errs.push('Confirm documents (Step 1)');
      if (!step2Confirmed) errs.push('Confirm 3rd party value review (Step 2)');
      if (!step3Confirmed) errs.push('Confirm professional assets (Step 3)');

      const hasMortgageDocs = !!(property.mortgageDocUrl || mortgageFile || property.payoffOrLienReleaseUrl || payoffFile);
      const hasInspection = !!(property.inspectionReportUrl || inspectionReportFile);
      if (hasMortgage !== 'yes' && hasMortgage !== 'no') errs.push('Mortgage (Yes/No)');
      if (hasMortgage === 'yes' && !hasMortgageDocs) errs.push('Mortgage/payoff documents');
      if (!hasInspection) errs.push('Inspection report');
      if (hasInsuranceClaims !== 'yes' && hasInsuranceClaims !== 'no') errs.push('Insurance claims (Yes/No)');
      if (hasInsuranceClaims === 'yes') {
        if (!insuranceClaimsDescription.trim()) errs.push('Insurance claims description');
        if (!property.insuranceClaimsReportUrl && !insuranceClaimsFile) errs.push('Insurance claims document');
      }
      const hasValueDocValidation = !!(property.valuationDocUrl || valuationDocFile || property.compReportUrl || compReportFile);
      if (!hasValueDocValidation) errs.push('Valuation or comp report');
      console.debug('[GetVerified] Premium tier checks', {
        hasMortgageDocs,
        hasInspection,
        hasInsuranceClaims: hasInsuranceClaims,
        hasClaimsDoc: !!(property.insuranceClaimsReportUrl || insuranceClaimsFile),
        hasClaimsDesc: !!insuranceClaimsDescription.trim(),
        hasValueDoc: hasValueDocValidation,
      });
    }

    console.debug('[GetVerified] validateAndCollect result', { errs });
    return errs;
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedMessage('');
    console.debug('[GetVerified] Save progress start', { id, currentTier });
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
        console.debug('[GetVerified] Saving photos', { count: photoFiles.length });
        const urls = await uploadMultipleFiles(photoFiles, `properties/${id}/photos`);
        updates.photos = [...(property.photos || []), ...urls];
        setPhotoFiles([]);
        setPhotoPreviews([]);
      }
      if (videoFiles.length > 0) {
        console.debug('[GetVerified] Saving videos', { count: videoFiles.length });
        setVideoUploadProgress(0);
        const urls = await uploadMultipleFilesWithProgress(videoFiles, `properties/${id}/videos`, (pct) => setVideoUploadProgress(pct));
        updates.videoFiles = [...(property.videoFiles || []), ...urls];
        setVideoFiles([]);
        setVideoUploadProgress(null);
      }
      
      // Advanced assets
      if (inspectionReportFile) {
        const url = await uploadFile(inspectionReportFile, `${prefix}/inspection_${Date.now()}.${ext(inspectionReportFile)}`);
        updates.inspectionReportUrl = url;
        setInspectionReportFile(null);
      }
      if (floorPlanFile) {
        const url = await uploadFile(floorPlanFile, `${prefix}/floorPlan_${Date.now()}.${ext(floorPlanFile)}`);
        updates.floorPlanUrl = url;
        setFloorPlanFile(null);
      }
      if (valuationDocFile) {
        const url = await uploadFile(valuationDocFile, `${prefix}/valuation_${Date.now()}.${ext(valuationDocFile)}`);
        updates.valuationDocUrl = url;
        setValuationDocFile(null);
      }
      if (compReportFile) {
        const url = await uploadFile(compReportFile, `${prefix}/compReport_${Date.now()}.${ext(compReportFile)}`);
        updates.compReportUrl = url;
        setCompReportFile(null);
      }
      if (disclosureFormsFile) {
        const url = await uploadFile(disclosureFormsFile, `${prefix}/disclosures_${Date.now()}.${ext(disclosureFormsFile)}`);
        updates.disclosureFormsUrl = url;
        setDisclosureFormsFile(null);
      }
      if (professionalPhotos) {
        updates.professionalPhotos = true;
      }
      if (matterportTourUrl.trim()) {
        updates.matterportTourUrl = matterportTourUrl.trim();
      }
      if (hasInsuranceClaims === 'yes' || hasInsuranceClaims === 'no') {
        updates.hasInsuranceClaims = hasInsuranceClaims === 'yes';
      }
      if (insuranceClaimsDescription.trim()) {
        updates.insuranceClaimsDescription = insuranceClaimsDescription.trim();
      }
      if (insuranceClaimsFile) {
        const url = await uploadFile(insuranceClaimsFile, `${prefix}/insuranceClaims_${Date.now()}.${ext(insuranceClaimsFile)}`);
        updates.insuranceClaimsReportUrl = url;
        setInsuranceClaimsFile(null);
      }
      if (Object.keys(updates).length > 0) {
        console.debug('[GetVerified] Save progress update payload', updates);
        await updateProperty(id, updates);
        await loadProperty();
        setSavedMessage('Progress saved');
        setTimeout(() => setSavedMessage(''), 3000);
      } else {
        console.debug('[GetVerified] Save progress skipped: no updates');
      }
    } catch (err) {
      setVideoUploadProgress(null);
      setError('Failed to save progress. Please try again.');
      console.error('[GetVerified] Save progress error', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateAndCollect();
    if (errs.length > 0) {
      setError('Please complete: ' + errs.join(', '));
      console.warn('[GetVerified] Submit blocked', { errs, currentTier });
      return;
    }
    setSaving(true);
    setError(null);
    setSavedMessage('');
    if (videoFiles.length > 0) {
      setUploadingMessage(`Uploading ${videoFiles.length} video(s)… please keep this tab open.`);
    } else if (photoFiles.length > 0) {
      setUploadingMessage(`Uploading ${photoFiles.length} photo(s)…`);
    } else {
      setUploadingMessage('Completing update…');
    }
    console.debug('[GetVerified] Submit start', {
      id,
      currentTier,
      step,
      photoFiles: photoFiles.length,
      videoFiles: videoFiles.length,
      verifiedComps: verifiedComps.length,
    });
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
      let videos = property.videoFiles || [];
      if (videoFiles.length > 0) {
        console.debug('[GetVerified] Uploading videos', { count: videoFiles.length });
        setVideoUploadProgress(0);
        const urls = await uploadMultipleFilesWithProgress(videoFiles, `properties/${id}/videos`, (pct) => setVideoUploadProgress(pct));
        videos = [...videos, ...urls];
        console.debug('[GetVerified] Video upload complete', { count: urls.length });
        setVideoUploadProgress(null);
      }

      // Upload advanced assets if provided
      let inspectionReportUrl = property.inspectionReportUrl;
      if (!inspectionReportUrl && inspectionReportFile) {
        inspectionReportUrl = await uploadFile(inspectionReportFile, `${prefix}/inspection_${Date.now()}.${ext(inspectionReportFile)}`);
      }
      let floorPlanUrl = property.floorPlanUrl;
      if (!floorPlanUrl && floorPlanFile) {
        floorPlanUrl = await uploadFile(floorPlanFile, `${prefix}/floorPlan_${Date.now()}.${ext(floorPlanFile)}`);
      }
      let valuationDocUrl = property.valuationDocUrl;
      if (!valuationDocUrl && valuationDocFile) {
        valuationDocUrl = await uploadFile(valuationDocFile, `${prefix}/valuation_${Date.now()}.${ext(valuationDocFile)}`);
      }
      let compReportUrl = property.compReportUrl;
      if (!compReportUrl && compReportFile) {
        compReportUrl = await uploadFile(compReportFile, `${prefix}/compReport_${Date.now()}.${ext(compReportFile)}`);
      }
      let disclosureFormsUrl = property.disclosureFormsUrl;
      if (!disclosureFormsUrl && disclosureFormsFile) {
        disclosureFormsUrl = await uploadFile(disclosureFormsFile, `${prefix}/disclosures_${Date.now()}.${ext(disclosureFormsFile)}`);
      }
      let insuranceClaimsReportUrl = property.insuranceClaimsReportUrl;
      if (!insuranceClaimsReportUrl && insuranceClaimsFile) {
        insuranceClaimsReportUrl = await uploadFile(insuranceClaimsFile, `${prefix}/insuranceClaims_${Date.now()}.${ext(insuranceClaimsFile)}`);
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
        videoFiles: videos,
        // Advanced assets
        inspectionReportUrl: inspectionReportUrl ?? property.inspectionReportUrl ?? null,
        floorPlanUrl: floorPlanUrl ?? property.floorPlanUrl ?? null,
        valuationDocUrl: valuationDocUrl ?? property.valuationDocUrl ?? null,
        compReportUrl: compReportUrl ?? property.compReportUrl ?? null,
        disclosureFormsUrl: disclosureFormsUrl ?? property.disclosureFormsUrl ?? null,
        matterportTourUrl: matterportTourUrl.trim() || property.matterportTourUrl || null,
        professionalPhotos: professionalPhotos || property.professionalPhotos || null,
        hasInsuranceClaims: hasInsuranceClaims === 'yes' ? true : hasInsuranceClaims === 'no' ? false : null,
        insuranceClaimsDescription: insuranceClaimsDescription.trim() || property.insuranceClaimsDescription || null,
        insuranceClaimsReportUrl: insuranceClaimsReportUrl ?? property.insuranceClaimsReportUrl ?? null,
      };
      Object.keys(updates).forEach((key) => {
        if (updates[key] === undefined) delete updates[key];
      });

      console.debug('[GetVerified] Submit update payload', updates);
      await updateProperty(id, updates);
      console.debug('[GetVerified] Submit update complete', { id });
      const updated = await getPropertyById(id);
      const newTier = getListingTier(updated);
      console.debug('[GetVerified] Tier after submit', { currentTier, newTier });
      if (getTierIndex(newTier) > getTierIndex(currentTier)) {
        setCelebratingTier(getListingTierLabel(newTier));
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          navigate(`/property/${id}`);
        }, 2500);
        return;
      }
      setSuccess(true);
    } catch (err) {
      setVideoUploadProgress(null);
      setError('Failed to complete verification. Please try again.');
      console.error('[GetVerified] Submit error', err);
    } finally {
      setUploadingMessage('');
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
          <h2>Your property tier has been updated</h2>
          <p>Your changes are saved and your tier will update based on requirements.</p>
          <Link to={`/property/${id}`} className="btn btn-primary btn-large">View Property</Link>
        </div>
      </div>
    );
  }
  if (!property) return null;

  const { percentage } = getVerificationProgress();
  const isVerifiedTier = currentTier === 'verified';
  const isEnhancedTier = currentTier === 'enhanced';
  const isPremiumTier = currentTier === 'premium';
  const isEliteTier = currentTier === 'elite';
  const stepLabels = isVerifiedTier
    ? ['Documents', 'Verified Pricing', 'Professional Assets']
    : isEnhancedTier
    ? ['Disclosure Forms', 'No Additional Info', 'Matterport']
    : isPremiumTier
    ? ['Documents & Claims', '3rd Party Value Review', 'Confirm Assets']
    : ['Complete', 'Complete', 'Complete'];

  return (
    <div className="get-verified-page">
      {showCelebration && (
        <div className="celebration-overlay">
          <div className="celebration-container">
            <div className="celebration-checks">
              {[
                { x: '80px', y: '0' },
                { x: '69px', y: '40px' },
                { x: '40px', y: '69px' },
                { x: '0', y: '80px' },
                { x: '-40px', y: '69px' },
                { x: '-69px', y: '40px' },
                { x: '-80px', y: '0' },
                { x: '-69px', y: '-40px' },
                { x: '-40px', y: '-69px' },
                { x: '0', y: '-80px' },
                { x: '40px', y: '-69px' },
                { x: '69px', y: '-40px' },
              ].map((pos, i) => (
                <span key={i} className="celebration-check" style={{
                  '--delay': `${i * 0.1}s`,
                  '--final-x': `calc(-50% + ${pos.x})`,
                  '--final-y': `calc(-50% + ${pos.y})`,
                }}>✓</span>
              ))}
            </div>
            <h2 className="celebration-title">Congratulations!</h2>
            <p className="celebration-message">Your property is now {celebratingTier} tier!</p>
          </div>
        </div>
      )}
      <div className="get-verified-container">
        <h1>Advance Property Tier</h1>
        <p className="get-verified-intro">
          {isVerifiedTier && 'Complete the required documents, pricing verification, and professional assets to advance to Enhanced.'}
          {isEnhancedTier && 'Complete disclosures and add a Matterport link to advance to Premium.'}
          {isPremiumTier && 'Complete the required documents, claims info, and value review to advance to Elite.'}
          {isEliteTier && 'Your property already meets Elite tier requirements.'}
        </p>
        <div className="verification-progress">
          <div className="verification-progress-bar">
            <div className="verification-progress-fill" style={{ width: `${percentage}%` }} />
          </div>
          <span className="verification-progress-text">{percentage}% complete</span>
        </div>
        <div className="step-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1. {stepLabels[0]}</div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2. {stepLabels[1]}</div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>3. {stepLabels[2]}</div>
        </div>
        {error && <div className="error-message">{error}</div>}
        {savedMessage && <div className="saved-message">{savedMessage}</div>}
        {uploadingMessage && <div className="saved-message">{uploadingMessage}</div>}
        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="form-step">
              {isVerifiedTier && (
                <>
                  <h2>Documents</h2>
                  <p className="form-note">Upload deed and HOA documents (if applicable) to advance to Enhanced.</p>
                  <div className="form-group">
                    <label>Deed *</label>
                    <DragDropFileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(f) => setDeedFile(f || null)} hint="PDF, JPG, or PNG." placeholder="Drop deed here or click to browse" />
                    {property.deedUrl && (
                      <a className="doc-filename" href={property.deedUrl} target="_blank" rel="noreferrer">✓ Deed on file</a>
                    )}
                    {deedFile && <span className="doc-filename">✓ {deedFile.name} (selected)</span>}
                  </div>
                  {hasHOA === 'yes' && (
                    <div className="form-group">
                      <label>HOA documents (if applicable) *</label>
                      <DragDropFileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(f) => setHoaDocsFile(f || null)} hint="PDF, JPG, or PNG." placeholder="Drop HOA docs here or click to browse" />
                      {property.hoaDocsUrl && (
                        <a className="doc-filename" href={property.hoaDocsUrl} target="_blank" rel="noreferrer">✓ HOA docs on file</a>
                      )}
                      {hoaDocsFile && <span className="doc-filename">✓ {hoaDocsFile.name} (selected)</span>}
                    </div>
                  )}
                </>
              )}

              {isEnhancedTier && (
                <>
                  <h2>Disclosure Forms</h2>
                  <p className="form-note">Disclosure forms are required to advance to Premium.</p>
                  <div className="form-group">
                    <label>Disclosure forms *</label>
                    <DragDropFileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(f) => setDisclosureFormsFile(f || null)} placeholder="Drop disclosure forms here or click to browse" />
                    {property.disclosureFormsUrl && (
                      <a className="doc-filename" href={property.disclosureFormsUrl} target="_blank" rel="noreferrer">✓ Disclosure forms on file</a>
                    )}
                    {disclosureFormsFile && <span className="doc-filename">✓ {disclosureFormsFile.name} (selected)</span>}
                  </div>
                </>
              )}

              {isPremiumTier && (
                <>
                  <h2>Documents & Claims</h2>
                  <p className="form-note">Add mortgage docs (if applicable), inspection report, and insurance claims info.</p>
                  <div className="form-group">
                    <label>Mortgage? *</label>
                    <select value={hasMortgage} onChange={(e) => setHasMortgage(e.target.value)} required>
                      <option value="">Select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  {hasMortgage === 'yes' && (
                    <div className="form-group">
                      <label>Mortgage / payoff document *</label>
                      <DragDropFileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(f) => setMortgageFile(f || null)} hint="PDF, JPG, or PNG." placeholder="Drop mortgage or payoff document here or click to browse" />
                      {(property.mortgageDocUrl || property.payoffOrLienReleaseUrl) && (
                        <a className="doc-filename" href={property.mortgageDocUrl || property.payoffOrLienReleaseUrl} target="_blank" rel="noreferrer">✓ Document on file</a>
                      )}
                      {mortgageFile && <span className="doc-filename">✓ {mortgageFile.name} (selected)</span>}
                    </div>
                  )}
                  <div className="form-group">
                    <label>Proactive inspection report *</label>
                    <DragDropFileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(f) => setInspectionReportFile(f || null)} placeholder="Drop inspection report here or click to browse" />
                    {property.inspectionReportUrl && (
                      <a className="doc-filename" href={property.inspectionReportUrl} target="_blank" rel="noreferrer">✓ Inspection report on file</a>
                    )}
                    {inspectionReportFile && <span className="doc-filename">✓ {inspectionReportFile.name} (selected)</span>}
                  </div>
                  <div className="form-group">
                    <label>Insurance claims in last 5 years? *</label>
                    <select value={hasInsuranceClaims} onChange={(e) => setHasInsuranceClaims(e.target.value)} required>
                      <option value="">Select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  {hasInsuranceClaims === 'yes' && (
                    <>
                      <div className="form-group">
                        <label>Describe the claims *</label>
                        <textarea value={insuranceClaimsDescription} onChange={(e) => setInsuranceClaimsDescription(e.target.value)} rows={3} placeholder="Describe the claims..." />
                      </div>
                      <div className="form-group">
                        <label>Upload claims document *</label>
                        <DragDropFileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(f) => setInsuranceClaimsFile(f || null)} placeholder="Drop claims document here or click to browse" />
                        {property.insuranceClaimsReportUrl && (
                          <a className="doc-filename" href={property.insuranceClaimsReportUrl} target="_blank" rel="noreferrer">✓ Claims document on file</a>
                        )}
                        {insuranceClaimsFile && <span className="doc-filename">✓ {insuranceClaimsFile.name} (selected)</span>}
                      </div>
                    </>
                  )}
                </>
              )}

              {isEliteTier && (
                <>
                  <h2>Elite Tier Complete</h2>
                  <p className="form-note">Your property already meets Elite tier requirements.</p>
                </>
              )}

              <label className="confirm-checkbox">
                <input type="checkbox" checked={step1Confirmed} onChange={(e) => setStep1Confirmed(e.target.checked)} />
                <span>I confirm this is accurate to the best of my knowledge.</span>
              </label>
            </div>
          )}


          {step === 2 && (
            <div className="form-step">
              {isVerifiedTier && (
                <>
                  <h2>Verified Pricing</h2>
                  <p className="form-note">Provide verified pricing via comps or an appraisal report.</p>
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
                  <div className="form-group">
                    <label>Appraisal report (optional alternative)</label>
                    <DragDropFileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(f) => setValuationDocFile(f || null)} placeholder="Drop appraisal report here or click to browse" />
                    {property?.valuationDocUrl && (
                      <a className="doc-filename" href={property.valuationDocUrl} target="_blank" rel="noreferrer">✓ Appraisal on file</a>
                    )}
                    {valuationDocFile && <span className="doc-filename">✓ {valuationDocFile.name} (selected)</span>}
                  </div>
                </>
              )}

              {isEnhancedTier && (
                <>
                  <h2>No Additional Information</h2>
                  <p className="form-note">No extra information is needed on this step.</p>
                </>
              )}

              {isPremiumTier && (
                <>
                  <h2>Valuation Documentation</h2>
                  <p className="form-note">Upload an appraisal or comparable sales report to reach Elite tier.</p>
                  <div className="form-group">
                    <label>Appraisal / valuation report</label>
                    <DragDropFileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(f) => setValuationDocFile(f || null)} placeholder="Drop appraisal report here or click to browse" />
                    {property?.valuationDocUrl && (
                      <a className="doc-filename" href={property.valuationDocUrl} target="_blank" rel="noreferrer">✓ Appraisal on file</a>
                    )}
                    {valuationDocFile && <span className="doc-filename">✓ {valuationDocFile.name} (selected)</span>}
                  </div>
                </>
              )}

              <label className="confirm-checkbox">
                <input type="checkbox" checked={step2Confirmed} onChange={(e) => setStep2Confirmed(e.target.checked)} />
                <span>I confirm this is accurate to the best of my knowledge.</span>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="form-step">
              {isVerifiedTier && (
                <>
                  <h2>Professional Assets</h2>
                  <p className="form-note">Add professional photos (15+), a floor plan, and a video to reach Enhanced.</p>
                  <div className="form-group">
                    <label>Professional Photos *</label>
                    <label className="toggle-label">
                      <input type="checkbox" checked={professionalPhotos} onChange={(e) => setProfessionalPhotos(e.target.checked)} />
                      <span>I certify these were shot by a professional</span>
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Photos *</label>
                    <p className="form-hint">At least 15 photos required.</p>
                    <DragDropFileInput multiple accept="image/*" onChange={(files) => handlePhotoFiles(files || [])} placeholder="Drop photos here or click to browse" />
                    <p className="form-hint">Total photos: {totalPhotoCount} / 15 minimum</p>
                  </div>
                  <div className="form-group">
                    <label>Floor plan *</label>
                    <DragDropFileInput accept=".pdf,.jpg,.jpeg,.png" onChange={(f) => setFloorPlanFile(f || null)} placeholder="Drop floor plan here or click to browse" />
                    {property?.floorPlanUrl && (
                      <a className="doc-filename" href={property.floorPlanUrl} target="_blank" rel="noreferrer">✓ Floor plan on file</a>
                    )}
                    {floorPlanFile && <span className="doc-filename">✓ {floorPlanFile.name} (selected)</span>}
                  </div>
                  <div className="form-group">
                    <label>Video *</label>
                    <DragDropFileInput multiple accept="video/*" onChange={(files) => setVideoFiles(Array.isArray(files) ? files : files ? [files] : [])} placeholder="Drop videos here or click to browse" />
                    {property?.videoFiles?.length > 0 && (
                      <p className="doc-filename">✓ {property.videoFiles.length} video(s) on file</p>
                    )}
                    {videoFiles.length > 0 && <p className="doc-filename">✓ {videoFiles.length} video(s) selected</p>}
                    {typeof videoUploadProgress === 'number' && (
                      <div className="upload-progress">
                        <div className="upload-progress__bar" style={{ width: `${videoUploadProgress}%` }} />
                        <span className="upload-progress__label">{videoUploadProgress}% uploaded</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {isEnhancedTier && (
                <>
                  <h2>Matterport</h2>
                  <p className="form-note">Add a Matterport link to reach Premium.</p>
                  <div className="form-group">
                    <label>Matterport URL *</label>
                    <input type="url" placeholder="https://..." value={matterportTourUrl || property?.matterportTourUrl || ''} onChange={(e) => setMatterportTourUrl(e.target.value)} className="form-input" />
                    {(matterportTourUrl || property?.matterportTourUrl) && <span className="doc-filename">✓ Matterport tour linked</span>}
                  </div>
                </>
              )}

              {isPremiumTier && (
                <>
                  <h2>Confirm Assets</h2>
                  <p className="form-note">Confirm all professional assets are present.</p>
                  <div className="form-group">
                    <p className={totalPhotoCount >= 15 ? 'on-file' : 'form-hint form-hint--warn'}>
                      {totalPhotoCount >= 15 ? `✓ ${totalPhotoCount} photos` : '15+ photos required'}
                    </p>
                    <p className={property?.floorPlanUrl ? 'on-file' : 'form-hint form-hint--warn'}>
                      {property?.floorPlanUrl ? '✓ Floor plan on file' : 'Floor plan required'}
                    </p>
                    <p className={(Array.isArray(property?.videoFiles) && property.videoFiles.length > 0) ? 'on-file' : 'form-hint form-hint--warn'}>
                      {(Array.isArray(property?.videoFiles) && property.videoFiles.length > 0) ? '✓ Video on file' : 'Video required'}
                    </p>
                    <p className={property?.matterportTourUrl ? 'on-file' : 'form-hint form-hint--warn'}>
                      {property?.matterportTourUrl ? '✓ Matterport linked' : 'Matterport URL required'}
                    </p>
                  </div>
                </>
              )}

              <label className="confirm-checkbox">
                <input type="checkbox" checked={step3Confirmed} onChange={(e) => setStep3Confirmed(e.target.checked)} />
                <span>I confirm this is accurate to the best of my knowledge.</span>
              </label>
            </div>
          )}

          <div className="form-actions">
            {step > 1 && <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-secondary">Back</button>}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="btn-primary"
                disabled={(step === 1 && !step1Confirmed) || (step === 2 && !step2Confirmed) || (step === 3 && !step3Confirmed)}
              >
                Next
              </button>
            ) : (
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Completing...' : 'Complete update'}
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
