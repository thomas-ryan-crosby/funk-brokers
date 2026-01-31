import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HowItWorks.css';

const HowItWorks = () => {
  const navigate = useNavigate();
  const [showTransactionSteps, setShowTransactionSteps] = useState(false);
  const transactionRef = useRef(null);

  const pillars = useMemo(
    () => [
      {
        title: 'A space to share or browse — on your terms.',
        body: 'Explore the market freely, privately, and confidently — without realtor fees.',
      },
      {
        title: 'A Centralized Home Hub',
        body: 'One place for your home’s key documents, vendors, and history — organized and private.',
      },
      {
        title: 'You Control the Transaction',
        body: 'If you decide to buy or sell, you control the entire process. We guarantee it’s a lot easier than you think.',
        isTransaction: true,
      },
    ],
    []
  );

  const handleTransactionClick = () => {
    setShowTransactionSteps(true);
    requestAnimationFrame(() => {
      transactionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleTransactionKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTransactionClick();
    }
  };

  return (
    <div className="how-it-works-page">
      <div className="hiw-container">
        <header className="hiw-header">
          <h1>How It Works</h1>
          <p className="hiw-tagline">
            Start with the three core pillars. When you’re ready, tap the transaction pillar to see buying and selling steps.
          </p>
        </header>

        <div className="hiw-pillars">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className={`hiw-pillar${pillar.isTransaction ? ' hiw-pillar--link' : ''}`}
              onClick={pillar.isTransaction ? handleTransactionClick : undefined}
              onKeyDown={pillar.isTransaction ? handleTransactionKeyDown : undefined}
              role={pillar.isTransaction ? 'button' : undefined}
              tabIndex={pillar.isTransaction ? 0 : undefined}
            >
              <h2>{pillar.title}</h2>
              <p>{pillar.body}</p>
              {pillar.isTransaction && <span className="hiw-pillar-link">See buy/sell steps →</span>}
            </div>
          ))}
        </div>

        <div ref={transactionRef} className="hiw-transaction">
          {showTransactionSteps && (
            <>
              <h2>Choose your path</h2>
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
            </>
          )}
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
