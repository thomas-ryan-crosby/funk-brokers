import { useNavigate } from 'react-router-dom';
import './HowBuyingWorks.css';

const HowBuyingWorks = () => {
  const navigate = useNavigate();

  return (
    <div className="how-buying-works-page">
      <div className="hbw-container">
        <header className="hbw-header">
          <h1>How Buying a Home Works</h1>
          <p className="hbw-tagline">
            Buying a home doesn’t have to feel overwhelming. We guide you step by step.
          </p>
        </header>

        <div className="hbw-intro">
          <p>
            Our platform breaks the home-buying process into clear, manageable steps.
            You always know:
          </p>
          <ul>
            <li>where you are in the process,</li>
            <li>what you need to do (if anything),</li>
            <li>and what happens next.</li>
          </ul>
          <p className="hbw-intro-close">No jargon. No pressure. No guessing.</p>
        </div>

        <ol className="hbw-steps">
          <li className="hbw-step">
            <h2>Step 1: Get Ready to Buy</h2>
            <p className="hbw-step-lead">We make sure you’re prepared before you start shopping.</p>
            <p>
              You’ll begin by answering a few questions about your budget and timing.
              If you don’t already have financing in place, we’ll guide you through getting pre-approved so you know exactly what you can afford.
            </p>
            <p>We help you understand:</p>
            <ul>
              <li>your comfortable monthly payment,</li>
              <li>your upfront costs,</li>
              <li>and your realistic price range.</li>
            </ul>
            <p className="hbw-why"><strong>Why this matters:</strong> Looking at homes before you’re ready leads to stress and disappointment.</p>
          </li>

          <li className="hbw-step">
            <h2>Step 2: Define What You’re Looking For</h2>
            <p className="hbw-step-lead">We help you focus on the right homes.</p>
            <p>You’ll tell us what matters most to you, such as:</p>
            <ul>
              <li>location,</li>
              <li>size,</li>
              <li>budget,</li>
              <li>must-haves and deal-breakers.</li>
            </ul>
            <p>We use this to filter out homes that don’t fit — so you don’t waste time.</p>
            <p className="hbw-why"><strong>Why this matters:</strong> Clear criteria prevent emotional decisions and buyer’s remorse.</p>
          </li>

          <li className="hbw-step">
            <h2>Step 3: Find Homes</h2>
            <p className="hbw-step-lead">We bring the right options to you.</p>
            <p>
              Based on your preferences, we show you available homes that match your criteria.
              You can:
            </p>
            <ul>
              <li>save favorites,</li>
              <li>compare homes side by side,</li>
              <li>and decide which ones you want to see in person.</li>
            </ul>
            <p className="hbw-why"><strong>Why this matters:</strong> Less scrolling. More focus.</p>
          </li>

          <li className="hbw-step">
            <h2>Step 4: Tour Homes</h2>
            <p className="hbw-step-lead">See homes without chaos or pressure.</p>
            <p>
              When you’re ready, we help coordinate showings and track what you’ve seen.
              After each visit, you can quickly note what you liked or didn’t like.
            </p>
            <p>We help you stay objective and avoid rushing decisions.</p>
            <p className="hbw-why"><strong>Why this matters:</strong> Buying a home is a big decision — clarity beats speed.</p>
          </li>

          <li className="hbw-step">
            <h2>Step 5: Make an Offer</h2>
            <p className="hbw-step-lead">We help you submit a strong, smart offer.</p>
            <p>
              When you’re ready to make an offer, we guide you through: choosing a price, setting a timeline, and deciding what protections to include.
              We explain each part of the offer in plain English and show how it affects your chances of success.
            </p>
            <p className="hbw-why"><strong>Why this matters:</strong> A well-structured offer can be more important than the highest price.</p>
          </li>

          <li className="hbw-step">
            <h2>Step 6: Negotiate</h2>
            <p className="hbw-step-lead">You stay in control. We handle the details.</p>
            <p>
              If the seller responds with questions or changes, we explain your options clearly: accept, counter, or walk away.
              You’ll always understand the trade-offs before deciding.
            </p>
            <p className="hbw-why"><strong>Why this matters:</strong> Confidence leads to better outcomes.</p>
          </li>

          <li className="hbw-step">
            <h2>Step 7: Under Contract</h2>
            <p className="hbw-step-lead">We track the process so nothing is missed.</p>
            <p>
              Once your offer is accepted, there are important steps that follow — inspections, financing approval, and deadlines.
              We monitor everything for you and notify you only when action is required.
            </p>
            <p className="hbw-why"><strong>Why this matters:</strong> Missed deadlines can cost you the deal.</p>
          </li>

          <li className="hbw-step">
            <h2>Step 8: Inspections</h2>
            <p className="hbw-step-lead">We help you understand what really matters.</p>
            <p>
              After inspections, you’ll receive a report that can feel overwhelming.
              We break it down into: what’s normal, what’s serious, and what’s optional.
              If repairs or credits are needed, we help you decide how to respond.
            </p>
            <p className="hbw-why"><strong>Why this matters:</strong> Not every issue is a deal-breaker — perspective matters.</p>
          </li>

          <li className="hbw-step">
            <h2>Step 9: Final Approval & Walkthrough</h2>
            <p className="hbw-step-lead">We make sure everything checks out.</p>
            <p>
              Before closing: your financing is finalized, the home is appraised, and you complete a final walkthrough.
              We confirm that the home is in the expected condition before you close.
            </p>
            <p className="hbw-why"><strong>Why this matters:</strong> You should know exactly what you’re buying.</p>
          </li>

          <li className="hbw-step">
            <h2>Step 10: Closing</h2>
            <p className="hbw-step-lead">We make closing simple and predictable.</p>
            <p>
              You’ll review final numbers ahead of time so there are no surprises.
              On closing day, you sign, funds are transferred, and you receive the keys.
            </p>
            <p className="hbw-why"><strong>Why this matters:</strong> Buying a home should feel exciting — not stressful.</p>
          </li>

          <li className="hbw-step">
            <h2>Step 11: Welcome Home</h2>
            <p className="hbw-step-lead">Everything is complete and documented.</p>
            <p>
              After closing, your documents are stored securely and accessible anytime.
              You’re officially a homeowner.
            </p>
            <p className="hbw-why hbw-done">Congratulations — welcome home.</p>
          </li>
        </ol>

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
    </div>
  );
};

export default HowBuyingWorks;
