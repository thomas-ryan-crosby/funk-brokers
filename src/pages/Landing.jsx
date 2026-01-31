import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  const navigate = useNavigate();
  const [showTweet, setShowTweet] = useState(true);
  const tweetRef = useRef(null);

  const handleBrowseClick = () => {
    navigate('/browse');
  };

  const handleListClick = () => {
    navigate('/begin-sale');
  };

  const handleLearnProcessClick = () => {
    navigate('/how-it-works');
  };

  useEffect(() => {
    if (!showTweet || !tweetRef.current) return;
    const load = () => {
      if (window.twttr?.widgets?.load) {
        window.twttr.widgets.load(tweetRef.current);
      }
    };
    if (window.twttr?.widgets?.load) {
      load();
      return;
    }
    if (!document.querySelector('script[data-twitter-wjs]')) {
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.defer = true;
      script.setAttribute('data-twitter-wjs', 'true');
      script.onload = load;
      document.body.appendChild(script);
    }
  }, [showTweet]);


  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              A Radically Different
              <span className="title-highlight"> Real Estate Platform</span>
            </h1>
            <p className="hero-description">
              OpenTo lets homeowners share, organize, and explore interest — without pressure, timelines, or intermediaries.
            </p>
            <div className="hero-pillars">
              <div className="hero-pillar">
                <h3>Share your home on your terms.</h3>
                <p>No pressure property showcasing. No deadlines. No public exposure unless you want it.</p>
              </div>
              <div className="hero-pillar">
                <h3>A Centralized Home Hub</h3>
                <p>One place for your home’s key documents, vendors, and history — organized and private.</p>
              </div>
              <div className="hero-pillar">
                <h3>You Control the Transaction</h3>
                <p>If you decide to buy or sell, you control the entire process. We guarantee <span className="hero-underline">it’s a lot easier than you think</span>.</p>
              </div>
            </div>
            <div className="hero-cta">
              <button onClick={handleBrowseClick} className="btn btn-primary">
                Browse Properties
              </button>
              <button onClick={handleListClick} className="btn btn-secondary">
                Add Property to Platform
              </button>
            </div>
            <button onClick={handleLearnProcessClick} className="hero-learn-more">
              Learn how it works
            </button>
          </div>
        </div>
        {showTweet && (
          <div className="hero-float-layer">
            <div className="landing-tweet-card landing-tweet-card--hero">
              <button
                type="button"
                className="landing-tweet-close"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowTweet(false);
                }}
                aria-label="Close video"
              >
                ×
              </button>
              <div ref={tweetRef} className="landing-tweet-embed">
                <blockquote className="twitter-tweet" data-media-max-width="360">
                  <p lang="en" dir="ltr">
                    Tell me this isn’t how it actually works...{' '}
                    <a href="https://t.co/UBzyHZk1VL">pic.twitter.com/UBzyHZk1VL</a>
                  </p>
                  &mdash; Dr. Clown, PhD (@DrClownPhD){' '}
                  <a href="https://twitter.com/DrClownPhD/status/2011294704344727726?ref_src=twsrc%5Etfw">
                    January 14, 2026
                  </a>
                </blockquote>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Built for the earliest stage</h2>
            <p className="section-subtitle">
              A calm, private space to explore buying or selling interest, before listings, agents, or fees enter the picture.
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3>Choice of approach</h3>
              <p>Proceed on your own, with an agent, or not at all. OpenTo supports every path.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3>Quiet connections</h3>
              <p>Open a private thread when interest is real. No mass blasts, no noise.</p>
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
              <h3>Clarity on demand</h3>
              <p>Guidance is there when you want it, from first signal to a formal path forward.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h3>Safe by design</h3>
              <p>Verified profiles before sensitive details are shared. You control who sees what.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <h3>Early answers</h3>
              <p>Straight guidance on pricing, timing, and next steps before you commit.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <h3>Timing control</h3>
              <p>Move quickly when it matters, or stay quiet until it does.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Curiosity → connection → clarity.</p>
          </div>
          <div className="steps-wrapper">
            <div className="step-card">
              <div className="step-number">01</div>
              <div className="step-content">
                <h3>Signal interest</h3>
                <p>Owners can share intent without going live. Buyers explore homes they would never see on Zillow.</p>
              </div>
            </div>
            <div className="step-card">
              <div className="step-number">02</div>
              <div className="step-content">
                <h3>Open a private thread</h3>
                <p>Verified introductions create trust before any documents or offers are shared.</p>
              </div>
            </div>
            <div className="step-card">
              <div className="step-number">03</div>
              <div className="step-content">
                <h3>Decide when to formalize</h3>
                <p>When timing is right, OpenTo helps you formalize or keep exploring.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Start earlier. Decide later.</h2>
            <p>OpenTo is the quiet place where interest begins, before days-on-market and stale listing stigma set in.</p>
            <div className="cta-buttons">
              <button onClick={handleBrowseClick} className="btn btn-primary btn-large">
                Browse Properties
              </button>
              <button onClick={handleListClick} className="btn btn-outline btn-large">
                Add Property to Platform
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
