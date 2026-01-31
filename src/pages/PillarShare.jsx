import { useNavigate } from 'react-router-dom';
import './PillarPages.css';

const PillarShare = () => {
  const navigate = useNavigate();

  return (
    <div className="pillar-page">
      <section className="pillar-hero">
        <div className="pillar-container">
          <h1>A space to share or browse — on your terms.</h1>
          <p>
            A calm, flexible space to tell your home’s story early, explore quietly, and connect only
            when it feels right.
          </p>
          <div className="pillar-cta">
            <button onClick={() => navigate('/begin-sale')} className="btn btn-blue btn-large">
              Add Property to Platform
            </button>
            <button onClick={() => navigate('/browse')} className="btn btn-outline btn-large">
              Browse Properties
            </button>
          </div>
        </div>
      </section>

      <section className="pillar-section">
        <div className="pillar-container">
          <div className="pillar-section-header">
            <h2>What this pillar enables</h2>
            <p>Own your presence early, learn quietly, and engage only when interest is real.</p>
          </div>
          <div className="pillar-grid">
            <div className="pillar-card">
              <h2>Claim and shape your home</h2>
              <p>
                Claim your home and add as much or as little as you want. Upload photos, details, and
                updates over time — no pressure to list, no rush to decide.
              </p>
            </div>
            <div className="pillar-card">
              <h2>Quiet connections, real intent</h2>
              <p>
                Start low-stakes conversations with neighbors, owners in other markets, or early
                buyers. Ask about vendors, learn a neighborhood, or explore a second home early.
              </p>
            </div>
            <div className="pillar-card">
              <h2>Tell your story early</h2>
              <p>
                Photos and notes give others a real feel for your home’s character — before a listing
                ever exists.
              </p>
            </div>
            <div className="pillar-card">
              <h2>You control visibility</h2>
              <p>
                Choose what people can see and who can message you. Share openly, selectively, or not
                at all.
              </p>
            </div>
            <div className="pillar-card">
              <h2>Prepared for traction</h2>
              <p>
                When interest appears, your home is already organized and positioned to move quickly
                — or attract meaningful offers at any time.
              </p>
            </div>
          </div>
          <div className="pillar-intent">
            <h3>Intent behind this pillar</h3>
            <p>
              Give every homeowner or explorer a low-pressure place to be visible before the market
              forces a decision. OpenTo helps people signal interest early, build confidence, and
              connect in a way that feels calm, controlled, and private.
            </p>
          </div>
        </div>
      </section>

      <section className="pillar-section">
        <div className="pillar-container">
          <div className="pillar-section-header">
            <h2>Feature overview</h2>
            <p>A technical snapshot of the tools that make early engagement possible.</p>
          </div>
          <div className="pillar-grid">
            <div className="pillar-card">
              <h2>Home claiming & verification</h2>
              <p>Secure ownership confirmation before publishing details or enabling messages.</p>
            </div>
            <div className="pillar-card">
              <h2>Visibility controls</h2>
              <p>Set what is public, what is private, and who can request access.</p>
            </div>
            <div className="pillar-card">
              <h2>Curated media gallery</h2>
              <p>Photos, notes, and highlights that present the home on your timeline.</p>
            </div>
            <div className="pillar-card">
              <h2>Intent-based messaging</h2>
              <p>One-to-one conversations that open only when there is real interest.</p>
            </div>
            <div className="pillar-card">
              <h2>Offer-ready profiles</h2>
              <p>Structure details early so traction is immediate when the time is right.</p>
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

export default PillarShare;
