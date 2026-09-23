# Implementation checkpoints

The original brief supplies the product plan. The supplemental data contract resolves the original missing inputs and explicitly permits synthetic offline NBT tests, embedded pet leveling constants, and optional NEU enrichment.

## Phase 0 bootstrap

Next.js App Router, TypeScript, ESLint, Zod, prismarine-nbt, tsx, and server-only environment handling are implemented. Package versions are locked. A minimal landing page is included for startup verification. No persistence is needed, so pg and database infrastructure are deferred.

## Identity and profiles

Official Mojang identity lookups, Hypixel client, TTL caching, profile summaries, explicit ID/cute-name selection, and selected/first fallbacks are implemented. Only the requested member is used. Client errors do not expose keys or stack traces.

## NBT and items

Inventories are collected, decoded, and processed once. Raw attributes and formatted lore stay internal; public items include readable lore, recognized stats, ability/set text, and provenance. Gear derives from the shared processed collection. Weapons include backpack contents. Synthetic offline fixtures cover decoding, empty slots, malformed blobs, parsing, ordering, and totals.

## Combined profile

Both API routes, the combined builder, owned accessories/MP and catalog lists, pet leveling, skill levels, Slayers, dungeons, and economy are implemented. Domain tests and schema checks use offline fixtures. The iTimess service check decoded real inventories successfully.

## Final Phase 1 validation

Exact offline and live HTTP results are recorded in validation.md. Final verification includes production startup, list/normalized routes, explicit profile selection, UUID input, invalid requests, and no live NBT decode failures. Commit the validated checkpoint and STOP.

## Later phases require a new prompt

1. Phase 1.5: profile viewer UI.
2. Phase 2: static candidate catalog and local market snapshots.
3. Phase 3: small deterministic candidate lanes.
4. Phase 4: Luna advisor consuming the normalized profile.
5. Phase 5: further domains only from demonstrated demand.
