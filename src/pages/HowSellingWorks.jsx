import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProcessStepsModal from '../components/ProcessStepsModal';
import '../components/ProcessStepsModal.css';
import './HowSellingWorks.css';

const SELLING_STEPS = [
  {
    title: 'Confirm the Home',
    lead: 'We make sure everything is set up correctly before you list.',
    body: [
      { type: 'p', text: "You'll start by entering your home's address and confirming that you're the owner. We automatically check public records to confirm ownership and identify anything that could affect the sale, like:" },
      { type: 'ul', items: ['a mortgage,', 'a homeowners association,', 'or multiple owners on title.'] },
      { type: 'p', text: "If something needs attention, we'll explain it in plain language and tell you exactly what to do." },
    ],
    whyMatters: 'Catching issues early prevents delays later.',
  },
  {
    title: 'Price the Home',
    lead: 'We help you choose a price that makes sense.',
    body: [
      { type: 'p', text: "You'll answer a few simple questions about your home's condition and your goals. Then we analyze recent sales of similar homes nearby and show you:" },
      { type: 'ul', items: ['a realistic price range,', 'how long homes at that price usually take to sell,', 'and what pricing higher or lower typically means.'] },
      { type: 'p', text: "We'll recommend a price, but you're always in control." },
    ],
    whyMatters: 'Correct pricing attracts serious buyers and avoids long delays.',
  },
  {
    title: 'Get the Home Ready',
    lead: 'We help you focus on what actually matters.',
    body: [
      { type: 'p', text: "We'll give you a short, customized checklist to prepare your home. This might include cleaning, small touch-ups, or simple improvements that make a difference." },
      { type: 'p', text: "You'll never be told to over-spend or renovate unnecessarily. We'll show you what's worth doing — and what isn't." },
    ],
    whyMatters: 'A well-presented home sells faster and for more money.',
  },
  {
    title: 'List the Home',
    lead: 'We handle the details.',
    body: [
      { type: 'p', text: "Once you're ready, we create your listing and publish it to the major home-search websites. We write the description, organize photos, and make your home visible to buyers." },
      { type: 'p', text: "You'll also set your showing availability so buyers can schedule visits easily." },
    ],
    whyMatters: 'Maximum exposure brings more qualified buyers.',
  },
  {
    title: 'Showings & Feedback',
    lead: 'Buyers tour the home. You stay informed.',
    body: [
      { type: 'p', text: 'Buyers request showings through the platform. We coordinate scheduling and collect feedback automatically.' },
      { type: 'p', text: "You'll see:" },
      { type: 'ul', items: ['how many people viewed the home,', 'how many showings occurred,', 'and what buyers are saying.'] },
    ],
    whyMatters: 'Feedback helps confirm pricing and spot issues early.',
  },
  {
    title: 'Review Offers',
    lead: 'We make offers easy to understand.',
    body: [
      { type: 'p', text: "When offers come in, we present them side-by-side in clear terms: price, estimated money you'll receive, closing timeline, and overall risk. We highlight the strongest options and explain trade-offs, so you can choose confidently." },
      { type: 'p', text: 'You decide whether to accept, counter, or decline.' },
    ],
    whyMatters: "The best offer isn't always the highest number.",
  },
  {
    title: 'Under Contract',
    lead: 'We track deadlines so nothing is missed.',
    body: [
      { type: 'p', text: 'Once you accept an offer, there are a few important steps that follow, like inspections and financing approval. We track all deadlines for you and notify you only when action is needed.' },
      { type: 'p', text: "You'll never have to remember dates or follow up with multiple parties." },
    ],
    whyMatters: 'Missed deadlines can delay or derail a sale.',
  },
  {
    title: 'Inspections & Requests',
    lead: 'We help you respond calmly and confidently.',
    body: [
      { type: 'p', text: 'After inspections, buyers may request repairs or credits. We explain what\'s normal, what\'s optional, and what could create risk if ignored.' },
      { type: 'p', text: 'You choose how to respond. We handle the paperwork.' },
    ],
    whyMatters: 'Clear decisions prevent deals from falling apart.',
  },
  {
    title: 'Closing',
    lead: 'We make closing simple and predictable.',
    body: [
      { type: 'p', text: 'Before closing, we review the final numbers with you so there are no surprises. We confirm payoff amounts, closing costs, and your expected proceeds.' },
      { type: 'p', text: 'On closing day, you sign and hand over the keys. Funds are released, and the sale is complete.' },
    ],
    whyMatters: 'A smooth closing means peace of mind.',
  },
  {
    title: "You're Done",
    lead: 'Everything is wrapped up and saved.',
    body: [
      { type: 'p', text: "After closing, we store your documents securely and confirm the sale has officially recorded. You can access everything anytime." },
    ],
    whyMatters: 'Congratulations — your home is sold.',
    isDone: true,
  },
];

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
            <button onClick={() => navigate('/list-property')} className="btn btn-primary btn-large">
              List Your Property
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
