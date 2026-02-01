import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile, updateUserPassword, logout } from '../services/authService';
import { getPurchaseProfile, setPurchaseProfile } from '../services/profileService';
import { uploadFile } from '../services/storageService';
import DragDropFileInput from '../components/DragDropFileInput';
import { extractGovernmentIdInfo } from '../utils/idExtraction';
import './Profile.css';

const Profile = () => {
  const { user, userProfile, isAuthenticated, loading: authLoading, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: '',
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
  const [editingFunding, setEditingFunding] = useState(false);
  const [fundingForm, setFundingForm] = useState('');
  const [governmentIdUploading, setGovernmentIdUploading] = useState(false);
  const [governmentIdError, setGovernmentIdError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/sign-in?redirect=/profile');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!user?.uid) return;
    setForm({
      name: userProfile?.name || user?.displayName || '',
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
      const bankName = form.bankName.trim();
      const anonymousProfile = !!form.anonymousProfile;
      const publicUsername = anonymousProfile
        ? ((form.publicUsername || '').trim() || 'Anonymous')
        : ((form.publicUsername || '').trim() || null);
      await updateUserProfile(user.uid, {
        name: name || null,
        phone: phone || null,
        bankName: bankName || null,
        publicUsername,
        anonymousProfile,
      });
      await refreshUserProfile?.(user.uid);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
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
      const { extractedName, extractedDob } = await extractGovernmentIdInfo(file);
      const ext = file.name.split('.').pop();
      const path = `government-ids/${user.uid}/${Date.now()}.${ext}`;
      const url = await uploadFile(file, path);

      await updateUserProfile(user.uid, {
        governmentIdUrl: url,
        governmentIdExtractedName: extractedName || null,
        governmentIdExtractedDob: extractedDob || null,
      });
      await refreshUserProfile?.(user.uid);

      const purchaseProfile = await getPurchaseProfile(user.uid);
      const docs = { ...(purchaseProfile?.verificationDocuments || {}), governmentId: url };
      await setPurchaseProfile(user.uid, {
        verificationDocuments: docs,
        governmentIdExtractedName: extractedName || null,
        governmentIdExtractedDob: extractedDob || null,
      });
    } catch (err) {
      console.error('Error uploading government ID:', err);
      setGovernmentIdError('Failed to upload government ID. Please try again.');
    } finally {
      setGovernmentIdUploading(false);
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
        </div>

        <div className="profile-section">
          <h2>Personal info</h2>
          {error && <div className="profile-alert profile-alert--error">{error}</div>}
          {saved && <div className="profile-alert profile-alert--success">Profile updated</div>}
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
        </div>

        <div className="profile-section">
          <h2>Funding account</h2>
          <p className="profile-footnote">Add your bank name now. Bank linking is coming soon.</p>
          {editingFunding ? (
            <>
              <div className="profile-grid">
                <label className="profile-field">
                  <span>Bank name</span>
                  <input
                    type="text"
                    value={fundingForm}
                    onChange={(e) => setFundingForm(e.target.value)}
                    placeholder="e.g. Chase, Bank of America"
                  />
                </label>
              </div>
              <div className="profile-actions profile-actions--funding">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    if (!user?.uid) return;
                    setSaving(true);
                    try {
                      const bankName = fundingForm.trim() || null;
                      await updateUserProfile(user.uid, { bankName });
                      await refreshUserProfile?.(user.uid);
                      setForm((prev) => ({ ...prev, bankName: bankName || '' }));
                      setEditingFunding(false);
                      setFundingForm('');
                    } catch (err) {
                      console.error('Error updating funding account:', err);
                      setError('Failed to update funding account. Please try again.');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save funding account'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setEditingFunding(false);
                    setFundingForm('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="profile-funding-row">
                <div>
                  <p className="profile-funding-label">Bank name</p>
                  <p className="profile-funding-value">{form.bankName || 'Not linked yet'}</p>
                </div>
                <div className="profile-funding-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setEditingFunding(true);
                      setFundingForm(form.bankName);
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => setShowBankLinkModal(true)}>
                    Link bank account
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="profile-section">
          <h2>Government ID</h2>
          <p className="profile-footnote">Upload a government ID to verify your identity.</p>
          {governmentIdError && <div className="profile-alert profile-alert--error">{governmentIdError}</div>}
          <div className="profile-id-row">
            <div className="profile-id-details">
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
            <div className="profile-id-upload">
              <DragDropFileInput
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(f) => { if (f) handleGovernmentIdUpload(f); }}
                disabled={governmentIdUploading}
                uploading={governmentIdUploading}
                placeholder={userProfile?.governmentIdUrl ? 'Drop to replace' : 'Drop or click to upload'}
                className="profile-id-dropzone"
              />
            </div>
          </div>
        </div>

        <div className="profile-section">
          <div className="profile-actions">
            <button type="button" className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save profile changes'}
            </button>
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
