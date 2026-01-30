import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile, getUserProfile, updateUserPassword, logout } from '../services/authService';
import './Profile.css';

const Profile = () => {
  const { user, userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    publicUsername: '',
    anonymousProfile: false,
  });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
      const anonymousProfile = !!form.anonymousProfile;
      const publicUsername = anonymousProfile
        ? ((form.publicUsername || '').trim() || 'Anonymous')
        : ((form.publicUsername || '').trim() || null);
      await updateUserProfile(user.uid, {
        name: name || null,
        phone: phone || null,
        publicUsername,
        anonymousProfile,
      });
      await getUserProfile(user.uid).catch(() => null);
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
            <label>
              <input
                type="checkbox"
                checked={form.anonymousProfile}
                onChange={(e) => setForm((prev) => ({ ...prev, anonymousProfile: e.target.checked }))}
              />
              Keep my profile anonymous
            </label>
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
          <div className="profile-actions">
            <button type="button" className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
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
    </div>
  );
};

export default Profile;
