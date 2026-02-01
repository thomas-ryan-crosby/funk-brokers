import Logo from '../components/Logo';
import './Pitch.css';

const Pitch = () => {
  return (
    <div className="pitch-page">
      <div className="pitch-sheet">
        <header className="pitch-hero">
          <div className="pitch-brand">
            <Logo variant="symbol" alt="OpenTo" />
            <p className="pitch-kicker">OpenTo</p>
          </div>
          <h1>A Radically Different Real Estate Platform</h1>
          <p className="pitch-subtitle">What We&apos;re Building</p>
          <p className="pitch-lead">
            OpenTo is building a new discovery layer for residential real estate.
            Our goal is to unlock latent housing supply by allowing homeowners and buyers to explore interest
            before a listing, before commitments, and before things go public.
          </p>
          <div className="pitch-callouts">
            <div className="pitch-callout">
              <h3>In short</h3>
              <ul className="pitch-list">
                <li>Turn every home into potentially discoverable supply</li>
                <li>Create an intent-based marketplace for residential real estate</li>
              </ul>
            </div>
            <div className="pitch-callout pitch-callout--accent">
              <h3>Core principles</h3>
              <ul className="pitch-list">
                <li>Visibility without pressure</li>
                <li>Conversation before transaction</li>
                <li>Optionality over obligation</li>
              </ul>
            </div>
          </div>
        </header>

        <section className="pitch-section">
          <h2>The Problem</h2>
          <p>Residential real estate is artificially constrained.</p>
          <ul className="pitch-list pitch-list--dense">
            <li><strong>Only ~1–2% of homes are listed for sale.</strong> Listings are the only accepted discovery mechanism.</li>
            <li><strong>Sellers must publicly commit just to test demand.</strong> Listings are irreversible, public, and stigmatized if they linger.</li>
            <li><strong>Sellers are forced to decide too early.</strong> Pricing, timing, and representation are required before market feedback.</li>
            <li><strong>Buyers only see thin supply.</strong> They can only browse what&apos;s already listed, not what could be available.</li>
            <li><strong>Agents gatekeep access.</strong> Discovery is intermediated and constrained by 5–6% representation models.</li>
          </ul>
        </section>

        <section className="pitch-section">
          <h2>The Result</h2>
          <div className="pitch-columns">
            <p><strong>Liquidity is artificially low.</strong> Massive latent supply remains invisible.</p>
            <p><strong>Discovery is inefficient and incomplete.</strong> Transactions are slow, pressured, and expensive.</p>
          </div>
        </section>

        <section className="pitch-section">
          <h2>The Insight</h2>
          <p>Most homeowners aren&apos;t ready to list. But many are open to the right conversation.</p>
          <div className="pitch-columns pitch-columns--wide">
            <ul className="pitch-list">
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
          <ul className="pitch-list pitch-list--dense">
            <li>Homes can be discoverable without requiring a listing.</li>
            <li>Buyers and owners explore interest privately.</li>
            <li>Commitment happens last, not first.</li>
            <li>Representation is optional — transact directly, bring an agent, or use OpenTo&apos;s tools.</li>
          </ul>
        </section>

        <section className="pitch-section">
          <h2>How It Works</h2>
          <ol className="pitch-steps">
            <li><strong>Browse.</strong> Explore homes beyond traditional listings — including homes open to interest but not publicly for sale.</li>
            <li><strong>Convey Interest.</strong> Reach out privately without forcing owners into public exposure or contracts.</li>
            <li><strong>Connect.</strong> Homeowners respond only when and how they choose.</li>
            <li><strong>Proceed.</strong> Transact directly, bring in an agent, or use OpenTo&apos;s online transaction tools.</li>
          </ol>
          <p className="pitch-footnote">Representation is optional. Commitment is intentional.</p>
        </section>

        <section className="pitch-section">
          <h2>What Makes OpenTo Different</h2>
          <div className="pitch-compare">
            <span>Zillow optimizes for listings.</span>
            <span>Redfin optimizes for brokerage.</span>
            <span className="pitch-compare-highlight">OpenTo optimizes for intent before commitment.</span>
          </div>
          <p>We&apos;re not replacing listings — we&apos;re redefining what comes before them.</p>
        </section>

        <section className="pitch-section">
          <h2>Why Now</h2>
          <ul className="pitch-list pitch-list--dense">
            <li>Commission disruption (NAR settlement) has cracked long-standing assumptions.</li>
            <li>Consumers are increasingly comfortable with self-service and digital tools.</li>
            <li>Buyers and sellers are fatigued by stale listings and forced processes.</li>
            <li>Off-market activity is exploding but fragmented.</li>
            <li>Younger buyers expect direct, transparent, digital experiences.</li>
          </ul>
          <p>The industry is structurally ready for a new discovery model.</p>
        </section>

        <section className="pitch-section">
          <h2>Market Opportunity</h2>
          <div className="pitch-stats">
            <div>
              <p className="pitch-stat-value">~$2–3T</p>
              <p>Annual U.S. residential transaction volume</p>
            </div>
            <div>
              <p className="pitch-stat-value">~6M</p>
              <p>Transactions per year</p>
            </div>
            <div>
              <p className="pitch-stat-value">$100B+</p>
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
          <div className="pitch-columns pitch-columns--wide">
            <div>
              <h3>Phase 1</h3>
              <ul className="pitch-list">
                <li>Lightweight transaction fees</li>
                <li>Premium visibility and discovery tools</li>
              </ul>
            </div>
            <div>
              <h3>Phase 2</h3>
              <ul className="pitch-list">
                <li>Value-added services (title, escrow, mortgage)</li>
                <li>Advanced analytics and data products</li>
              </ul>
            </div>
            <div>
              <h3>Phase 3</h3>
              <ul className="pitch-list">
                <li>Local advertising and marketplace monetization</li>
              </ul>
            </div>
          </div>
          <p>Monetization scales with trust and usage — not pressure.</p>
        </section>

        <section className="pitch-section">
          <h2>Traction Metrics (Early Signals)</h2>
          <div className="pitch-chips">
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
          <div className="pitch-columns">
            <div>
              <h3>Ryan Crosby</h3>
              <p className="pitch-role">Technology Systems Engineer &amp; Product Manager</p>
              <ul className="pitch-list">
                <li>Regulated medical devices (Cook Medical, Medtronic, Smith+Nephew Robotics)</li>
                <li>Autonomous vehicles (Aurora)</li>
                <li>Real estate owner/operator in a multi-generation family business</li>
                <li>Focused on systems, trust, and digitization of legacy industries</li>
              </ul>
            </div>
            <div>
              <h3>Josh Meister</h3>
              <p className="pitch-role">Real estate operator and PE investor</p>
              <ul className="pitch-list">
                <li>Multifamily</li>
                <li>High-volume transactions</li>
                <li>Deal structuring and execution</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="pitch-section pitch-ask">
          <h2>Our Ask</h2>
          <div className="pitch-callout pitch-callout--accent">
            <p className="pitch-ask-value">TBD</p>
            <p className="pitch-ask-note">
              Pre-seed / seed capital to build, launch, and seed the marketplace city-by-city.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Pitch;
