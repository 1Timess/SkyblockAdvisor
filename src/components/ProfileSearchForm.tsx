"use client";

import { FormEvent, useState } from "react";

export function ProfileSearchForm() {
  const [isPending, setIsPending] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const username = new FormData(form).get("username")?.toString().trim();
    if (!username || isPending) return;

    setIsPending(true);

    window.setTimeout(() => {
      window.location.assign(`/search?username=${encodeURIComponent(username)}`);
    }, 200);
  }

  return (
    <form
      action="/search"
      method="get"
      className={`search-card${isPending ? " search-card--loading" : ""}`}
      onSubmit={handleSubmit}
      aria-busy={isPending}
    >
      <span className="search-card__icon" aria-hidden="true">
        {isPending ? (
          <span className="search-card__spinner" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
        )}
      </span>
      <input
        className="search-card__input"
        name="username"
        type="text"
        placeholder={isPending ? "Looking up your profile..." : "Enter a Minecraft username..."}
        aria-label="Minecraft username"
        autoComplete="off"
        spellCheck={false}
        readOnly={isPending}
      />
      <button
        className="search-card__button"
        type="submit"
        aria-label={isPending ? "Looking up profile" : "Search profile"}
        disabled={isPending}
      >
        {isPending ? (
          <span className="search-card__button-spinner" aria-hidden="true" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        )}
      </button>
    </form>
  );
}
