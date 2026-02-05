import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile, updateUserPassword, logout } from '../services/authService';
import { getFollowing, getFollowers } from '../services/followService';
import { getPurchaseProfile, setPurchaseProfile, updatePurchaseProfile } from '../services/profileService';
import { uploadFile } from '../services/storageService';
import { meetsVerifiedBuyerCriteria } from '../utils/verificationScores';
import DragDropFileInput from '../components/DragDropFileInput';
import { createPersonaInquiry } from '../services/personaService';
import { extractGovernmentIdInfo } from '../utils/idExtraction';
import { extractPdfAmount } from '../utils/pdfAmount';
import Persona from 'persona';
import './Profile.css';

const Profile = () => {
  const { user, userProfile, isAuthenticated, loading: authLoading, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [form, setForm] = useState({
    name: '',
    dob: '',
    phone: '',
    publicUsername: '',
    anonymousProfile: false,
    bankName: '',
  });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showBankLinkModal, setShowBankLinkModal] = useState(false);
  const [governmentIdUploading, setGovernmentIdUploading] = useState(false);
  const [governmentIdError, setGovernmentIdError] = useState('');
  const [personaLoading, setPersonaLoading] = useState(false);
  const [personaError, setPersonaError] = useState('');
  const personaClientRef = useRef(null);
  const [purchaseProfile, setPurchaseProfileState] = useState(null);
  const [editingBuyingPower, setEditingBuyingPower] = useState(false);
  const [buyingPowerForm, setBuyingPowerForm] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    getPurchaseProfile(user.uid).then(setPurchaseProfileState);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    Promise.all([getFollowers(user.uid), getFollowing(user.uid)]).then(([followers, following]) => {
      setFollowerCount(followers.length);
      setFollowingCount(following.length);
    });
  }, [user?.uid]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/sign-in?redirect=/profile');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      if (personaClientRef.current?.destroy) {
        personaClientRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    setForm({
      name: userProfile?.name || user?.displayName || '',
      dob: userProfile?.dob || '',
      phone: userProfile?.phone || '',
      publicUsername: userProfile?.publicUsername || '',
      anonymousProfile: userProfile?.anonymousProfile === true,
      bankName: userProfile?.bankName || '',
    });
  }, [user?.uid, user?.displayName, userProfile]);

  const displayEmail = useMemo(() => userProfile?.email || user?.email || '', [userProfile?.email, user?.email]);

  const handleSaveProfile = async () => {
    if (!user?.uid || saving) return;
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const name = form.name.trim();
      const phone = form.phone.trim();
      const dob = form.dob || null;
      const bankName = form.bankName.trim();
      const anonymousProfile = !!form.anonymousProfile;
      const publicUsername = anonymousProfile
        ? ((form.publicUsername || '').trim() || 'Anonymous')
        : ((form.publicUsername || '').trim() || null);
      await updateUserProfile(user.uid, {
        name: name || null,
        dob,
        phone: phone || null,
        bankName: bankName || null,
        publicUsername,
        anonymousProfile,
      });
      await refreshUserProfile?.(user.uid);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetProfileForm = () => {
    setForm({
      name: userProfile?.name || user?.displayName || '',
      dob: userProfile?.dob || '',
      phone: userProfile?.phone || '',
      publicUsername: userProfile?.publicUsername || '',
      anonymousProfile: userProfile?.anonymousProfile === true,
      bankName: userProfile?.bankName || '',
    });
  };

  const handleChangePassword = async () => {
    if (!user?.uid || passwordSaving) return;
    const next = passwordForm.password.trim();
    const confirm = passwordForm.confirm.trim();
    if (!next || next.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (next !== confirm) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordError('');
    setPasswordSaved(false);
    setPasswordSaving(true);
    try {
      await updateUserPassword(next);
      setPasswordForm({ password: '', confirm: '' });
      setPasswordSaved(true);
      window.setTimeout(() => setPasswordSaved(false), 2500);
    } catch (err) {
      console.error('Error updating password:', err);
      setPasswordError('Failed to update password. You may need to sign in again.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      navigate('/sign-in');
    } catch (err) {
      console.error('Error signing out:', err);
      setError('Failed to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const normalizeDate = (value) => {
    if (!value) return null;
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return value;
    const altMatch = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (!altMatch) return null;
    const month = altMatch[1].padStart(2, '0');
    const day = altMatch[2].padStart(2, '0');
    return `${altMatch[3]}-${month}-${day}`;
  };

  const normalizeName = (value) =>
    (value || '').toLowerCase().replace(/[^a-z]/g, '');

  const isGovernmentIdVerified = (() => {
    const personaStatus = (userProfile?.governmentIdPersonaStatus || '').toLowerCase();
    if (personaStatus) {
      return ['completed', 'approved'].includes(personaStatus);
    }
    const extractedName = normalizeName(userProfile?.governmentIdExtractedName);
    const profileName = normalizeName(userProfile?.name || user?.displayName);
    const extractedDob = normalizeDate(userProfile?.governmentIdExtractedDob);
    const profileDob = normalizeDate(userProfile?.dob);
    if (!extractedName || !extractedDob || !profileName || !profileDob) return false;
    return extractedName === profileName && extractedDob === profileDob;
  })();

  const formatCurrency = (n) =>
    n != null && Number.isFinite(n)
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
      : '—';

  const computeBuyingPowerValidation = (buyingPower, amounts = {}) => {
    const values = Object.values(amounts)
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0);
    if (buyingPower == null || buyingPower === '') {
      return { status: 'pending', message: 'Enter buying power to validate.' };
    }
    if (!values.length) {
      return { status: 'pending', message: 'Upload a document to validate buying power.' };
    }
    const maxAmount = Math.max(...values);
    if (Number(buyingPower) <= maxAmount) {
      return { status: 'validated', message: `Validated against document amount ${formatCurrency(maxAmount)}.` };
    }
    return { status: 'not_approved', message: 'Not approved - please review with support team.' };
  };

  const overallBuyingPowerVerified =
    isGovernmentIdVerified && purchaseProfile?.buyingPowerValidationStatus === 'validated';

  const handleSaveBuyingPower = async () => {
    const parsed = buyingPowerForm.trim() === '' ? null : parseFloat(buyingPowerForm.replace(/,/g, ''));
    if (buyingPowerForm.trim() !== '' && !Number.isFinite(parsed)) {
      alert('Please enter a valid number for buying power.');
      return;
    }
    try {
      const validation = computeBuyingPowerValidation(parsed ?? null, purchaseProfile?.verificationDocumentAmounts || {});
      await setPurchaseProfile(user.uid, {
        buyingPower: parsed ?? null,
        buyingPowerValidationStatus: validation.status,
        buyingPowerValidationMessage: validation.message,
      });
      setPurchaseProfileState((p) => (p ? {
        ...p,
        buyingPower: parsed ?? null,
        buyingPowerValidationStatus: validation.status,
        buyingPowerValidationMessage: validation.message,
      } : null));
      setEditingBuyingPower(false);
      setBuyingPowerForm('');
    } catch (err) {
      console.error(err);
      alert('Failed to save. Please try again.');
    }
  };

  const handleReplaceDocument = async (field, file) => {
    if (!file || !user?.uid) return;
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File must be under 10MB.');
      return;
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      alert('File must be PDF, JPG, or PNG.');
      return;
    }
    const amountEligible = ['proofOfFunds', 'preApprovalLetter', 'bankLetter'];
    setUploadingDoc(field);
    try {
      const ext = file.name.split('.').pop();
      const path = `buyer-verification/${user.uid}/${Date.now()}_${field}.${ext}`;
      const url = await uploadFile(file, path);
      const docs = { ...(purchaseProfile?.verificationDocuments || {}), [field]: url };
      const amounts = { ...(purchaseProfile?.verificationDocumentAmounts || {}) };
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (amountEligible.includes(field) && isPdf) {
        const extracted = await extractPdfAmount(file);
        if (extracted != null) amounts[field] = extracted;
        else delete amounts[field];
      }
      const validation = computeBuyingPowerValidation(purchaseProfile?.buyingPower ?? null, amounts);
      const updates = {
        verificationDocuments: docs,
        buyingPowerValidationStatus: validation.status,
        buyingPowerValidationMessage: validation.message,
      };
      if (amountEligible.includes(field)) updates.verificationDocumentAmounts = amounts;
      await setPurchaseProfile(user.uid, updates);
      setPurchaseProfileState((p) => (p ? {
        ...p,
        verificationDocuments: docs,
        verificationDocumentAmounts: amounts,
        buyingPowerValidationStatus: validation.status,
        buyingPowerValidationMessage: validation.message,
      } : null));
    } catch (err) {
      console.error(err);
      alert('Failed to upload. Please try again.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleRemoveDocument = async (key) => {
    if (!window.confirm(`Remove ${key === 'proofOfFunds' ? 'Proof of Funds' : key === 'preApprovalLetter' ? 'Pre-Approval Letter' : key === 'bankLetter' ? 'Bank Letter' : 'document'}?`)) return;
    const docs = { ...(purchaseProfile?.verificationDocuments || {}) };
    delete docs[key];
    const nextProfile = { ...purchaseProfile, verificationDocuments: docs };
    const stillVerified = meetsVerifiedBuyerCriteria(nextProfile);
    const amounts = { ...(purchaseProfile?.verificationDocumentAmounts || {}) };
    delete amounts[key];
    const validation = computeBuyingPowerValidation(purchaseProfile?.buyingPower ?? null, amounts);
    const updates = {
      [`verificationDocuments.${key}`]: deleteField(),
      [`verificationDocumentAmounts.${key}`]: deleteField(),
      buyingPowerValidationStatus: validation.status,
      buyingPowerValidationMessage: validation.message,
    };
    if (!stillVerified) {
      updates.buyerVerified = false;
      updates.buyerVerifiedAt = null;
    }
    try {
      await updatePurchaseProfile(user.uid, updates);
      setPurchaseProfileState((p) => {
        if (!p) return p;
        const next = { ...p, verificationDocuments: docs };
        next.verificationDocumentAmounts = amounts;
        next.buyingPowerValidationStatus = validation.status;
        next.buyingPowerValidationMessage = validation.message;
        if (!stillVerified) {
          next.buyerVerified = false;
          next.buyerVerifiedAt = null;
        }
        return next;
      });
    } catch (err) {
      console.error(err);
      alert('Failed to remove. Please try again.');
    }
  };

  const handleRemoveBuyingPower = async () => {
    if (!window.confirm('Remove your buying power amount? You can add it again later.')) return;
    try {
      await setPurchaseProfile(user.uid, { buyingPower: null });
      setPurchaseProfileState((p) => (p ? { ...p, buyingPower: null } : null));
      setEditingBuyingPower(false);
      setBuyingPowerForm('');
    } catch (err) {
      console.error(err);
      alert('Failed to remove. Please try again.');
    }
  };

  const readPersonaField = (fields, key, altKey) => {
    if (!fields) return null;
    const value = fields[key] ?? fields[altKey];
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.value) return value.value;
    return null;
  };

  const parsePersonaFields = (fields) => {
    const first = readPersonaField(fields, 'name-first', 'name_first');
    const middle = readPersonaField(fields, 'name-middle', 'name_middle');
    const last = readPersonaField(fields, 'name-last', 'name_last');
    const birthdate = readPersonaField(fields, 'birthdate', 'birthdate');
    const nameParts = [first, middle, last].filter(Boolean);
    return {
      extractedName: nameParts.length ? nameParts.join(' ') : null,
      extractedDob: birthdate || null,
    };
  };

  const splitNameParts = (fullName) => {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return {};
    const first = parts[0];
    const last = parts.length > 1 ? parts[parts.length - 1] : '';
    const middle = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
    return { first, middle, last };
  };

  const handlePersonaVerification = async () => {
    if (!user?.uid || personaLoading) return;
    setPersonaError('');
    setGovernmentIdError('');
    setPersonaLoading(true);
    try {
      const environmentId = import.meta.env.VITE_PERSONA_ENV_ID;
      if (!environmentId) {
        throw new Error('Persona environment ID not configured.');
      }

      const templateId = import.meta.env.VITE_PERSONA_TEMPLATE_ID;
      const forceHosted = String(import.meta.env.VITE_PERSONA_FORCE_HOSTED || '').toLowerCase() === 'true';
      const name = userProfile?.name || user?.displayName || '';
      const { first, middle, last } = splitNameParts(name);
      const fields = {
        ...(first ? { 'name-first': first } : {}),
        ...(middle ? { 'name-middle': middle } : {}),
        ...(last ? { 'name-last': last } : {}),
        ...(userProfile?.dob ? { birthdate: userProfile.dob } : {}),
        ...(userProfile?.email || user?.email ? { 'email-address': userProfile?.email || user?.email } : {}),
      };

      let inquiryId = null;
      let sessionToken = null;

      const created = await createPersonaInquiry({
        name: userProfile?.name || user?.displayName,
        dob: userProfile?.dob,
        email: userProfile?.email || user?.email,
        templateId,
      });
      inquiryId = created?.inquiryId;
      sessionToken = created?.sessionToken;

      if (forceHosted) {
        if (created?.hostedLink) {
          window.open(created.hostedLink, '_blank', 'noopener,noreferrer');
          setPersonaError('Opened hosted verification in a new tab.');
          return;
        }
        throw new Error('Persona hosted link could not be created.');
      }
      if (personaClientRef.current?.destroy) {
        personaClientRef.current.destroy();
      }
      const client = new Persona.Client({
        ...(templateId ? { templateId } : { inquiryId }),
        environmentId,
        referenceId: user?.uid,
        fields,
        ...(sessionToken ? { sessionToken } : {}),
        onReady: () => client.open(),
        onComplete: async ({ inquiryId: completedId, status, fields }) => {
          const { extractedName, extractedDob } = parsePersonaFields(fields);
          const resolvedInquiryId = completedId || inquiryId || null;
          await updateUserProfile(user.uid, {
            governmentIdPersonaInquiryId: resolvedInquiryId,
            governmentIdPersonaStatus: status || null,
            governmentIdExtractedName: extractedName || null,
            governmentIdExtractedDob: extractedDob || null,
          });
          await refreshUserProfile?.(user.uid);

          const purchaseProfile = await getPurchaseProfile(user.uid);
          const docs = { ...(purchaseProfile?.verificationDocuments || {}) };
          docs.governmentId = resolvedInquiryId ? `persona:${resolvedInquiryId}` : 'persona';
          await setPurchaseProfile(user.uid, {
            verificationDocuments: docs,
            governmentIdPersonaInquiryId: resolvedInquiryId,
            governmentIdPersonaStatus: status || null,
            governmentIdExtractedName: extractedName || null,
            governmentIdExtractedDob: extractedDob || null,
          });
          client.destroy();
        },
        onCancel: () => {
          client.destroy();
        },
        onError: async (error) => {
          console.error('Persona error:', error);
          try {
            const created = await createPersonaInquiry({
              name: userProfile?.name || user?.displayName,
              dob: userProfile?.dob,
              email: userProfile?.email || user?.email,
              templateId,
            });
            if (created?.hostedLink) {
              window.open(created.hostedLink, '_blank', 'noopener,noreferrer');
              setPersonaError('Persona embedded flow failed. Opened hosted verification in a new tab.');
            } else {
              setPersonaError('Persona verification failed. Please try again.');
            }
          } catch (hostedError) {
            console.error('Persona hosted fallback error:', hostedError);
            setPersonaError('Persona verification failed. Please try again.');
          }
          client.destroy();
        },
      });
      personaClientRef.current = client;
    } catch (err) {
      console.error('Persona verification error:', err);
      setPersonaError(err?.message || 'Failed to start Persona verification.');
    } finally {
      setPersonaLoading(false);
    }
  };

  const handleGovernmentIdUpload = async (file) => {
    if (!file || !user?.uid) return;
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setGovernmentIdError('File must be under 10MB.');
      return;
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setGovernmentIdError('File must be PDF, JPG, or PNG.');
      return;
    }
    setGovernmentIdUploading(true);
    setGovernmentIdError('');
    try {
      const { extractedName, extractedDob } = await extractGovernmentIdInfo(file, {
        name: userProfile?.name || user?.displayName,
        dob: userProfile?.dob,
      });
      const ext = file.name.split('.').pop();
      const path = `government-ids/${user.uid}/${Date.now()}.${ext}`;
      const url = await uploadFile(file, path);

      await updateUserProfile(user.uid, {
        governmentIdUrl: url,
        governmentIdExtractedName: extractedName || null,
        governmentIdExtractedDob: extractedDob || null,
        governmentIdPersonaInquiryId: null,
        governmentIdPersonaStatus: null,
      });
      await refreshUserProfile?.(user.uid);

      const purchaseProfile = await getPurchaseProfile(user.uid);
      const docs = { ...(purchaseProfile?.verificationDocuments || {}), governmentId: url };
      await setPurchaseProfile(user.uid, {
        verificationDocuments: docs,
        governmentIdExtractedName: extractedName || null,
        governmentIdExtractedDob: extractedDob || null,
        governmentIdPersonaInquiryId: null,
        governmentIdPersonaStatus: null,
      });
    } catch (err) {
      console.error('Error uploading government ID:', err);
      setGovernmentIdError('Failed to upload government ID. Please try again.');
    } finally {
      setGovernmentIdUploading(false);
    }
  };

  const handleRemoveGovernmentId = async () => {
    if (!user?.uid) return;
    if (!window.confirm('Remove your government ID?')) return;
    try {
      await updateUserProfile(user.uid, {
        governmentIdUrl: null,
        governmentIdExtractedName: null,
        governmentIdExtractedDob: null,
        governmentIdPersonaInquiryId: null,
        governmentIdPersonaStatus: null,
      });
      await refreshUserProfile?.(user.uid);

      const purchaseProfile = await getPurchaseProfile(user.uid);
      const docs = { ...(purchaseProfile?.verificationDocuments || {}) };
      docs.governmentId = null;
      await setPurchaseProfile(user.uid, {
        verificationDocuments: docs,
        governmentIdExtractedName: null,
        governmentIdExtractedDob: null,
        governmentIdPersonaInquiryId: null,
        governmentIdPersonaStatus: null,
      });
    } catch (err) {
      console.error('Error removing government ID:', err);
      setGovernmentIdError('Failed to remove government ID. Please try again.');
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="profile-page">
        <div className="loading-state">Loading...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1>Profile</h1>
          <p>Manage how you appear to others and keep your account secure.</p>
          <div className="profile-stats">
            <span className="profile-stat"><strong>{followerCount}</strong> followers</span>
            <span className="profile-stat"><strong>{followingCount}</strong> following</span>
          </div>
          <div className="profile-header-actions">
            {!isEditingProfile && (
              <button type="button" className="btn btn-outline" onClick={() => setIsEditingProfile(true)}>
                Edit profile
              </button>
            )}
          </div>
        </div>

        <div className="profile-section">
          <h2>Personal info</h2>
          {error && <div className="profile-alert profile-alert--error">{error}</div>}
          {saved && <div className="profile-alert profile-alert--success">Profile updated</div>}
          {isEditingProfile ? (
            <>
              <div className="profile-grid">
                <label className="profile-field">
                  <span>Full name</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Your name"
                  />
                </label>
                <label className="profile-field">
                  <span>Date of birth</span>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm((prev) => ({ ...prev, dob: e.target.value }))}
                  />
                </label>
                <label className="profile-field">
                  <span>Phone</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </label>
                <label className="profile-field">
                  <span>Email</span>
                  <input type="email" value={displayEmail} disabled />
                </label>
              </div>
              <div className="profile-toggle">
                <div className="profile-toggle-row">
                  <span>Make my profile anonymous</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={form.anonymousProfile}
                      onChange={(e) => setForm((prev) => ({ ...prev, anonymousProfile: e.target.checked }))}
                      aria-label="Make my profile anonymous"
                    />
                    <span className="toggle-switch__track" aria-hidden />
                  </label>
                </div>
                <p>When enabled, other users will see your public display name instead of your real name.</p>
              </div>
              <label className="profile-field">
                <span>Public display name</span>
                <input
                  type="text"
                  value={form.publicUsername}
                  onChange={(e) => setForm((prev) => ({ ...prev, publicUsername: e.target.value }))}
                  placeholder="Shown to other users"
                />
              </label>
            </>
          ) : (
            <div className="profile-static-grid">
              <div className="profile-static-field">
                <span>Full name</span>
                <strong>{form.name || '—'}</strong>
              </div>
              <div className="profile-static-field">
                <span>Date of birth</span>
                <strong>{form.dob || '—'}</strong>
              </div>
              <div className="profile-static-field">
                <span>Phone</span>
                <strong>{form.phone || '—'}</strong>
              </div>
              <div className="profile-static-field">
                <span>Email</span>
                <strong>{displayEmail || '—'}</strong>
              </div>
              <div className="profile-static-field">
                <span>Anonymous profile</span>
                <strong>{form.anonymousProfile ? 'Yes' : 'No'}</strong>
              </div>
              <div className="profile-static-field">
                <span>Public display name</span>
                <strong>{form.publicUsername || '—'}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="profile-section buying-power-section" id="buying-power">
          <h2>Buying Power</h2>
          <p className="profile-footnote">Your verified buying power and the documents that support it. You can update these at any time.</p>
          <div className="buying-power-overall-badge">
            <span className={`buying-power-overall-pill ${overallBuyingPowerVerified ? 'verified' : 'unverified'}`}>
              Overall verification: {overallBuyingPowerVerified ? 'True' : 'False'}
            </span>
          </div>
          <div className="buying-power-card">
            <h3>Buying power</h3>
            {editingBuyingPower ? (
              <div className="buying-power-edit">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 500000"
                  value={buyingPowerForm}
                  onChange={(e) => setBuyingPowerForm(e.target.value)}
                  className="buying-power-input"
                />
              </div>
            ) : (
              <div className="buying-power-display">
                <div>
                  <span className="buying-power-amount">{formatCurrency(purchaseProfile?.buyingPower)}</span>
                  <div className="buying-power-validation">
                    <span className={`buying-power-validation-pill ${purchaseProfile?.buyingPowerValidationStatus || 'pending'}`}>
                      {purchaseProfile?.buyingPowerValidationStatus === 'validated'
                        ? 'Validated'
                        : purchaseProfile?.buyingPowerValidationStatus === 'not_approved'
                          ? 'Not approved'
                          : 'Pending'}
                    </span>
                    <span className="buying-power-validation-note">
                      {purchaseProfile?.buyingPowerValidationMessage || 'Upload a document to validate buying power.'}
                    </span>
                  </div>
                </div>
                <div className="buying-power-actions">
                  <button type="button" className="btn btn-outline btn-small" onClick={() => { setEditingBuyingPower(true); setBuyingPowerForm(purchaseProfile?.buyingPower != null ? String(purchaseProfile.buyingPower) : ''); }}>
                    Edit
                  </button>
                </div>
              </div>
            )}
            <div className="buying-power-docs">
              <h4>Supporting documents</h4>
              {!editingBuyingPower && (
                <p className="profile-footnote">Edit buying power to add or replace documents.</p>
              )}
              {[
                { key: 'proofOfFunds', label: 'Proof of Funds' },
                { key: 'preApprovalLetter', label: 'Pre-Approval Letter' },
                { key: 'bankLetter', label: 'Bank Letter' },
              ].map(({ key, label }) => {
                const url = purchaseProfile?.verificationDocuments?.[key];
                const amount = purchaseProfile?.verificationDocumentAmounts?.[key];
                const isUploading = uploadingDoc === key;
                return (
                  <div key={key} className="doc-row">
                    <div className="doc-row-label">
                      {label}
                      {amount != null && `: Amount - ${formatCurrency(amount)}`}
                    </div>
                    <div className="doc-row-actions">
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="doc-link">
                          View
                        </a>
                      )}
                      {editingBuyingPower && (
                        <>
                          <div className="doc-drag-drop-wrap">
                            <DragDropFileInput
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(f) => { if (f) handleReplaceDocument(key, f); }}
                              disabled={!!uploadingDoc}
                              uploading={isUploading}
                              placeholder={url ? 'Drop to replace' : 'Drop or click to add'}
                              className="profile-doc-upload"
                            />
                          </div>
                          {url && (
                            <button
                              type="button"
                              className="btn btn-outline btn-small doc-remove-btn"
                              onClick={() => handleRemoveDocument(key)}
                            >
                              Remove
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="buying-power-id-status">
              <span>Government ID</span>
              <span className={`buying-power-id-pill ${isGovernmentIdVerified ? 'is-verified' : 'is-unverified'}`}>
                {isGovernmentIdVerified ? 'Verified' : 'Not verified'}
              </span>
            </div>
            <div className="buying-power-funding">
              <div>
                <p className="profile-footnote">Funding account</p>
                <p className="buying-power-funding-name">
                  {userProfile?.bankName || form.bankName || 'Not linked yet'}
                </p>
              </div>
            </div>
            {editingBuyingPower && (
              <div className="buying-power-edit-actions">
                <button type="button" className="btn btn-primary" onClick={handleSaveBuyingPower}>
                  Save changes
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => { setEditingBuyingPower(false); setBuyingPowerForm(''); }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="profile-section">
          <h2>Funding account</h2>
          <p className="profile-footnote">Add your bank name now. Bank linking is coming soon.</p>
          {isEditingProfile ? (
            <>
              <div className="profile-grid">
                <label className="profile-field">
                  <span>Bank name</span>
                  <input
                    type="text"
                    value={form.bankName}
                    onChange={(e) => setForm((prev) => ({ ...prev, bankName: e.target.value }))}
                    placeholder="e.g. Chase, Bank of America"
                  />
                </label>
              </div>
              <div className="profile-actions profile-actions--funding">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowBankLinkModal(true)}
                >
                  Link bank account
                </button>
              </div>
            </>
          ) : (
            <div className="profile-static-grid">
              <div className="profile-static-field">
                <span>Bank name</span>
                <strong>{form.bankName || '—'}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="profile-section">
          <h2>Government ID</h2>
          <p className="profile-footnote">Verify your identity with Persona or upload a document manually.</p>
          {governmentIdError && <div className="profile-alert profile-alert--error">{governmentIdError}</div>}
          {personaError && <div className="profile-alert profile-alert--error">{personaError}</div>}
          <div className="profile-id-status">
            <span>Verification status</span>
            <span className={`profile-id-pill ${isGovernmentIdVerified ? 'is-verified' : ''}`}>
              {isGovernmentIdVerified ? 'Verified' : 'Not verified'}
            </span>
          </div>
          <div className="profile-id-row">
            <div className="profile-id-details">
              <div className="profile-id-field">
                <span>Persona status</span>
                <strong>{userProfile?.governmentIdPersonaStatus || '—'}</strong>
              </div>
              <div className="profile-id-field">
                <span>Extracted name</span>
                <strong>{userProfile?.governmentIdExtractedName || '—'}</strong>
              </div>
              <div className="profile-id-field">
                <span>Extracted date of birth</span>
                <strong>{userProfile?.governmentIdExtractedDob || '—'}</strong>
              </div>
              <div className="profile-id-field">
                <span>Document</span>
                {userProfile?.governmentIdUrl ? (
                  <a href={userProfile.governmentIdUrl} target="_blank" rel="noopener noreferrer" className="profile-id-link">
                    View uploaded ID
                  </a>
                ) : (
                  <strong>Not uploaded</strong>
                )}
              </div>
            </div>
            {isEditingProfile && (
              <div className="profile-id-upload">
                <button
                  type="button"
                  className="btn btn-primary profile-id-persona"
                  onClick={handlePersonaVerification}
                  disabled={personaLoading}
                >
                  {personaLoading ? 'Starting Persona...' : 'Verify with Persona'}
                </button>
                <div className="profile-id-divider">or upload manually</div>
                <DragDropFileInput
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(f) => { if (f) handleGovernmentIdUpload(f); }}
                  disabled={governmentIdUploading}
                  uploading={governmentIdUploading}
                  placeholder={userProfile?.governmentIdUrl ? 'Drop to replace' : 'Drop or click to upload'}
                  className="profile-id-dropzone"
                />
                {(userProfile?.governmentIdUrl || userProfile?.governmentIdPersonaInquiryId) && (
                  <button type="button" className="btn btn-outline profile-id-remove" onClick={handleRemoveGovernmentId}>
                    Remove ID
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="profile-section">
          <div className="profile-actions">
            {isEditingProfile && (
              <>
                <button type="button" className="btn btn-outline" onClick={() => { resetProfileForm(); setIsEditingProfile(false); }}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="profile-section">
          <h2>Change password</h2>
          {passwordError && <div className="profile-alert profile-alert--error">{passwordError}</div>}
          {passwordSaved && <div className="profile-alert profile-alert--success">Password updated</div>}
          <div className="profile-grid">
            <label className="profile-field">
              <span>New password</span>
              <input
                type="password"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="At least 6 characters"
              />
            </label>
            <label className="profile-field">
              <span>Confirm password</span>
              <input
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))}
                placeholder="Re-enter new password"
              />
            </label>
          </div>
          <div className="profile-actions">
            <button type="button" className="btn btn-primary" onClick={handleChangePassword} disabled={passwordSaving}>
              {passwordSaving ? 'Updating...' : 'Update password'}
            </button>
          </div>
          <p className="profile-footnote">
            If this fails, please sign out and sign back in before trying again.
          </p>
        </div>

        <div className="profile-section">
          <h2>Sign out</h2>
          <p className="profile-footnote">Sign out of your account on this device.</p>
          <div className="profile-actions">
            <button type="button" className="btn btn-outline" onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>

      {showBankLinkModal && (
        <div className="profile-modal-overlay" role="dialog" aria-modal="true">
          <div className="profile-modal">
            <h3>Bank linking</h3>
            <p>This is where bank linking feature will be included in future version.</p>
            <div className="profile-modal-actions">
              <button type="button" className="btn btn-primary" onClick={() => setShowBankLinkModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
