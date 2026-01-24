import { Link, useNavigate } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  const navigate = useNavigate();

  const handleBrowseClick = () => {
    navigate('/browse');
  };

  const handleListClick = () => {
    navigate('/list-property');
  };

  const handleLearnProcessClick = () => {
    navigate('/how-selling-works');
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Real Estate Transactions
              <span className="title-highlight"> Without the Middleman</span>
            </h1>
            <p className="hero-description">
              Connect directly with buyers and sellers. Save thousands in commission fees while 
              maintaining full control of your transaction. Our platform guides you through every step.
            </p>
            <div className="hero-cta">
              <button onClick={handleBrowseClick} className="btn btn-primary">
                Browse Properties
              </button>
              <button onClick={handleListClick} className="btn btn-secondary">
                List Your Property
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-value">$0</span>
                <span className="stat-label">Broker Fees</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat">
                <span className="stat-value">100%</span>
                <span className="stat-label">Direct</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat">
                <span className="stat-value">24/7</span>
                <span className="stat-label">Access</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Everything You Need to Succeed</h2>
            <p className="section-subtitle">
              A complete platform designed to make real estate transactions simple, secure, and cost-effective
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3>Zero Commission</h3>
              <p>Save thousands by eliminating traditional broker fees. Keep more of your money when buying or selling.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3>Direct Communication</h3>
              <p>Connect directly with buyers and sellers. No intermediaries, no delays, no miscommunication.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <h3>Guided Process</h3>
              <p>Step-by-step guidance through every phase of your transaction. We've got you covered from listing to closing.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h3>Secure & Verified</h3>
              <p>All parties are verified before transactions begin. Your documents and personal information are protected.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <h3>Educational Resources</h3>
              <p>Comprehensive guides and resources to help you understand every aspect of real estate transactions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <h3>Fast & Efficient</h3>
              <p>Streamlined process from listing to closing. Get deals done faster without unnecessary bureaucracy.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Simple, straightforward, and designed for success</p>
          </div>
          <div className="steps-wrapper">
            <div className="step-card">
              <div className="step-number">01</div>
              <div className="step-content">
                <h3>List or Browse</h3>
                <p>Sellers complete a simple checklist and list their property. Buyers browse our marketplace of verified listings.</p>
              </div>
            </div>
            <div className="step-card">
              <div className="step-number">02</div>
              <div className="step-content">
                <h3>Connect & Verify</h3>
                <p>Buyers verify their credentials and submit offers directly. Sellers review offers from verified buyers.</p>
              </div>
            </div>
            <div className="step-card">
              <div className="step-number">03</div>
              <div className="step-content">
                <h3>Complete Transaction</h3>
                <p>Our platform guides you through due diligence, inspections, negotiations, and closing—every step of the way.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learn About Our Process */}
      <section className="learn-process-section">
        <div className="container">
          <div className="learn-process-content">
            <h2 className="learn-process-title">Buying or selling a home is so simple, anyone can do it.</h2>
            <p className="learn-process-subtitle">
              No jargon, no guesswork, no pressure. We guide you step by step so you always know what’s happening, what to do, and what comes next.
            </p>
            <button onClick={handleLearnProcessClick} className="btn btn-primary btn-large learn-process-cta">
              Learn about our sales process
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Get Started?</h2>
            <p>Join the future of real estate transactions. No brokers, no hidden fees, just direct connections.</p>
            <div className="cta-buttons">
              <button onClick={handleBrowseClick} className="btn btn-primary btn-large">
                Browse Properties
              </button>
              <button onClick={handleListClick} className="btn btn-outline btn-large">
                List Your Property
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
