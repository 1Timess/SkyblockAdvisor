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
2. Phase 5: further domains only from demonstrated demand.

## Phase 3 lightweight candidate lanes

Implemented armor and weapon stat lanes, raw-text weapon ability lanes, accessory missing/upgrade/coins-per-MP lanes, explicit accessory action opportunities, and owned/level/rarity/role pet lanes. Known hard requirements and quoted hard budgets are filters; unknown facts remain visible with warnings. Every lane is capped at six and every domain union at twenty, with exact-ID deduplication. No recommendation, proof, or global ranking layer was added.

## Phase 4 Luna advisor

Implemented a compact 32-candidate context, exact candidate-ID preservation, strict structured response schema, local response and ID validation, token/cost metadata, and an explicit live inspection path. Deterministic code owns data extraction and filtering. Luna owns goal interpretation, prioritization, ordering, tradeoffs, and explanation. No UI or secondary recommendation engine was added. Phase 4 stops after one successful validated live call.

## Phase 4.1 conversational routing and scoped context

Implemented deterministic question routing, optional in-memory conversation facts, compact domain availability metadata, and detailed candidate selection restricted to the active scope. The 32-candidate limit is now a ceiling for relevant scope candidates rather than an all-domain quota. Broad Dungeon progression loads armor and weapons; explicit Magical Power, pet, and armor-slot questions load only their matching details.

The advisor response contract now supports clarification and plan outcomes. Plans use semantic action types and structured follow-up domains. Profile parser warnings are compacted only at the advisor boundary. Duplicate pets remain in the normalized profile, while progression lanes use the best owned representative and detailed context removes no-op owned-pet entries. Deterministic inspection tooling exposes routing, availability, exact IDs, lane provenance, warning compaction, and pet diagnostics without calling OpenAI.

## Phase 4.2 goal relevance and prerequisite-aware progression

Added a small goal model independent of scope and a query-sensitive relevance pass over existing lanes. Explicit Intelligence, Speed, survivability, and individual-stat requests override inferred role. General progression uses the observed or conversation role only as fallback. Removed lanes do not trigger quota filling.

Advisor discovery retains relevant locked and over-budget candidates while other candidate-lane consumers keep the existing actionable-only behavior. Compact advisor candidates expose structured price and requirement feasibility. Luna instructions now state that candidates are possibilities, locked candidates may follow a progression step, saving may precede a purchase, and a hold-only plan is valid when no candidate justifies spending.

## Phase 4.3 progression frontier and context budget

Implemented a deterministic post-relevance context selector with four feasibility buckets, family-aware numeric-gap ordering, positive budget-distance ordering, structural redundancy keys, broad-gear bucket ceilings of 12/8/8/4, per-slot diversity, and a four-candidate aspirational reserve. The selector records a reason and small exclusion enum for every goal-relevant candidate. The full raw, relevant, and final sets are exposed by inspection tooling and captured in `docs/phase-4.3-f5-candidate-frontier.json`.

The selector allocates prompt space and does not recommend items. It preserves exact candidate IDs, does not compare unlike requirement families, does not use weighted scoring, and permits any final count from zero through 32. Luna receives the same compact facts plus one short instruction that the supplied frontier is representative rather than exhaustive. Phase 4.3 ends after deterministic validation, with no OpenAI call.

## Phase 4.4 raw candidate coverage investigation

Added a diagnostic-only trace from catalog metadata through slot/type pairing, advisor-mode preparation, uncapped lane qualification, top-six lane output, and raw advisor presence. It also records focused category coverage and successful controls. No catalog normalization, preparation rule, lane behavior, relevance filter, or frontier behavior changed.

The investigation found that the expected Necron armor and Midas weapon records are present, correctly typed under current repository rules, prepared successfully, and eligible before lane ranking. They disappear because the Phase 3 top-six lane cap is also acting as a raw-discovery cap. A future reviewed change should expose the qualifying pre-cap pool to the advisor while retaining capped Phase 3 presentation lanes. Effective comparisons involving reforges, stars, and semantic set/ability value remain outside the current fact model.

## Phase 4.5 decoupled advisor discovery

Implemented the Phase 4.4 recommendation as a separate discovery view on armor and weapon candidate results. Existing Phase 3 lane ordering and caps remain intact. Advisor context construction now consumes all prepared candidates with qualifying deterministic evidence, preserves exact IDs and merged lane evidence, then delegates scope, goal relevance, feasibility classification, and the final context budget to the existing Phase 4 pipeline.

Trace output distinguishes qualification, capped Phase 3 presence, advisor-discovery presence, raw scope, relevance, and frontier selection. `LANE_CAP` is now explicitly a Phase 3 presentation exclusion rather than an advisor exclusion. Regression tests cover below-rank-six discovery, exact-ID evidence merging across weapon baselines, and continued exclusion of owned, wrong-category, wrong-slot, and no-evidence candidates. No recommendation scoring, frontier threshold, UI, or Luna call was added.

## Phase 5 — profile intelligence and routing

- Build and cache one normalized profile snapshot with canonical and four domain payloads.
- Route Dungeon, accessory, fishing, and mining questions explicitly; clarify ambiguous requests.
- Retain server-owned conversation state so follow-ups reuse snapshot identity and budget.
- Send canonical facts, one routed domain payload, and that domain's candidate frontier.
- Preserve the existing Dungeon candidate pipeline and use bounded stat/category discovery for fishing and mining.

## Phase 5.1 — expanded profile normalization

- Add tolerant raw member contracts for mining, skill trees, foraging, accessories, fishing, attributes, shards, collections, player stats, Bestiary, and selected larger progression subsystems.
- Normalize dynamic node/counter maps without encoding node effects or other static game knowledge.
- Feed direct mining, fishing, and accessory player state into the existing Phase 5 domain payloads.
- Keep HOTM level null until a supported XP table is added in a derived layer.
