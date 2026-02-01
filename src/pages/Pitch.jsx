import './Pitch.css';

const Pitch = () => {
  return (
    <div className="pitch-page">
      <div className="pitch-hero">
        <p className="pitch-brand">OpenTo</p>
        <h1>A Radically Different Real Estate Platform</h1>
        <p className="pitch-subtitle">What We&apos;re Building</p>
        <p className="pitch-intro">
          OpenTo is building a new discovery layer for residential real estate.
          Our goal is to unlock latent housing supply by allowing homeowners and buyers to explore interest
          before a listing, before commitments, and before things go public.
        </p>
        <div className="pitch-summary">
          <div className="pitch-summary-card">
            <h3>In short</h3>
            <ul>
              <li>Turn every home into potentially discoverable supply</li>
              <li>Create an intent-based marketplace for residential real estate</li>
            </ul>
          </div>
          <div className="pitch-summary-card pitch-summary-card--accent">
            <h3>Core principles</h3>
            <ul>
              <li>Visibility without pressure</li>
              <li>Conversation before transaction</li>
              <li>Optionality over obligation</li>
            </ul>
          </div>
        </div>
      </div>

      <section className="pitch-section">
        <h2>The Problem</h2>
        <p>Residential real estate is artificially constrained.</p>
        <div className="pitch-grid">
          <div className="pitch-card">
            <h4>Only ~1–2% of homes are listed for sale</h4>
            <p>Listings are the only accepted discovery mechanism.</p>
          </div>
          <div className="pitch-card">
            <h4>Sellers must publicly commit just to test demand</h4>
            <p>Listings are irreversible, public, and stigmatized if they linger.</p>
          </div>
          <div className="pitch-card">
            <h4>Sellers are forced to decide too early</h4>
            <p>Pricing, timing, and representation are required before market feedback.</p>
          </div>
          <div className="pitch-card">
            <h4>Buyers only see thin supply</h4>
            <p>They can only browse what&apos;s already listed, not what could be available.</p>
          </div>
          <div className="pitch-card">
            <h4>Agents gatekeep access</h4>
            <p>Discovery is intermediated and constrained by 5–6% representation models.</p>
          </div>
        </div>
      </section>

      <section className="pitch-section">
        <h2>The Result</h2>
        <div className="pitch-results">
          <div>
            <h4>Liquidity is artificially low</h4>
            <p>Massive latent supply remains invisible.</p>
          </div>
          <div>
            <h4>Discovery is inefficient and incomplete</h4>
            <p>Transactions are slow, pressured, and expensive.</p>
          </div>
        </div>
      </section>

      <section className="pitch-section">
        <h2>The Insight</h2>
        <p>Most homeowners aren&apos;t ready to list. But many are open to the right conversation.</p>
        <div className="pitch-insight">
          <ul>
            <li>Sell at the right price</li>
            <li>Move for the right opportunity</li>
            <li>Explore options quietly</li>
            <li>Respond to credible interest</li>
          </ul>
          <p>
            Today, there is no safe, private, or accepted way to express that intent.
            So these homes stay invisible — even though real demand exists.
          </p>
        </div>
      </section>

      <section className="pitch-section">
        <h2>The Solution</h2>
        <p>OpenTo is an intent-based real estate marketplace.</p>
        <div className="pitch-solution">
          <div className="pitch-card">
            <h4>Homes can be discoverable without requiring a listing</h4>
            <p>Owners control visibility, conversations, and engagement.</p>
          </div>
          <div className="pitch-card">
            <h4>Buyers and owners explore interest privately</h4>
            <p>Commitment happens last, not first.</p>
          </div>
          <div className="pitch-card">
            <h4>Optional representation</h4>
            <p>Transact directly, bring an agent, or use OpenTo&apos;s tools.</p>
          </div>
        </div>
      </section>

      <section className="pitch-section">
        <h2>How It Works</h2>
        <div className="pitch-steps">
          <div className="pitch-step">
            <span className="pitch-step-title">Browse</span>
            <p>Explore homes beyond traditional listings — including homes open to interest but not publicly for sale.</p>
          </div>
          <div className="pitch-step">
            <span className="pitch-step-title">Convey Interest</span>
            <p>Reach out privately without forcing owners into public exposure or contracts.</p>
          </div>
          <div className="pitch-step">
            <span className="pitch-step-title">Connect</span>
            <p>Homeowners respond only when and how they choose.</p>
          </div>
          <div className="pitch-step">
            <span className="pitch-step-title">Proceed</span>
            <p>Transact directly, bring in an agent, or use OpenTo&apos;s online transaction tools.</p>
          </div>
        </div>
        <p className="pitch-footnote">Representation is optional. Commitment is intentional.</p>
      </section>

      <section className="pitch-section">
        <h2>What Makes OpenTo Different</h2>
        <div className="pitch-compare">
          <div>
            <span>Zillow optimizes for listings</span>
          </div>
          <div>
            <span>Redfin optimizes for brokerage</span>
          </div>
          <div className="pitch-compare-highlight">
            <span>OpenTo optimizes for intent before commitment</span>
          </div>
        </div>
        <p>We&apos;re not replacing listings — we&apos;re redefining what comes before them.</p>
      </section>

      <section className="pitch-section">
        <h2>Why Now</h2>
        <div className="pitch-grid">
          <div className="pitch-card">
            <p>Commission disruption (NAR settlement) has cracked long-standing assumptions.</p>
          </div>
          <div className="pitch-card">
            <p>Consumers are increasingly comfortable with self-service and digital tools.</p>
          </div>
          <div className="pitch-card">
            <p>Buyers and sellers are fatigued by stale listings and forced processes.</p>
          </div>
          <div className="pitch-card">
            <p>Off-market activity is exploding but fragmented.</p>
          </div>
          <div className="pitch-card">
            <p>Younger buyers expect direct, transparent, digital experiences.</p>
          </div>
        </div>
        <p>The industry is structurally ready for a new discovery model.</p>
      </section>

      <section className="pitch-section">
        <h2>Market Opportunity</h2>
        <div className="pitch-market">
          <div>
            <h3>~$2–3T</h3>
            <p>Annual U.S. residential transaction volume</p>
          </div>
          <div>
            <h3>~6M</h3>
            <p>Transactions per year</p>
          </div>
          <div>
            <h3>$100B+</h3>
            <p>Annual commission pool at 5–6%</p>
          </div>
        </div>
        <p>
          OpenTo doesn&apos;t need to replace the market. Even modest capture of early discovery,
          intent signaling, and optional transaction flow creates a multi-billion dollar opportunity.
        </p>
      </section>

      <section className="pitch-section">
        <h2>Business Model</h2>
        <div className="pitch-phases">
          <div className="pitch-card">
            <h4>Phase 1</h4>
            <ul>
              <li>Lightweight transaction fees</li>
              <li>Premium visibility and discovery tools</li>
            </ul>
          </div>
          <div className="pitch-card">
            <h4>Phase 2</h4>
            <ul>
              <li>Value-added services (title, escrow, mortgage)</li>
              <li>Advanced analytics and data products</li>
            </ul>
          </div>
          <div className="pitch-card">
            <h4>Phase 3</h4>
            <ul>
              <li>Local advertising and marketplace monetization</li>
            </ul>
          </div>
        </div>
        <p>Monetization scales with trust and usage — not pressure.</p>
      </section>

      <section className="pitch-section">
        <h2>Traction Metrics (Early Signals)</h2>
        <div className="pitch-metrics">
          <span>Users onboarded</span>
          <span>Homes claimed or marked “open”</span>
          <span>Interest signals created</span>
          <span>Conversations initiated</span>
          <span>Transactions completed</span>
          <span>Waitlist growth</span>
        </div>
      </section>

      <section className="pitch-section">
        <h2>Our Vision</h2>
        <div className="pitch-vision">
          <p>Every home can be discoverable.</p>
          <p>Every owner has optionality.</p>
          <p>Every transaction starts with a conversation.</p>
        </div>
        <p>
          OpenTo becomes the default intent layer between homeowners and buyers — whether someone is:
          window shopping, quietly exploring, actively buying, or considering selling someday.
        </p>
      </section>

      <section className="pitch-section">
        <h2>The Team</h2>
        <div className="pitch-team">
          <div className="pitch-card">
            <h4>Ryan Crosby</h4>
            <p>Technology Systems Engineer &amp; Product Manager</p>
            <ul>
              <li>Regulated medical devices (Cook Medical, Medtronic, Smith+Nephew Robotics)</li>
              <li>Autonomous vehicles (Aurora)</li>
              <li>Real estate owner/operator in a multi-generation family business</li>
              <li>Focused on systems, trust, and digitization of legacy industries</li>
            </ul>
          </div>
          <div className="pitch-card">
            <h4>Josh Meister</h4>
            <p>Real estate operator and PE investor</p>
            <ul>
              <li>Multifamily</li>
              <li>High-volume transactions</li>
              <li>Deal structuring and execution</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="pitch-section pitch-ask">
        <h2>Our Ask</h2>
        <p>TBD</p>
        <p className="pitch-ask-note">
          Pre-seed / seed capital to build, launch, and seed the marketplace city-by-city.
        </p>
      </section>
    </div>
  );
};

export default Pitch;
