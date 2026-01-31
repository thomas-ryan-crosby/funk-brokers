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
        <div className="pillar-container">
          <div className="pillar-section-header">
            <h2>What this pillar enables</h2>
            <p>A single source of truth for the details that keep a property running smoothly.</p>
          </div>
          <div className="pillar-grid">
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
          <div className="pillar-intent">
            <h3>Intent behind this pillar</h3>
            <p>
              Reduce friction and stress by centralizing everything a property needs. The goal is
              to make ownership feel organized, transferable, and ready for any transition.
            </p>
          </div>
        </div>
      </section>

      <section className="pillar-section">
        <div className="pillar-container">
          <div className="pillar-section-header">
            <h2>Feature overview</h2>
            <p>Technical systems designed to keep your home documented and easy to manage.</p>
          </div>
          <div className="pillar-grid">
            <div className="pillar-card">
              <h2>Secure document vault</h2>
              <p>Private storage for permits, disclosures, invoices, and maintenance history.</p>
            </div>
            <div className="pillar-card">
              <h2>Vendor directory</h2>
              <p>Save trusted providers with notes, pricing, and contact history.</p>
            </div>
            <div className="pillar-card">
              <h2>Property timeline</h2>
              <p>Track updates, repairs, and upgrades in one chronological view.</p>
            </div>
            <div className="pillar-card">
              <h2>Access handoff tools</h2>
              <p>Grant temporary visibility when someone else is caring for the property.</p>
            </div>
            <div className="pillar-card">
              <h2>Maintenance readiness</h2>
              <p>Reminders and records so nothing is lost or forgotten over time.</p>
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

export default PillarHub;
