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
import { logout } from './services/authService';
import './App.css';

function AppContent() {
  const { user, isAuthenticated } = useAuth();

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
              <h1>Funk Brokers</h1>
            </Link>
            <div className="nav-links">
              <Link to="/browse">Browse Properties</Link>
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard">Dashboard</Link>
                  <span className="nav-user">Hi, {user?.displayName || 'User'}</span>
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
