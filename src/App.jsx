import { useCallback, useEffect, useState } from 'react';
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
import PillarShare from './pages/PillarShare';
import PillarHub from './pages/PillarHub';
import PillarTransaction from './pages/PillarTransaction';
import BeginSale from './pages/BeginSale';
import CreateSearch from './pages/CreateSearch';
import EditProperty from './pages/EditProperty';
import GetVerified from './pages/GetVerified';
import Profile from './pages/Profile';
import VerifyBuyer from './pages/VerifyBuyer';
import TransactionManager from './pages/TransactionManager';
import Messages from './pages/Messages';
import PreListingChecklist from './pages/PreListingChecklist';
import UserProfile from './pages/UserProfile';
import { getMessagesForUser } from './services/messageService';
import './App.css';

function AppContent() {
  const { user, userProfile, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadLoading, setUnreadLoading] = useState(false);

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

  return (
    <Router>
      <div className="App">
        <nav className="app-nav">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              <picture>
                <source
                  srcSet={`${import.meta.env.BASE_URL}brand/opento-logo.webp`}
                  type="image/webp"
                />
                <img
                  className="nav-logo-img"
                  src={`${import.meta.env.BASE_URL}brand/opento-logo.png`}
                  alt="OpenTo"
                />
              </picture>
            </Link>
            <div className="nav-links">
              <Link to="/browse">Browse Properties</Link>
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard">Dashboard</Link>
                  <Link to="/messages" className="nav-messages" aria-label="Message center">
                    <span className="nav-messages-icon" aria-hidden>💬</span>
                    <span className="nav-messages-label">Notification Center</span>
                    {unreadCount > 0 && (
                      <span className="nav-messages-badge" aria-label={`${unreadCount} unread messages`}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link to="/profile" className="nav-profile">
                    <span className="nav-profile-avatar">
                      {(userProfile?.name || user?.displayName || 'U').charAt(0).toUpperCase()}
                    </span>
                    <span className="nav-profile-text">
                      {userProfile?.name || user?.displayName || 'Profile'}
                    </span>
                  </Link>
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
            <Route path="/user/:userId" element={<UserProfile />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/submit-offer/:propertyId" element={<SubmitOffer />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/how-selling-works" element={<HowSellingWorks />} />
            <Route path="/how-buying-works" element={<HowBuyingWorks />} />
            <Route path="/pillar-share" element={<PillarShare />} />
            <Route path="/pillar-hub" element={<PillarHub />} />
            <Route path="/pillar-transaction" element={<PillarTransaction />} />
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
