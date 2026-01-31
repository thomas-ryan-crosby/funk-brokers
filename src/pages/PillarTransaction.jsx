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
            <button onClick={() => navigate('/how-it-works')} className="btn btn-blue btn-large">
              See Buying and Selling Steps
            </button>
            <button onClick={() => navigate('/browse')} className="btn btn-outline btn-large">
              Browse Properties
            </button>
          </div>
        </div>
      </section>

      <section className="pillar-section">
        <div className="pillar-container pillar-grid">
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
