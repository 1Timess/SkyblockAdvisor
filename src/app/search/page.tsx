import Link from "next/link";
import { listProfiles } from "@/server/skyblock/profile/build-normalized-profile";
import { AppError } from "@/server/errors";
import { getProfileIconPath } from "@/lib/profile-icons";

type SearchPageProps = { searchParams: Promise<{ username?: string }> };

function SiteNav() {
  return (
    <nav className="profile-nav">
      <Link className="nav__brand" href="/#search" aria-label="Statixel home">
        <img className="nav__logo" src="/statixel/brand/statixellogowhitetransparent.png" alt="" />
        <span className="nav__wordmark">Statixel</span>
      </Link>
      <div className="profile-nav__links">
        <Link href="/#search">Search</Link>
        <Link href="/#news">News</Link>
        <Link href="/#about">About</Link>
      </div>
      <div className="profile-nav__account">
        <Link href="/#login">Log In</Link>
        <Link className="profile-nav__signup" href="/#signup">Sign Up</Link>
      </div>
    </nav>
  );
}

function SearchShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="search-page">
      <SiteNav />
      <div className="search-page__background" aria-hidden="true" />
      <div className="search-page__veil" aria-hidden="true" />
      {children}
    </main>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const username = params.username?.trim() ?? "";

  if (!username) {
    return (
      <SearchShell>
        <section className="search-page__panel">
          <p className="section-kicker">Profile search</p>
          <h1>Search a SkyBlock profile.</h1>
          <p>Enter a Minecraft username to get started. No Statixel account is required.</p>
          <Link className="search-page__button" href="/#search">Back to search</Link>
        </section>
      </SearchShell>
    );
  }

  try {
    const result = await listProfiles(username);
    return (
      <SearchShell>
        <section className="search-page__content">
          <div className="search-page__heading">
            <div>
              <p className="section-kicker">Profile search</p>
              <h1>Choose a profile for {result.identity.username}.</h1>
              <p>Select the SkyBlock profile you want to explore. Your profile lookup is available without an account.</p>
            </div>
            <Link className="search-page__back" href="/#search">New search</Link>
          </div>
          <div className="profile-choice-grid">
            {result.profiles.map((profile) => {
              const icon = getProfileIconPath(profile.cuteName);
              return (
                <Link className="profile-choice" href={{ pathname: "/profile", query: { username: result.identity.username, profile: profile.id } }} key={profile.id}>
                  <div className="profile-choice__top">
                    <div className="profile-choice__identity">
                      {icon ? <img className="profile-choice__icon" src={icon} alt="" /> : null}
                      <span className="profile-choice__name">{profile.cuteName}</span>
                    </div>
                    {profile.selected ? <span className="profile-choice__selected">Selected</span> : null}
                  </div>
                  <span className="profile-choice__mode">{profile.gameMode ?? "Standard"}</span>
                  <span className="profile-choice__action">View profile <span aria-hidden="true">→</span></span>
                </Link>
              );
            })}
          </div>
        </section>
      </SearchShell>
    );
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Unable to look up that Minecraft profile right now.";
    return (
      <SearchShell>
        <section className="search-page__panel search-page__panel--error">
          <p className="section-kicker">Profile search</p>
          <h1>We couldn't find that profile.</h1>
          <p>{message}</p>
          <Link className="search-page__button" href="/#search">Try another username</Link>
        </section>
      </SearchShell>
    );
  }
}
