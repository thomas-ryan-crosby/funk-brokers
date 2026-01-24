import { useNavigate } from 'react-router-dom';
import './HowSellingWorks.css';

const HowSellingWorks = () => {
  const navigate = useNavigate();

  return (
    <div className="how-selling-works-page">
      <div className="hsw-container">
        <header className="hsw-header">
          <h1>How Selling Your Home Works</h1>
          <p className="hsw-tagline">
            Selling a home doesn’t have to be complicated. We guide you step by step.
          </p>
        </header>

        <div className="hsw-intro">
          <p>
            Our platform breaks the sale of your home into a small number of clear steps.
            You always know:
          </p>
          <ul>
            <li>what’s happening,</li>
            <li>what you need to do (if anything), and</li>
            <li>what comes next.</li>
          </ul>
          <p className="hsw-intro-close">No real-estate jargon. No guessing. No pressure.</p>
        </div>

        <ol className="hsw-steps">
          <li className="hsw-step">
            <h2>Step 1: Confirm the Home</h2>
            <p className="hsw-step-lead">We make sure everything is set up correctly before you list.</p>
            <p>
              You’ll start by entering your home’s address and confirming that you’re the owner.
              We automatically check public records to confirm ownership and identify anything that could affect the sale, like:
            </p>
            <ul>
              <li>a mortgage,</li>
              <li>a homeowners association,</li>
              <li>or multiple owners on title.</li>
            </ul>
            <p>
              If something needs attention, we’ll explain it in plain language and tell you exactly what to do.
            </p>
            <p className="hsw-why"><strong>Why this matters:</strong> Catching issues early prevents delays later.</p>
          </li>

          <li className="hsw-step">
            <h2>Step 2: Price the Home</h2>
            <p className="hsw-step-lead">We help you choose a price that makes sense.</p>
            <p>
              You’ll answer a few simple questions about your home’s condition and your goals.
              Then we analyze recent sales of similar homes nearby and show you:
            </p>
            <ul>
              <li>a realistic price range,</li>
              <li>how long homes at that price usually take to sell,</li>
              <li>and what pricing higher or lower typically means.</li>
            </ul>
            <p>We’ll recommend a price, but you’re always in control.</p>
            <p className="hsw-why"><strong>Why this matters:</strong> Correct pricing attracts serious buyers and avoids long delays.</p>
          </li>

          <li className="hsw-step">
            <h2>Step 3: Get the Home Ready</h2>
            <p className="hsw-step-lead">We help you focus on what actually matters.</p>
            <p>
              We’ll give you a short, customized checklist to prepare your home.
              This might include cleaning, small touch-ups, or simple improvements that make a difference.
            </p>
            <p>
              You’ll never be told to over-spend or renovate unnecessarily.
              We’ll show you what’s worth doing — and what isn’t.
            </p>
            <p className="hsw-why"><strong>Why this matters:</strong> A well-presented home sells faster and for more money.</p>
          </li>

          <li className="hsw-step">
            <h2>Step 4: List the Home</h2>
            <p className="hsw-step-lead">We handle the details.</p>
            <p>
              Once you’re ready, we create your listing and publish it to the major home-search websites.
              We write the description, organize photos, and make your home visible to buyers.
            </p>
            <p>You’ll also set your showing availability so buyers can schedule visits easily.</p>
            <p className="hsw-why"><strong>Why this matters:</strong> Maximum exposure brings more qualified buyers.</p>
          </li>

          <li className="hsw-step">
            <h2>Step 5: Showings & Feedback</h2>
            <p className="hsw-step-lead">Buyers tour the home. You stay informed.</p>
            <p>Buyers request showings through the platform. We coordinate scheduling and collect feedback automatically.</p>
            <p>You’ll see:</p>
            <ul>
              <li>how many people viewed the home,</li>
              <li>how many showings occurred,</li>
              <li>and what buyers are saying.</li>
            </ul>
            <p className="hsw-why"><strong>Why this matters:</strong> Feedback helps confirm pricing and spot issues early.</p>
          </li>

          <li className="hsw-step">
            <h2>Step 6: Review Offers</h2>
            <p className="hsw-step-lead">We make offers easy to understand.</p>
            <p>
              When offers come in, we present them side-by-side in clear terms: price, estimated money you’ll receive, closing timeline, and overall risk.
              We highlight the strongest options and explain trade-offs, so you can choose confidently.
            </p>
            <p>You decide whether to accept, counter, or decline.</p>
            <p className="hsw-why"><strong>Why this matters:</strong> The best offer isn’t always the highest number.</p>
          </li>

          <li className="hsw-step">
            <h2>Step 7: Under Contract</h2>
            <p className="hsw-step-lead">We track deadlines so nothing is missed.</p>
            <p>
              Once you accept an offer, there are a few important steps that follow, like inspections and financing approval.
              We track all deadlines for you and notify you only when action is needed.
            </p>
            <p>You’ll never have to remember dates or follow up with multiple parties.</p>
            <p className="hsw-why"><strong>Why this matters:</strong> Missed deadlines can delay or derail a sale.</p>
          </li>

          <li className="hsw-step">
            <h2>Step 8: Inspections & Requests</h2>
            <p className="hsw-step-lead">We help you respond calmly and confidently.</p>
            <p>
              After inspections, buyers may request repairs or credits.
              We explain what’s normal, what’s optional, and what could create risk if ignored.
            </p>
            <p>You choose how to respond. We handle the paperwork.</p>
            <p className="hsw-why"><strong>Why this matters:</strong> Clear decisions prevent deals from falling apart.</p>
          </li>

          <li className="hsw-step">
            <h2>Step 9: Closing</h2>
            <p className="hsw-step-lead">We make closing simple and predictable.</p>
            <p>
              Before closing, we review the final numbers with you so there are no surprises.
              We confirm payoff amounts, closing costs, and your expected proceeds.
            </p>
            <p>On closing day, you sign and hand over the keys. Funds are released, and the sale is complete.</p>
            <p className="hsw-why"><strong>Why this matters:</strong> A smooth closing means peace of mind.</p>
          </li>

          <li className="hsw-step">
            <h2>Step 10: You’re Done</h2>
            <p className="hsw-step-lead">Everything is wrapped up and saved.</p>
            <p>
              After closing, we store your documents securely and confirm the sale has officially recorded.
              You can access everything anytime.
            </p>
            <p className="hsw-why hsw-done">Congratulations — your home is sold.</p>
          </li>
        </ol>

        <section className="hsw-expect">
          <h2>What You Can Expect From Us</h2>
          <ul className="hsw-expect-list">
            <li>Clear steps</li>
            <li>Plain-English explanations</li>
            <li>No pressure</li>
            <li>No surprises</li>
            <li>Help only when you need it</li>
          </ul>
          <p>
            If at any point you feel unsure, the platform will tell you:
          </p>
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
    </div>
  );
};

export default HowSellingWorks;
