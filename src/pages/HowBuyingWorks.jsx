import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProcessStepsModal from '../components/ProcessStepsModal';
import '../components/ProcessStepsModal.css';
import './HowBuyingWorks.css';

const BUYING_STEPS = [
  {
    title: 'Get Ready to Buy',
    lead: "We make sure you're prepared before you start shopping.",
    body: [
      { type: 'p', text: "You'll begin by answering a few questions about your budget and timing. If you don't already have financing in place, we'll guide you through getting pre-approved so you know exactly what you can afford." },
      { type: 'p', text: 'We help you understand:' },
      { type: 'ul', items: ['your comfortable monthly payment,', 'your upfront costs,', 'and your realistic price range.'] },
    ],
    whyMatters: "Looking at homes before you're ready leads to stress and disappointment.",
  },
  {
    title: 'Define What You’re Looking For',
    lead: 'We help you focus on the right homes.',
    body: [
      { type: 'p', text: "You'll tell us what matters most to you, such as:" },
      { type: 'ul', items: ['location,', 'size,', 'budget,', 'must-haves and deal-breakers.'] },
      { type: 'p', text: "We use this to filter out homes that don't fit — so you don't waste time." },
    ],
    whyMatters: "Clear criteria prevent emotional decisions and buyer's remorse.",
  },
  {
    title: 'Find Homes',
    lead: 'We bring the right options to you.',
    body: [
      { type: 'p', text: "Based on your preferences, we show you available homes that match your criteria. You can:" },
      { type: 'ul', items: ['save favorites,', 'compare homes side by side,', 'and decide which ones you want to see in person.'] },
    ],
    whyMatters: 'Less scrolling. More focus.',
  },
  {
    title: 'Tour Homes',
    lead: 'See homes without chaos or pressure.',
    body: [
      { type: 'p', text: "When you're ready, we help coordinate showings and track what you've seen. After each visit, you can quickly note what you liked or didn't like." },
      { type: 'p', text: 'We help you stay objective and avoid rushing decisions.' },
    ],
    whyMatters: 'Buying a home is a big decision — clarity beats speed.',
  },
  {
    title: 'Make an Offer',
    lead: 'We help you submit a strong, smart offer.',
    body: [
      { type: 'p', text: "When you're ready to make an offer, we guide you through: choosing a price, setting a timeline, and deciding what protections to include. We explain each part of the offer in plain English and show how it affects your chances of success." },
    ],
    whyMatters: 'A well-structured offer can be more important than the highest price.',
  },
  {
    title: 'Negotiate',
    lead: 'You stay in control. We handle the details.',
    body: [
      { type: 'p', text: "If the seller responds with questions or changes, we explain your options clearly: accept, counter, or walk away. You'll always understand the trade-offs before deciding." },
    ],
    whyMatters: 'Confidence leads to better outcomes.',
  },
  {
    title: 'Under Contract',
    lead: 'We track the process so nothing is missed.',
    body: [
      { type: 'p', text: "Once your offer is accepted, there are important steps that follow — inspections, financing approval, and deadlines. We monitor everything for you and notify you only when action is required." },
    ],
    whyMatters: 'Missed deadlines can cost you the deal.',
  },
  {
    title: 'Inspections',
    lead: 'We help you understand what really matters.',
    body: [
      { type: 'p', text: "After inspections, you'll receive a report that can feel overwhelming. We break it down into: what's normal, what's serious, and what's optional. If repairs or credits are needed, we help you decide how to respond." },
    ],
    whyMatters: "Not every issue is a deal-breaker — perspective matters.",
  },
  {
    title: 'Final Approval & Walkthrough',
    lead: 'We make sure everything checks out.',
    body: [
      { type: 'p', text: 'Before closing: your financing is finalized, the home is appraised, and you complete a final walkthrough. We confirm that the home is in the expected condition before you close.' },
    ],
    whyMatters: "You should know exactly what you're buying.",
  },
  {
    title: 'Closing',
    lead: 'We make closing simple and predictable.',
    body: [
      { type: 'p', text: "You'll review final numbers ahead of time so there are no surprises. On closing day, you sign, funds are transferred, and you receive the keys." },
    ],
    whyMatters: 'Buying a home should feel exciting — not stressful.',
  },
  {
    title: 'Welcome Home',
    lead: 'Everything is complete and documented.',
    body: [
      { type: 'p', text: "After closing, your documents are stored securely and accessible anytime. You're officially a homeowner." },
    ],
    whyMatters: 'Congratulations — welcome home.',
    isDone: true,
  },
];

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
          <blockquote>“What do I need to do right now?”</blockquote>
        </section>

        <div className="hbw-close">
          <p className="hbw-close-main">Buying a home really can feel this straightforward.</p>
          <p className="hbw-close-sub">And we’re here the entire way.</p>
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
