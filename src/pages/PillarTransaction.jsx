import { useNavigate } from 'react-router-dom';
import './PillarPages.css';

const PillarTransaction = () => {
  const navigate = useNavigate();

  return (
    <div className="pillar-page">
      <section className="pillar-hero">
        <div className="pillar-container">
          <h1>You Control the Transaction</h1>
          <p>
            If you decide to buy or sell, you can do it directly — with a process that feels as easy
            as filing taxes online.
          </p>
          <div className="pillar-cta">
            <button onClick={() => navigate('/how-buying-works')} className="btn btn-blue btn-large">
              See Buying Steps
            </button>
            <button onClick={() => navigate('/how-selling-works')} className="btn btn-outline btn-large">
              See Selling Steps
            </button>
          </div>
        </div>
      </section>

      <section className="pillar-section">
        <div className="pillar-container">
          <div className="pillar-section-header">
            <h2>What this pillar enables</h2>
            <p>Control, clarity, and real savings when you’re ready to transact.</p>
          </div>
          <div className="pillar-grid">
            <div className="pillar-card">
              <h2>Direct control, real savings</h2>
              <p>
                Save tens to hundreds of thousands in realtor fees by managing the process yourself
                when you’re ready.
              </p>
            </div>
            <div className="pillar-card">
              <h2>Clear, guided steps</h2>
              <p>
                We give you a straightforward path with tools and guidance — without pressure or
                gatekeeping.
              </p>
            </div>
            <div className="pillar-card">
              <h2>Choose who’s involved</h2>
              <p>
                Bring in professionals when you want, not when you’re told to. You decide the pace and
                partners.
              </p>
            </div>
            <div className="pillar-card">
              <h2>Confidence before commitment</h2>
              <p>
                Because your home and interest are already documented, you move faster when the moment
                is right.
              </p>
            </div>
          </div>
          <div className="pillar-intent">
            <h3>Intent behind this pillar</h3>
            <p>
              Remove the friction and fees that make transactions feel intimidating. OpenTo is meant
              to make the process feel simple, transparent, and under your control.
            </p>
          </div>
        </div>
      </section>

      <section className="pillar-section">
        <div className="pillar-container">
          <div className="pillar-section-header">
            <h2>Choose your path</h2>
            <p>Select the guided steps for buying or selling when you are ready to move forward.</p>
          </div>
          <div className="pillar-step-grid">
            <button onClick={() => navigate('/how-buying-works')} className="pillar-step-card">
              <h3>How Buying a Home Works</h3>
              <p>From getting ready to buy to closing — clear steps, no jargon, and support only when you need it.</p>
              <span className="pillar-step-link">See the buying process →</span>
            </button>
            <button onClick={() => navigate('/how-selling-works')} className="pillar-step-card">
              <h3>How Selling Your Home Works</h3>
              <p>From confirming ownership to closing — we guide you through every step with plain language and no pressure.</p>
              <span className="pillar-step-link">See the selling process →</span>
            </button>
          </div>
        </div>
      </section>

      <section className="pillar-section">
        <div className="pillar-container">
          <div className="pillar-section-header">
            <h2>Feature overview</h2>
            <p>Tools that make buying or selling feel approachable and guided.</p>
          </div>
          <div className="pillar-grid">
            <div className="pillar-card">
              <h2>Step-by-step workflows</h2>
              <p>Clear milestones for buyers and sellers with plain-language guidance.</p>
            </div>
            <div className="pillar-card">
              <h2>Offer and counter workflows</h2>
              <p>Structured steps to create, review, and manage offers confidently.</p>
            </div>
            <div className="pillar-card">
              <h2>Document readiness</h2>
              <p>Checklists and templates that keep paperwork organized and on track.</p>
            </div>
            <div className="pillar-card">
              <h2>Advisory on demand</h2>
              <p>Bring in experts only when you want the help, without giving up control.</p>
            </div>
            <div className="pillar-card">
              <h2>Fee transparency</h2>
              <p>Clear visibility into costs so you always know what you are saving.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="pillar-back">
        <button onClick={() => navigate('/')} className="pillar-back-btn">
          ← Back to Home
        </button>
      </div>
    </div>
  );
};

export default PillarTransaction;
