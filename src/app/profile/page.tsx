import Link from "next/link";
import { buildNormalizedProfile } from "@/server/skyblock/profile/build-normalized-profile";
import { AppError } from "@/server/errors";

type ProfilePageProps = { searchParams: Promise<{ username?: string; profile?: string }> };

function formatCoins(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const username = params.username?.trim() ?? "";
  const profile = params.profile?.trim() || undefined;

  if (!username) {
    return (
      <main className="profile-page">
        <div className="search-page__background" aria-hidden="true" />
        <div className="search-page__veil" aria-hidden="true" />
        <section className="search-page__panel">
          <p className="section-kicker">SkyBlock profile</p>
          <h1>No profile selected.</h1>
          <p>Search for a Minecraft username first.</p>
          <Link className="search-page__button" href="/#search">Search a profile</Link>
        </section>
      </main>
    );
  }

  try {
    const result = await buildNormalizedProfile({ usernameOrUuid: username, requestedProfile: profile });
    return (
      <main className="profile-page">
        <div className="search-page__background" aria-hidden="true" />
        <div className="search-page__veil" aria-hidden="true" />
        <nav className="profile-nav">
          <Link className="nav__brand" href="/#search" aria-label="Statixel home">
            <img className="nav__logo" src="/statixel/brand/statixellogowhitetransparent.png" alt="" />
            <span className="nav__wordmark">Statixel</span>
          </Link>
          <Link className="profile-nav__search" href="/#search">Search another profile</Link>
        </nav>
        <section className="profile-content">
          <header className="profile-header">
            <div>
              <p className="section-kicker">SkyBlock profile</p>
              <h1>{result.identity.username}</h1>
              <p>{result.profile.cuteName}{result.profile.gameMode ? " · " + result.profile.gameMode : ""}</p>
            </div>
            <div className="profile-header__actions">
              <Link className="profile-header__advisor" href="/#signup">Ask Vera</Link>
            </div>
          </header>
          <div className="profile-switcher">
            {result.profile.availableProfiles.map((item) => (
              <Link className={item.id === result.profile.id ? "profile-switcher__item profile-switcher__item--active" : "profile-switcher__item"} href={{ pathname: "/profile", query: { username: result.identity.username, profile: item.id } }} key={item.id}>
                {item.cuteName}
              </Link>
            ))}
          </div>
          <div className="profile-summary-grid">
            <article className="profile-summary-card">
              <span>Purse</span>
              <strong>{formatCoins(result.economy.purse)}</strong>
              <p>Profile economy data is available without a Statixel account.</p>
            </article>
            <article className="profile-summary-card">
              <span>Skills</span>
              <strong>{Object.keys(result.progression.skills).length} tracked</strong>
              <p>Skill progression and levels are available for exploration.</p>
            </article>
            <article className="profile-summary-card">
              <span>Gear</span>
              <strong>{result.gear.weapons.length + result.gear.armor.items.length} items</strong>
              <p>Gear, loadouts, equipment, and inventory data are available here.</p>
            </article>
          </div>
          <section className="profile-advisor-card">
            <div>
              <p className="section-kicker">Statixel Advisor</p>
              <h2>Your profile is ready for deeper analysis.</h2>
              <p>Profile exploration is free. Vera's personalized AI advisor requires a Statixel account.</p>
            </div>
            <Link className="profile-header__advisor" href="/advisor">Continue with Vera</Link>
          </section>
        </section>
      </main>
    );
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Unable to load this SkyBlock profile right now.";
    return (
      <main className="profile-page">
        <div className="search-page__background" aria-hidden="true" />
        <div className="search-page__veil" aria-hidden="true" />
        <section className="search-page__panel search-page__panel--error">
          <p className="section-kicker">SkyBlock profile</p>
          <h1>We couldn't load this profile.</h1>
          <p>{message}</p>
          <Link className="search-page__button" href="/#search">Back to search</Link>
        </section>
      </main>
    );
  }
}
