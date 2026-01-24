import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProcessStepsModal from '../components/ProcessStepsModal';
import { SELLING_STEPS } from '../data/processSteps';
import '../components/ProcessStepsModal.css';
import './HowSellingWorks.css';

const HowSellingWorks = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(0);

  const openStep = (index) => {
    setModalStep(index);
    setModalOpen(true);
  };

  return (
    <div className="how-selling-works-page">
      <div className="hsw-container">
        <header className="hsw-header">
          <h1 className="hsw-process-title">Our 10-step process to selling your home</h1>
          <p className="hsw-tagline">
            Click Start or any step to walk through each one. Use Previous and Next inside each step to move through the process.
          </p>
        </header>

        <div className="hsw-start-wrap">
          <button type="button" className="hsw-start-btn" onClick={() => openStep(0)}>
            Start
          </button>
        </div>

        <section className="hsw-step-nav-section">
          <div className="hsw-step-nav" role="navigation" aria-label="Process steps">
            {SELLING_STEPS.map((s, i) => (
              <button
                key={i}
                type="button"
                className="hsw-step-node"
                onClick={() => openStep(i)}
                aria-label={`Step ${i + 1}: ${s.title}`}
              >
                <span className="hsw-step-node-diamond">
                  <span className="hsw-step-node-num">{String(i + 1).padStart(2, '0')}</span>
                </span>
                <span className="hsw-step-node-title">{s.title}</span>
                {i < SELLING_STEPS.length - 1 && <span className="hsw-step-node-connector" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </section>

        <section className="hsw-expect">
          <h2>What You Can Expect From Us</h2>
          <ul className="hsw-expect-list">
            <li>Clear steps</li>
            <li>Plain-English explanations</li>
            <li>No pressure</li>
            <li>No surprises</li>
            <li>Help only when you need it</li>
          </ul>
          <p>If at any point you feel unsure, the platform will tell you:</p>
          <blockquote>“Here’s what’s happening, and here’s what to do next.”</blockquote>
        </section>

        <div className="hsw-close">
          <p className="hsw-close-main">Selling really can be this simple.</p>
          <p className="hsw-close-sub">And we’re here the whole way.</p>
          <div className="hsw-ctas">
            <button onClick={() => navigate('/begin-sale')} className="btn btn-primary btn-large">
              Begin home sale process
            </button>
            <button onClick={() => navigate('/how-buying-works')} className="btn btn-outline-secondary btn-large">
              How buying works
            </button>
            <button onClick={() => navigate('/')} className="btn btn-outline-secondary btn-large">
              Back to Home
            </button>
          </div>
        </div>
      </div>

      <ProcessStepsModal
        steps={SELLING_STEPS}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        startIndex={modalStep}
        theme="sell"
      />
    </div>
  );
};

export default HowSellingWorks;
