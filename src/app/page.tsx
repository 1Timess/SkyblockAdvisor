import { ProfileSearchForm } from "@/components/ProfileSearchForm";

const features = [
  {
    title: "Personalized Analysis",
    description: "Your profile, your progression, and recommendations grounded in what you actually have.",
    tone: "blue",
    icon: <path d="M4 19V11M10 19V5M16 19v-8M22 19H2" />,
  },
  {
    title: "Major Systems",
    description: "Gear, skills, collections, pets, dungeons, and more in one place.",
    tone: "green",
    icon: <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v9m8-4.5-8 4.5m-8-4.5 8 4.5" />,
  },
  {
    title: "Updated Regularly",
    description: "Profile information and game knowledge are kept current as SkyBlock changes.",
    tone: "purple",
    icon: <circle cx="12" cy="12" r="8.5" />,
  },
  {
    title: "Built for Players",
    description: "Whether you're starting out or deep into progression, your profile stays at the center.",
    tone: "gold",
    icon: <path d="m12 3 2.2 4.45 4.9.7-3.55 3.45.84 4.88L12 14.2l-4.39 2.28.84-4.88L4.9 8.15l4.9-.7L12 3Z" />,
  },
];

export default function Home() {
  return (
    <main className="landing">
      <div className="landing__background" aria-hidden="true" />
      <div className="landing__veil" aria-hidden="true" />

      <div className="landing__content">
        <nav className="nav" aria-label="Primary navigation">
          <div className="nav__inner">
            <a className="nav__brand" href="#search" aria-label="Statixel home">
              <img className="nav__logo" src="/statixel/brand/statixellogowhitetransparent.png" alt="" />
              <span className="nav__wordmark">Statixel</span>
            </a>

            <div className="nav__links">
              <a className="nav__link nav__link--active" href="#search">Search</a>
              <a className="nav__link" href="#news">News</a>
              <a className="nav__link" href="#about">About</a>
            </div>

            <div className="nav__account">
              <a className="nav__account-link" href="#login">Log In</a>
              <a className="nav__signup" href="#signup">Sign Up</a>
            </div>
          </div>
        </nav>

        <section className="hero" id="search" aria-labelledby="hero-title">
          <div className="hero__inner">
            <div className="hero__copy">
              <p className="hero__eyebrow">SkyBlock profile analysis</p>
              <h1 id="hero-title">Your SkyBlock profile, understood.</h1>
              <p className="hero__lead">
                Enter your Minecraft username to explore your profile, your progression,
                and everything you&apos;ve built along the way.
              </p>

              <ProfileSearchForm />

              <div className="feature-grid">
                {features.map((feature) => (
                  <article className={`feature-card feature-card--${feature.tone}`} key={feature.title}>
                    <div className="feature-card__icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">{feature.icon}</svg>
                    </div>
                    <h2>{feature.title}</h2>
                    <p>{feature.description}</p>
                  </article>
                ))}
              </div>

              <p className="hero__hint">Public profile data · Updated regularly</p>
              <a className="scroll-cue" href="#how-it-works"><span>Scroll to learn more</span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></a>
            </div>
          </div>
        </section>

        <section className="info-section" id="how-it-works" aria-labelledby="how-title">
          <div className="info-section__inner">
            <div className="section-card">
              <div className="section-card__header">
                <p className="section-kicker">How it works</p>
                <h2 id="how-title">Get from username to insight.</h2>
                <p className="section-card__description">
                  Statixel starts with your actual SkyBlock profile and turns that
                  information into something you can understand and use.
                </p>
              </div>
              <div className="section-flow" aria-hidden="true">
                <div className="section-flow__line" />
                <div className="section-flow__node"><span>01</span><b>Profile</b></div>
                <div className="section-flow__node"><span>02</span><b>Progress</b></div>
                <div className="section-flow__node"><span>03</span><b>Insight</b></div>
              </div>
              <div className="steps">
                {[
                  ["01", "Look up your profile", "Enter your Minecraft username and choose the SkyBlock profile you want to explore."],
                  ["02", "Explore your progress", "See your gear, skills, collections, activities, and progression in one place."],
                  ["03", "Find your next move", "When you're ready, use what Statixel knows about your profile to plan what's next."],
                ].map(([number, title, description]) => (
                  <article className="step" key={number}>
                    <div className="step__topline">
                      <span className="step__number">{number}</span>
                      <span className="step__connector" aria-hidden="true"><span /></span>
                    </div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="footer__inner">
            <div className="footer__brand">
              <a className="nav__brand" href="#search" aria-label="Statixel home">
                <img className="nav__logo" src="/statixel/brand/statixellogowhitetransparent.png" alt="" />
                <span className="nav__wordmark">Statixel</span>
              </a>
              <p>Understand your SkyBlock profile. Then decide where to go next.</p>
            </div>
            <div className="footer__links">
              <div>
                <span>Explore</span>
                <a href="#search">Search</a>
                <a href="#how-it-works">How it works</a>
              </div>
              <div>
                <span>Statixel</span>
                <a href="#news">News</a>
                <a href="#about">About</a>
              </div>
              <div>
                <span>Account</span>
                <a href="#login">Log In</a>
                <a href="#signup">Sign Up</a>
              </div>
            </div>
          </div>
          <div className="footer__bottom">
            <span>© {new Date().getFullYear()} Statixel</span>
            <span>Not affiliated with Hypixel Studios.</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
