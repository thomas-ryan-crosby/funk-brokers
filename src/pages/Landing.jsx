import { Link } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-content">
          <h1 className="hero-title">Buy and Sell Real Estate Without Brokers</h1>
          <p className="hero-subtitle">
            Connect directly with buyers and sellers. Save thousands in commission fees.
            Complete your transaction with confidence and transparency.
          </p>
          <div className="hero-actions">
            <Link to="/#/browse" className="btn btn-primary btn-large">
              Browse Properties
            </Link>
            <Link to="/#/list-property" className="btn btn-secondary btn-large">
              List Your Property
            </Link>
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-placeholder">
            <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="300" fill="#e8f4f8"/>
              <path d="M100 150 L200 100 L300 150 L300 250 L100 250 Z" fill="#4a90e2" opacity="0.3"/>
              <rect x="120" y="180" width="60" height="70" fill="#4a90e2" opacity="0.5"/>
              <rect x="220" y="180" width="60" height="70" fill="#4a90e2" opacity="0.5"/>
            </svg>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="landing-benefits">
        <div className="container">
          <h2 className="section-title">Why Choose Funk Brokers?</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">💰</div>
              <h3>Save on Commission</h3>
              <p>
                Eliminate traditional broker fees. Keep more of your money when buying or selling.
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🤝</div>
              <h3>Direct Communication</h3>
              <p>
                Connect directly with buyers and sellers. No middleman, no delays, no confusion.
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">📋</div>
              <h3>Guided Process</h3>
              <p>
                Step-by-step guidance through every phase of your transaction. We've got you covered.
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🔒</div>
              <h3>Secure & Verified</h3>
              <p>
                All parties are verified before transactions. Your documents and data are secure.
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">📚</div>
              <h3>Educational Resources</h3>
              <p>
                Learn everything you need to know about real estate transactions. Knowledge is power.
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">⚡</div>
              <h3>Fast & Efficient</h3>
              <p>
                Streamlined process from listing to closing. Get deals done faster without the bureaucracy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="landing-how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <h3>For Sellers</h3>
              <p>Complete our pre-listing checklist, upload your property details, and list your home directly to the marketplace.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-item">
              <div className="step-number">2</div>
              <h3>For Buyers</h3>
              <p>Browse properties, complete buyer verification, and submit offers directly to sellers. No broker needed.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-item">
              <div className="step-number">3</div>
              <h3>Transaction</h3>
              <p>Our platform guides you through every step: offers, due diligence, inspections, and closing.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta">
        <div className="container">
          <h2>Ready to Get Started?</h2>
          <p>Join thousands of buyers and sellers who are taking control of their real estate transactions.</p>
          <div className="cta-actions">
            <Link to="/#/browse" className="btn btn-primary btn-large">
              Browse Properties
            </Link>
            <Link to="/#/list-property" className="btn btn-outline btn-large">
              List Your Property
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="landing-stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">$0</div>
              <div className="stat-label">Broker Fees</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">100%</div>
              <div className="stat-label">Direct Communication</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Platform Access</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">9</div>
              <div className="stat-label">Step Process Guide</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
