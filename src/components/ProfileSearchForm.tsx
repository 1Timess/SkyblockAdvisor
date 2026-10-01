"use client";

import { FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ProfileSearchForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const username = new FormData(form).get("username")?.toString().trim();
    if (!username || isPending) return;

    startTransition(() => {
      router.push(`/search?username=${encodeURIComponent(username)}`);
    });
  }

  return (
    <form
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
        disabled={isPending}
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
