import { useNavigate } from 'react-router-dom';
import './PillarPages.css';

const PillarHub = () => {
  const navigate = useNavigate();

  return (
    <div className="pillar-page">
      <section className="pillar-hero">
        <div className="pillar-container">
          <h1>A Centralized Home Hub</h1>
          <p>
            One secure place for your home’s key documents, vendors, and history — so nothing falls
            through the cracks.
          </p>
          <div className="pillar-cta">
            <button onClick={() => navigate('/begin-sale')} className="btn btn-blue btn-large">
              Add Property to Platform
            </button>
            <button onClick={() => navigate('/how-it-works')} className="btn btn-outline btn-large">
              Explore How It Works
            </button>
          </div>
        </div>
      </section>

      <section className="pillar-section">
        <div className="pillar-container pillar-grid">
          <div className="pillar-card">
            <h2>All critical documents, organized</h2>
            <p>
              Store warranties, permits, receipts, disclosures, and updates in one trusted place.
              No more digging through folders or spreadsheets.
            </p>
          </div>
          <div className="pillar-card">
            <h2>Trusted vendors, always ready</h2>
            <p>
              Keep preferred vendors on hand for seasonal work or unexpected needs. Share access
              when someone else is managing the property.
            </p>
          </div>
          <div className="pillar-card">
            <h2>Confidence during transitions</h2>
            <p>
              Going out of town? Handing the property off? Your records, contacts, and instructions
              are already organized and accessible.
            </p>
          </div>
          <div className="pillar-card">
            <h2>Preparedness is leverage</h2>
            <p>
              A well-maintained, well-documented home builds confidence — for you, for caregivers,
              and for future buyers.
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

export default PillarHub;
