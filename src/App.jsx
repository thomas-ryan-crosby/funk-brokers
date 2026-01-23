import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Landing from './pages/Landing';
import Home from './pages/Home';
import ListProperty from './pages/ListProperty';
import PropertyDetail from './pages/PropertyDetail';
import SubmitOffer from './pages/SubmitOffer';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
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
    <Router>
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
                  <Link to="/list-property">List Property</Link>
                  <span className="nav-user">Hi, {user?.displayName || 'User'}</span>
                  <button onClick={handleLogout} className="nav-logout">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/list-property">List Property</Link>
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
            <Route path="/list-property" element={<ListProperty />} />
            <Route path="/property/:id" element={<PropertyDetail />} />
            <Route path="/submit-offer/:propertyId" element={<SubmitOffer />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/sign-in" element={<SignIn />} />
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
