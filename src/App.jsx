import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Landing from './pages/Landing';
import Logo from './components/Logo';
import Home from './pages/Home';
import ListProperty from './pages/ListProperty';
import PropertyDetail from './pages/PropertyDetail';
import SubmitOffer from './pages/SubmitOffer';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import Dashboard from './pages/Dashboard';
import Feed from './pages/Feed';
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
import Pitch from './pages/Pitch';
import Feedback from './pages/Feedback';
import { getMessagesForUser } from './services/messageService';
import metrics from './utils/metrics';
import './App.css';

function AppContent() {
  const { user, userProfile, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadLoading, setUnreadLoading] = useState(false);
  const unreadInFlightRef = useRef(false);

  const buildThreadKey = (otherUserId, propertyId) => `${otherUserId}_${propertyId || 'none'}`;
  const getMessageDate = (m) => (m?.createdAt?.toDate ? m.createdAt.toDate() : new Date(m?.createdAt || 0));

  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user?.uid || unreadInFlightRef.current) return;
    unreadInFlightRef.current = true;
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
      unreadInFlightRef.current = false;
      setUnreadLoading(false);
    }
  }, [isAuthenticated, user?.uid]);

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
    const intervalId = setInterval(loadUnreadCount, 300_000); // 5 min – was 30s; reduced to cut Firestore read volume
    return () => {
      window.removeEventListener('messages:read', handler);
      window.removeEventListener('storage', handler);
      clearInterval(intervalId);
    };
  }, [isAuthenticated, user?.uid, loadUnreadCount]);

  useEffect(() => {
    if (typeof import.meta.env.DEV === 'boolean' && !import.meta.env.DEV) return;
    const intervalId = setInterval(() => {
      const s = metrics.getSummary();
      console.info('[metrics 60s] Reads by feature:', s.readsByFeature);
    }, 60_000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Router>
      <div className="App">
        <nav className="app-nav">
          <div className="nav-container">
            <Link to="/" className="nav-logo" aria-label="OpenTo home">
              <Logo variant="wordSymbol" alt="OpenTo" />
            </Link>
            <div className="nav-links">
              <Link to="/browse">Browse Properties</Link>
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard">Dashboard</Link>
                  <Link to="/feed">Feed</Link>
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
                  <Link to="/feedback" className="nav-feedback" aria-label="Send feedback">
                    <span className="nav-feedback-icon" aria-hidden>💬</span>
                    <span className="nav-feedback-label">Feedback</span>
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
            <Route path="/feed" element={<Feed />} />
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
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/pitch" element={<Pitch />} />
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
