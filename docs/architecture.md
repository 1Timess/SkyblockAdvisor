# Architecture

The original Word brief defines a new TypeScript profile platform, independent of the former HypixelProgressionEngine. The supplemental data contract supplies exact mappings/constants and takes precedence where it narrows Phase 1. This document summarizes the implemented architecture.

## Profile pipeline

1. Resolve a username or UUID to canonical identity.
2. Fetch Hypixel profiles and the static accessory catalog concurrently, with short-lived profile caching. The player client method is available but not requested until a used field needs it.
3. Select an explicit profile ID or cute name, otherwise the selected profile, otherwise the first profile.
4. Collect and decode inventories once using prismarine-nbt.
5. Process items once, preserving raw lore and ExtraAttributes internally.
6. Derive gear, accessories, pets, skills, slayers, dungeons, and economy.
7. Return one readable normalized profile, with informational warnings for partial data.

The viewer must remain useful without AI or market services. Unknown abilities and set bonuses remain text. Known stats can be displayed without understanding every mechanic.

## Stack and boundaries

Use Next.js App Router and TypeScript, Zod at source/API boundaries, prismarine-nbt 2.8.x, and a small in-memory TTL cache. Phase 2 adds file-backed reference and market snapshots; PostgreSQL remains deferred until persistence is needed. No Redis, queue, worker, ORM, or AI SDK is needed yet.

Server-only environment handling protects HYPIXEL_API_KEY. The Hypixel client owns HTTP, authentication, errors, and caching. The NBT decoder only decodes; item processors extract facts; domain builders assemble display data. None makes progression recommendations.

Internal ProcessedItem objects retain source, slot, raw/clean lore, ExtraAttributes, and parsed facts. Public ProfileItem objects expose readable facts, ability/set text, and source without raw NBT. Armor is displayed helmet, chestplate, leggings, boots. Weapons are discovered across processed owned inventories.

## Modules

- src/server/minecraft: identity resolution.
- src/server/hypixel: raw client, profile selection, resource access, and source types.
- src/server/cache: simple TTL cache.
- src/server/reference: narrowly scoped item, accessory, pet, and XP data lookups.
- src/server/skyblock/nbt and items: shared decoding and item processing.
- src/server/skyblock/profile and domains: orchestration and domain transformations.
- src/schemas: normalized public contracts.
- src/app/api/skyblock/profiles and profile: HTTP routes.
- src/server/reference/neu and item-catalog: validated NEU loading and the Hypixel/NEU catalog join.
- src/server/reference/requirements: high-confidence requirement parsing and profile checks.
- src/server/market: auction normalization, aggregation, snapshot persistence, and local batch lookup.
- src/server/candidates: capped armor, weapon, accessory, and pet lanes built from known profile/catalog/market facts.
- src/server/advisor: compact context construction, GPT-6 Luna Responses client, and post-response validation.
- scripts: profile, catalog, and market sync/inspection.

Pet leveling, XP tables, and accessory rules are local constants taken from the supplement. NEU is an optional local enrichment source: missing entries do not remove Hypixel items. Runtime schemas validate upstream responses, catalog entries, and snapshots; they are not a game-mechanics proof layer.

## Phase 2 reference and market flow

The catalog loads Hypixel's static item resource as the identity spine, then joins NEU item JSON by canonical item ID. NEU supplies lore, wiki links, and structured requirement hints. Lore parsing extracts display stats, abilities, set bonuses, and only requirement forms that can be identified with high confidence. Unrecognized requirement text is retained explicitly.

Auction ingestion is a batch operation. It reads every page from one Hypixel auction generation, rejects a mixed or incomplete generation, decodes each active BIN once, and groups listings by a stable market key. Generic items use canonical IDs; pets additionally use type and tier. The published JSON snapshot records its timestamps and counts. `MarketService` performs batch lookups only against that local file.

## API targets

- GET /api/skyblock/profiles?username=... returns identity and available profiles.
- GET /api/skyblock/profile?username=...&profile=... returns identity, selected profile, economy, gear, accessories, pets, progression, warnings, and metadata.

Cache identities for approximately 24 hours, profiles for 5 minutes, and static resources for 12 hours. Player data fetching is request-driven, without background polling.

## Phase 3 candidate flow

Candidate builders receive the normalized profile, static catalogs, and one already-loaded market snapshot. They filter wrong categories, exact owned duplicates where irrelevant, known unmet requirements, and known over-budget prices. Unknown prices and requirements remain candidates with warnings. Armor and weapon lanes rank only known requested stats; weapon ability candidates retain raw ability text. Accessory lanes use the existing missing/upgrade contract and known MP deltas. Pet lanes use NEU pet variants and explicit caller-supplied role types rather than inventing role assignments.

Each lane contains at most six entries. Each domain result deduplicates candidate IDs and contains at most twenty entries. The builders do not claim global optimality or interpret unmodeled mechanics.

## Phase 4 advisor flow

Deterministic code loads the profile, reference catalogs, and one market snapshot; applies the Phase 3 filters; and round-robins the domain lanes into at most 32 unique candidates. The compact context retains candidate IDs, prices, known stat changes, requirements, ability/set text, and uncertainty warnings while omitting duplicate full lore and internal source objects.

Luna receives this context through the OpenAI Responses API without tools or response storage. It owns judgment, order, tradeoffs, and explanation. Strict Structured Outputs constrain the response, then local validation enforces the Zod contract, contiguous ranks, and exact membership of every non-null candidate ID. Token usage and an estimated standard-processing cost are returned as metadata. There is no recommendation engine beneath the model and no advisor UI in this phase.

## Scope guardrails

No source/mechanic closure, certificates, pairwise dominance, comparison witnesses, provider-state proofs, or recommendation frontier. No Luna integration, UI polish, or database schema has been added. Any future reuse from the old repository must first identify the user-facing problem it solves.
