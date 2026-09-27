/** Whitelisted profile evidence for Slayer source research; never serializes arbitrary raw values. */
export function inspectRawSlayer(value: unknown) {
  const object = (input: unknown): Record<string, unknown> | null =>
    input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : null;
  const slayer = object(value);
  const bosses = object(slayer?.slayer_bosses);
  return {
    sectionPresent: slayer !== null,
    sectionKeys: slayer ? Object.keys(slayer).sort() : [],
    families: Object.fromEntries(Object.entries(bosses ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([id, raw]) => {
      const boss = object(raw);
      return [id, { keys: boss ? Object.keys(boss).sort() : [],
        xp: typeof boss?.xp === "number" && Number.isFinite(boss.xp) ? boss.xp : null,
        killsByRawTier: Object.fromEntries(Object.entries(boss ?? {}).filter(([key, count]) =>
          /^boss_kills_tier_\d+$/.test(key) && typeof count === "number" && Number.isFinite(count))),
        nestedFieldKeys: Object.fromEntries(Object.entries(boss ?? {}).filter(([, field]) => object(field) !== null)
          .map(([key, field]) => [key, Object.keys(object(field)!).sort()])),
      }];
    })),
  };
}
