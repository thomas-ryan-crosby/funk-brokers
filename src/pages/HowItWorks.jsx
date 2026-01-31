import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './HowItWorks.css';

const HowItWorks = () => {
  const navigate = useNavigate();

  const pillars = useMemo(
    () => [
      {
        title: 'A space to share or browse — on your terms.',
        body: 'Explore the market freely, privately, and confidently — without realtor fees.',
        path: '/pillar-share',
      },
      {
        title: 'A Centralized Home Hub',
        body: 'One place for your home’s key documents, vendors, and history — organized and private.',
        path: '/pillar-hub',
      },
      {
        title: 'You Control the Transaction',
        body: 'If you decide to buy or sell, you control the entire process. We guarantee it’s a lot easier than you think.',
        path: '/pillar-transaction',
      },
    ],
    []
  );

  const handlePillarKeyDown = (event, path) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate(path);
    }
  };

  return (
    <div className="how-it-works-page">
      <div className="hiw-container">
        <header className="hiw-header">
          <h1>How It Works</h1>
          <p className="hiw-tagline">
            Start with the three core pillars. Click any pillar to see the full feature overview.
          </p>
        </header>

        <div className="hiw-pillars">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="hiw-pillar hiw-pillar--link"
              onClick={() => navigate(pillar.path)}
              onKeyDown={(event) => handlePillarKeyDown(event, pillar.path)}
              role="button"
              tabIndex={0}
            >
              <h2>{pillar.title}</h2>
              <p>{pillar.body}</p>
              <span className="hiw-pillar-link">See full overview →</span>
            </div>
          ))}
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
