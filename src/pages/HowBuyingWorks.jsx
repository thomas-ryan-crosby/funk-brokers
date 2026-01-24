import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProcessStepsModal from '../components/ProcessStepsModal';
import { BUYING_STEPS } from '../data/processSteps';
import '../components/ProcessStepsModal.css';
import './HowBuyingWorks.css';

const HowBuyingWorks = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(0);

  const openStep = (index) => {
    setModalStep(index);
    setModalOpen(true);
  };

  return (
    <div className="how-buying-works-page">
      <div className="hbw-container">
        <header className="hbw-header">
          <h1 className="hbw-process-title">Our 11-step process to buying a home</h1>
          <p className="hbw-tagline">
            Click Start or any step to walk through each one. Use Previous and Next inside each step to move through the process.
          </p>
        </header>

        <div className="hbw-start-wrap">
          <button type="button" className="hbw-start-btn" onClick={() => openStep(0)}>
            Start
          </button>
        </div>

        <section className="hbw-step-nav-section">
          <div className="hbw-step-nav" role="navigation" aria-label="Process steps">
            {BUYING_STEPS.map((s, i) => (
              <button
                key={i}
                type="button"
                className="hbw-step-node"
                onClick={() => openStep(i)}
                aria-label={`Step ${i + 1}: ${s.title}`}
              >
                <span className="hbw-step-node-diamond">
                  <span className="hbw-step-node-num">{String(i + 1).padStart(2, '0')}</span>
                </span>
                <span className="hbw-step-node-title">{s.title}</span>
                {i < BUYING_STEPS.length - 1 && <span className="hbw-step-node-connector" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </section>

        <section className="hbw-expect">
          <h2>What You Can Expect From Us</h2>
          <ul className="hbw-expect-list">
            <li>Clear steps</li>
            <li>Simple explanations</li>
            <li>No pressure</li>
            <li>No hidden surprises</li>
            <li>Guidance only when you need it</li>
          </ul>
          <p>At every stage, we answer one question:</p>
          <blockquote>"What do I need to do right now?"</blockquote>
        </section>

        <div className="hbw-close">
          <p className="hbw-close-main">Buying a home really can feel this straightforward.</p>
          <p className="hbw-close-sub">And we're here the entire way.</p>
          <div className="hbw-ctas">
            <button onClick={() => navigate('/browse')} className="btn btn-primary btn-large">
              Browse Properties
            </button>
            <button onClick={() => navigate('/how-selling-works')} className="btn btn-outline-secondary btn-large">
              How selling works
            </button>
            <button onClick={() => navigate('/')} className="btn btn-outline-secondary btn-large">
              Back to Home
            </button>
          </div>
        </div>
      </div>

      <ProcessStepsModal
        steps={BUYING_STEPS}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        startIndex={modalStep}
        theme="buy"
      />
    </div>
  );
};

export default HowBuyingWorks;
