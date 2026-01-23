import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import ListProperty from './pages/ListProperty';
import PropertyDetail from './pages/PropertyDetail';
import SubmitOffer from './pages/SubmitOffer';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="app-nav">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              <h1>Funk Brokers</h1>
            </Link>
            <div className="nav-links">
              <Link to="/">Browse Properties</Link>
              <Link to="/list-property">List Property</Link>
            </div>
          </div>
        </nav>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/list-property" element={<ListProperty />} />
            <Route path="/property/:id" element={<PropertyDetail />} />
            <Route path="/submit-offer/:propertyId" element={<SubmitOffer />} />
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

export default App;
