import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Landing.css';

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [showTweet, setShowTweet] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const tweetRef = useRef(null);

  const showBetaWelcome = !authLoading && !isAuthenticated && showWelcomeModal;

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
      {showBetaWelcome && (
        <div
          className="landing-welcome-overlay"
          onClick={() => setShowWelcomeModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-modal-title"
        >
          <div className="landing-welcome-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="landing-welcome-close"
              onClick={() => setShowWelcomeModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="landing-welcome-content">
              <h2 id="welcome-modal-title" className="landing-welcome-title">
                Welcome Beta Tester! We hope you are OpenTo our idea.
              </h2>
              <div className="landing-welcome-body">
                <p>
                  Welcome to OpenTo. We are building a completely new real estate platform that allows homeowners and prospective purchasers to engage directly—ultimately making it possible to close a transaction in a manner similar to how TurboTax simplified filing taxes.
                </p>
                <p>
                  The platform aims to increase engagement and retain attention through features such as the <strong>Vendor Center</strong>—a one-stop place for a property’s key maintenance contractors—and the <strong>social media feed</strong>, a fun way to tag properties and create a social environment tailored to real estate. If walls could talk… now they can.
                </p>
                <p>
                  The ultimate goal is twofold: (1) Create a fun platform for people to interact with properties (social platforms crush it), and (2) build confidence for users to take the real estate sales process into their own hands. Trillions of dollars in single-family residential real estate change hands every year, with hundreds of billions in realtor fees—we want a piece of it.
                </p>
                <p>
                  Thanks for your willingness to beta test. Give it a test, try to break it, and share your opinions on strategy, technical implementation, design, and more. We’ve created a <strong>Feedback center</strong> for you (located at the top right once you’re in). Sign up with your email and use the password <code>@Dmin123</code> for now (full authentication is not in place yet). We know there’s plenty to do—very early stages. All feedback welcome.
                </p>
              </div>
              <button
                type="button"
                className="landing-welcome-dismiss btn btn-primary"
                onClick={() => setShowWelcomeModal(false)}
              >
                Got it — let me explore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              A Radically Different
              <span className="title-highlight"> Real Estate Platform</span>
            </h1>
            <p className="hero-callout">
              <strong>Access homes never seen on traditional platforms.</strong>
            </p>
            <p className="hero-description">
              OpenTo is for homeowners, buyers, and anyone who wants to explore real estate — a calm place to share, organize, and explore interest without pressure, timelines, or intermediaries.
            </p>
            <div className="hero-pillars">
              <div className="hero-pillar">
                <h3>A space to share or browse — on your terms.</h3>
                <p>Explore the market freely, privately, and confidently — without realtor fees.</p>
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
              <button onClick={handleListClick} className="btn btn-blue">
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
              <h3>Open Real Estate Marketplace</h3>
              <p>Discover homes that aren’t publicly for sale and connect directly with owners when interest is mutual.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3>Conversations, not broadcasts</h3>
              <p>Message owners or buyers one-to-one when there’s real intent. No mass blasts. No pressure.</p>
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
              <h3>Guidance on demand</h3>
              <p>We support you every step of the way, with guidance when you want it and space when you don’t.</p>
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
              <h3>Advanced insights</h3>
              <p>Data-rich tools and market insights help you evaluate options before you ever commit.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <h3>Move when it feels right</h3>
              <p>No days-on-market clock. No stale listing stigma. Go fast, slow, or not at all.</p>
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
              <button onClick={handleListClick} className="btn btn-blue btn-large">
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
