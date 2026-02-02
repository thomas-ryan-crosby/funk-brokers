import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../services/authService';
import { getPurchaseProfile, getSavedSearches, setPurchaseProfile as setPurchaseProfileApi, updatePurchaseProfile } from '../services/profileService';
import { getPropertiesBySeller } from '../services/propertyService';
import { uploadFile } from '../services/storageService';
import { deleteField } from 'firebase/firestore';
import { meetsVerifiedBuyerCriteria } from '../utils/verificationScores';
import DragDropFileInput from '../components/DragDropFileInput';
import { extractPdfAmount } from '../utils/pdfAmount';
import './UserProfile.css';

const formatDate = (value) => {
  if (!value) return '—';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatCurrency = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

const getDisplayName = (profile) => {
  if (!profile) return 'User';
  if (profile.anonymousProfile) return profile.publicUsername || 'Anonymous';
  return profile.publicUsername || profile.name || 'User';
};

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [purchaseProfile, setPurchaseProfile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [error, setError] = useState('');
  const [editingBuyingPower, setEditingBuyingPower] = useState(false);
  const [buyingPowerForm, setBuyingPowerForm] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(null);

  const isOwnProfile = user?.uid != null && userId === user.uid;

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        setError('');
        const [userProfile, buyerProfile, sellerProperties, searches] = await Promise.all([
          getUserProfile(userId),
          getPurchaseProfile(userId),
          getPropertiesBySeller(userId),
          getSavedSearches(userId),
        ]);
        setProfile(userProfile);
        setPurchaseProfile(buyerProfile);
        setProperties(sellerProperties || []);
        setSavedSearches(searches || []);
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Unable to load profile details right now.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const activity = useMemo(() => {
    const entries = [];
    if (purchaseProfile?.buyerVerifiedAt) {
      entries.push({
        label: 'Verified buyer profile',
        date: purchaseProfile.buyerVerifiedAt,
      });
    }
    if (purchaseProfile?.updatedAt) {
      entries.push({
        label: 'Updated buying profile',
        date: purchaseProfile.updatedAt,
      });
    }
    properties.forEach((p) => {
      entries.push({
        label: `Added property: ${p.address || 'Property'}`,
        date: p.createdAt,
      });
    });
    savedSearches.forEach((s) => {
      entries.push({
        label: `Saved search: ${s.name || 'Search'}`,
        date: s.createdAt,
      });
    });
    return entries
      .map((e) => ({
        ...e,
        sortDate: e.date?.toDate ? e.date.toDate() : new Date(e.date || 0),
      }))
      .filter((e) => !Number.isNaN(e.sortDate.getTime()))
      .sort((a, b) => b.sortDate - a.sortDate)
      .slice(0, 6);
  }, [properties, savedSearches, purchaseProfile]);

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

  const handleSaveBuyingPower = async () => {
    const parsed = buyingPowerForm.trim() === '' ? null : parseFloat(buyingPowerForm.replace(/,/g, ''));
    if (buyingPowerForm.trim() !== '' && !Number.isFinite(parsed)) {
      alert('Please enter a valid number for buying power.');
      return;
    }
    try {
      const validation = computeBuyingPowerValidation(parsed ?? null, purchaseProfile?.verificationDocumentAmounts || {});
      await setPurchaseProfileApi(userId, {
        buyingPower: parsed ?? null,
        buyingPowerValidationStatus: validation.status,
        buyingPowerValidationMessage: validation.message,
      });
      setPurchaseProfile((p) => (p ? {
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
      await setPurchaseProfileApi(userId, updates);
      setPurchaseProfile((p) => (p ? {
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
      updates.buyerVerifiedAt = deleteField();
    }
    try {
      await updatePurchaseProfile(userId, updates);
      setPurchaseProfile((p) => {
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
      await setPurchaseProfileApi(userId, { buyingPower: null });
      setPurchaseProfile((p) => (p ? { ...p, buyingPower: null } : null));
      setEditingBuyingPower(false);
      setBuyingPowerForm('');
    } catch (err) {
      console.error(err);
      alert('Failed to remove. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="user-profile-page">
        <div className="user-profile-container">
          <p className="user-profile-loading">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-profile-page">
        <div className="user-profile-container">
          <p className="user-profile-error">{error}</p>
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  const displayName = getDisplayName(profile);

  const isIdVerified = (() => {
    const personaStatus = (profile?.governmentIdPersonaStatus || '').toLowerCase();
    if (personaStatus) {
      return ['completed', 'approved'].includes(personaStatus);
    }
    const normalizeName = (v) => (v || '').toLowerCase().replace(/[^a-z]/g, '');
    const normalizeDate = (v) => {
      if (!v) return null;
      const isoMatch = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) return isoMatch[0];
      const altMatch = String(v).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (!altMatch) return null;
      const month = altMatch[1].padStart(2, '0');
      const day = altMatch[2].padStart(2, '0');
      return `${altMatch[3]}-${month}-${day}`;
    };
    const extractedName = normalizeName(profile?.governmentIdExtractedName);
    const profileName = normalizeName(profile?.name);
    const extractedDob = normalizeDate(profile?.governmentIdExtractedDob);
    const profileDob = normalizeDate(profile?.dob);
    if (!extractedName || !extractedDob || !profileName || !profileDob) return false;
    return extractedName === profileName && extractedDob === profileDob;
  })();

  return (
    <div className="user-profile-page">
      <div className="user-profile-container">
        <header className="user-profile-header">
          <div className="user-profile-avatar">{displayName.charAt(0).toUpperCase()}</div>
          <div>
            <h1>{displayName}</h1>
            <div className="user-profile-header-meta">
              <p className="user-profile-subtitle">Public profile overview</p>
              <span
                className={`user-profile-verified-badge ${isIdVerified ? 'user-profile-verified-badge--verified' : 'user-profile-verified-badge--not-verified'}`}
                aria-label={isIdVerified ? 'ID verified' : 'ID not verified'}
              >
                {isIdVerified ? 'Verified user' : 'Not verified user'}
              </span>
            </div>
          </div>
        </header>

        {isOwnProfile && (
          <section className="user-profile-section buying-power-section">
            <div className="section-header">
              <h2>Buying Power</h2>
              <p className="form-hint">Your verified buying power and the documents that support it. You can update these at any time.</p>
            </div>
            <div className="buying-power-overall-badge">
              <span className={`buying-power-overall-pill ${(isIdVerified && purchaseProfile?.buyingPowerValidationStatus === 'validated') ? 'verified' : 'unverified'}`}>
                Overall verification: {(isIdVerified && purchaseProfile?.buyingPowerValidationStatus === 'validated') ? 'True' : 'False'}
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
                  <p className="form-hint">Edit buying power to add or replace documents.</p>
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
                                className="dashboard-doc-upload"
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
                <span className={`buying-power-id-pill ${isIdVerified ? 'is-verified' : 'is-unverified'}`}>
                  {isIdVerified ? 'Verified' : 'Not verified'}
                </span>
              </div>
              <div className="buying-power-funding">
                <div>
                  <p className="form-hint">Funding account</p>
                  <p className="buying-power-funding-name">
                    {profile?.bankName || 'Not linked yet'}
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
          </section>
        )}

        <div className="user-profile-grid">
          {!isOwnProfile && (
            <section className="user-profile-card">
              <h2>Buying power</h2>
              <p className="user-profile-value">{formatCurrency(purchaseProfile?.buyingPower)}</p>
              <p className="user-profile-hint">
                {purchaseProfile?.buyerVerified
                  ? 'Verified buyer profile'
                  : 'Buying power not verified yet.'}
              </p>
            </section>
          )}

          <section className="user-profile-card">
            <h2>Recent activity</h2>
            {activity.length === 0 ? (
              <p className="user-profile-hint">No recent activity shared yet.</p>
            ) : (
              <ul className="user-profile-activity">
                {activity.map((entry, idx) => (
                  <li key={`${entry.label}-${idx}`}>
                    <span>{entry.label}</span>
                    <span className="user-profile-date">{formatDate(entry.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="user-profile-section">
          <h2>Listed properties</h2>
          {properties.length === 0 ? (
            <p className="user-profile-hint">No properties shared yet.</p>
          ) : (
            <div className="user-profile-list">
              {properties.slice(0, 6).map((p) => (
                <div key={p.id} className="user-profile-list-item">
                  <div>
                    <div className="user-profile-list-title">{p.address || 'Property'}</div>
                    <div className="user-profile-list-meta">
                      Added {formatDate(p.createdAt)} · {p.availableForSale !== false ? 'Listed' : 'Off Market'}
                    </div>
                  </div>
                  <button type="button" className="btn btn-outline btn-small" onClick={() => navigate(`/property/${p.id}`)}>
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="user-profile-footer">
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
