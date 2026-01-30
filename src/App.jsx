import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Landing from './pages/Landing';
import Home from './pages/Home';
import ListProperty from './pages/ListProperty';
import PropertyDetail from './pages/PropertyDetail';
import SubmitOffer from './pages/SubmitOffer';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import Dashboard from './pages/Dashboard';
import HowSellingWorks from './pages/HowSellingWorks';
import HowBuyingWorks from './pages/HowBuyingWorks';
import HowItWorks from './pages/HowItWorks';
import BeginSale from './pages/BeginSale';
import CreateSearch from './pages/CreateSearch';
import EditProperty from './pages/EditProperty';
import GetVerified from './pages/GetVerified';
import VerifyBuyer from './pages/VerifyBuyer';
import TransactionManager from './pages/TransactionManager';
import Messages from './pages/Messages';
import PreListingChecklist from './pages/PreListingChecklist';
import { logout, updateUserProfile, getUserProfile } from './services/authService';
import { getMessagesForUser } from './services/messageService';
import './App.css';

function AppContent() {
  const { user, userProfile, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadLoading, setUnreadLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSnapshot, setProfileSnapshot] = useState(null);

  const buildThreadKey = (otherUserId, propertyId) => `${otherUserId}_${propertyId || 'none'}`;
  const getMessageDate = (m) => (m?.createdAt?.toDate ? m.createdAt.toDate() : new Date(m?.createdAt || 0));

  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user?.uid || unreadLoading) return;
    setUnreadLoading(true);
    try {
      const list = await getMessagesForUser(user.uid);
      const map = JSON.parse(localStorage.getItem('messageLastReadByThread') || '{}');
      let count = 0;
      for (const m of list) {
        if (m.recipientId !== user.uid) continue;
        const key = buildThreadKey(m.senderId, m.propertyId);
        const lastReadRaw = map[key];
        const lastRead = lastReadRaw ? new Date(lastReadRaw) : null;
        const msgDate = getMessageDate(m);
        if (!lastRead || msgDate > lastRead) count += 1;
      }
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread messages:', error);
    } finally {
      setUnreadLoading(false);
    }
  }, [isAuthenticated, user?.uid, unreadLoading]);

  useEffect(() => {
    if (!user?.uid) {
      setProfileSnapshot(null);
      setProfileForm({ name: '', phone: '' });
      return;
    }
    const name = userProfile?.name || user?.displayName || '';
    const phone = userProfile?.phone || '';
    setProfileSnapshot({
      name,
      phone,
      email: userProfile?.email || user?.email || '',
    });
    setProfileForm({ name, phone });
  }, [user?.uid, user?.displayName, user?.email, userProfile]);

  const profileDisplayName = useMemo(() => {
    return profileSnapshot?.name || user?.displayName || 'Profile';
  }, [profileSnapshot?.name, user?.displayName]);

  const handleProfileSave = async () => {
    if (!user?.uid || profileSaving) return;
    const name = profileForm.name.trim();
    const phone = profileForm.phone.trim();
    setProfileError('');
    setProfileSaved(false);
    setProfileSaving(true);
    try {
      await updateUserProfile(user.uid, { name: name || null, phone: phone || null });
      const updated = await getUserProfile(user.uid).catch(() => null);
      if (updated) {
        setProfileSnapshot({
          name: updated.name || name,
          phone: updated.phone || phone,
          email: updated.email || user?.email || '',
        });
      } else {
        setProfileSnapshot((prev) => (prev ? { ...prev, name, phone } : { name, phone, email: user?.email || '' }));
      }
      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 2500);
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileError('Failed to update profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      setUnreadCount(0);
      return;
    }
    loadUnreadCount();
  }, [isAuthenticated, user?.uid, loadUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated || !user?.uid) return;
    const handler = () => loadUnreadCount();
    window.addEventListener('messages:read', handler);
    window.addEventListener('storage', handler);
    const intervalId = setInterval(loadUnreadCount, 30_000);
    return () => {
      window.removeEventListener('messages:read', handler);
      window.removeEventListener('storage', handler);
      clearInterval(intervalId);
    };
  }, [isAuthenticated, user?.uid, loadUnreadCount]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <Router basename="/funk-brokers">
      <div className="App">
        <nav className="app-nav">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              <img
                className="nav-logo-img"
                src={`${import.meta.env.BASE_URL}brand/opento-logo.png`}
                alt="OpenTo"
              />
              <span className="nav-logo-text">OpenTo</span>
            </Link>
            <div className="nav-links">
              <Link to="/browse">Browse Properties</Link>
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard">Dashboard</Link>
                  <Link to="/messages" className="nav-messages" aria-label="Message center">
                    <span className="nav-messages-icon" aria-hidden>💬</span>
                    <span className="nav-messages-label">Messages</span>
                    {unreadCount > 0 && (
                      <span className="nav-messages-badge" aria-label={`${unreadCount} unread messages`}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  <button
                    type="button"
                    className="nav-profile"
                    onClick={() => setProfileOpen(true)}
                  >
                    <span className="nav-profile-avatar">
                      {(profileDisplayName || 'U').charAt(0).toUpperCase()}
                    </span>
                    <span className="nav-profile-text">
                      {profileDisplayName}
                    </span>
                  </button>
                  <button onClick={handleLogout} className="nav-logout">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/sign-in" className="nav-signin">Sign In</Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/browse" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/list-property" element={<ListProperty />} />
            <Route path="/property/:id" element={<PropertyDetail />} />
            <Route path="/property/:id/edit" element={<EditProperty />} />
            <Route path="/property/:id/get-verified" element={<GetVerified />} />
            <Route path="/verify-buyer" element={<VerifyBuyer />} />
            <Route path="/transaction/:id" element={<TransactionManager />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/submit-offer/:propertyId" element={<SubmitOffer />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/how-selling-works" element={<HowSellingWorks />} />
            <Route path="/how-buying-works" element={<HowBuyingWorks />} />
            <Route path="/begin-sale" element={<BeginSale />} />
            <Route path="/pre-listing-checklist" element={<PreListingChecklist />} />
            <Route path="/create-search" element={<CreateSearch />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <div className="footer-container">
            <p>&copy; 2024 Funk Brokers. All rights reserved.</p>
          </div>
        </footer>
        {profileOpen && (
          <div className="modal-overlay" onClick={() => setProfileOpen(false)}>
            <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Profile</h2>
                <button type="button" className="modal-close" onClick={() => setProfileOpen(false)}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                {profileError && <div className="profile-error">{profileError}</div>}
                {profileSaved && <div className="profile-saved">Profile updated</div>}
                <div className="form-group">
                  <label>Full name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Your name"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={profileSnapshot?.email || user?.email || ''}
                    disabled
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setProfileOpen(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleProfileSave}
                  disabled={profileSaving}
                >
                  {profileSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
