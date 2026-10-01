const steps = [
  ["01", "Look up your profile", "Enter your Minecraft username and choose the SkyBlock profile you want to explore."],
  ["02", "Explore your progress", "See your gear, skills, collections, activities, and progression in one place."],
  ["03", "Find your next move", "When you're ready, use what Statixel knows about your profile to plan what's next."],
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
              <img className="nav__logo" src="/statixel/brand/statixellogowhitetransparent.png" alt="Statixel" />
            </a>
            <div className="nav__links">
              <a className="nav__link" href="#search">Search</a>
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
              <p className="hero__lead">Enter your Minecraft username to explore your profile, your progression, and everything you've built along the way.</p>
              <form className="search-card" action="/search" method="get">
                <input className="search-card__input" name="username" type="text" placeholder="Enter your Minecraft username" aria-label="Minecraft username" autoComplete="off" spellCheck={false} />
                <button className="search-card__button" type="submit">Search</button>
              </form>
              <p className="hero__hint">Public profile data · Updated regularly</p>
              <a className="scroll-cue" href="#how-it-works">Learn how it works</a>
            </div>
          </div>
        </section>

        <section className="info-section" id="how-it-works" aria-labelledby="how-title">
          <div className="info-section__inner">
            <div className="section-card">
              <div className="section-card__header">
                <p className="section-kicker">How it works</p>
                <h2 id="how-title">Get from username to insight.</h2>
                <p className="section-card__description">Statixel starts with your actual SkyBlock profile and turns that information into something you can understand and use.</p>
              </div>
              <div className="steps">
                {steps.map(([number, title, description]) => (
                  <article className="step" key={number}>
                    <span className="step__number">{number}</span>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </article>
                ))}
              </div>
              <div className="trust-row" aria-label="Statixel features">
                <span className="trust-pill">Real profile data</span>
                <span className="trust-pill">Game knowledge</span>
                <span className="trust-pill">Updated regularly</span>
                <span className="trust-pill">Built for SkyBlock players</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
