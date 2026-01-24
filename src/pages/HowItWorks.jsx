import { useNavigate } from 'react-router-dom';
import './HowItWorks.css';

const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <div className="how-it-works-page">
      <div className="hiw-container">
        <header className="hiw-header">
          <h1>How It Works</h1>
          <p className="hiw-tagline">
            Buying or selling a home is so simple, anyone can do it. Choose your path to see the full step-by-step process.
          </p>
        </header>

        <div className="hiw-cards">
          <button onClick={() => navigate('/how-selling-works')} className="hiw-card">
            <div className="hiw-card-icon hiw-card-icon-sell">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h2>How Selling Your Home Works</h2>
            <p>From confirming ownership to closing — we guide you through every step with plain language and no pressure.</p>
            <span className="hiw-card-link">See the selling process →</span>
          </button>

          <button onClick={() => navigate('/how-buying-works')} className="hiw-card">
            <div className="hiw-card-icon hiw-card-icon-buy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h2>How Buying a Home Works</h2>
            <p>From getting ready to buy to closing — clear steps, no jargon, and support only when you need it.</p>
            <span className="hiw-card-link">See the buying process →</span>
          </button>
        </div>

        <div className="hiw-back">
          <button onClick={() => navigate('/')} className="hiw-back-btn">
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
