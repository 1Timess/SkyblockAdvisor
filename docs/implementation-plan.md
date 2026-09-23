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

Exact offline and live HTTP results are recorded in validation.md. Final verification includes production startup, list/normalized routes, explicit profile selection, UUID input, invalid requests, and no live NBT decode failures.

## Phase 2 static catalog and local market snapshots

Implemented in this checkpoint:

1. Load and validate a local NEU item snapshot through a narrow repository.
2. Join NEU lore/reference metadata onto the Hypixel static item resource without requiring complete NEU coverage.
3. Extract candidate facts and preserve unknown requirement text.
4. Evaluate only high-confidence requirements supported by normalized profile facts.
5. Fetch one internally consistent Hypixel auction generation, normalize active BIN listings, and publish a compact local quote snapshot.
6. Serve single and batch market lookups from the snapshot with no per-candidate network requests.
7. Validate with offline fixtures plus real Hypixel item and auction data, then commit and stop.

## Remaining phases

1. Phase 1.5: profile viewer UI.
2. Phase 3: small deterministic candidate lanes.
3. Phase 4: Luna advisor consuming the normalized profile.
4. Phase 5: further domains only from demonstrated demand.
