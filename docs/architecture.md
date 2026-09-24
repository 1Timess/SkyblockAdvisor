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

## Phase 4 and 4.1 advisor flow

Deterministic code loads the profile, reference catalogs, and one market snapshot, then routes the user question into a small analysis scope. Explicit accessory, pet, armor, weapon, combat-role, damage, and survivability language selects matching domains and lanes. Dungeon progression language selects gear. Conversation state can retain a role, goal, active scopes, and budget without persistence. A broad question may use the selected Dungeon class or request clarification.

The 32-item limit applies only to detailed candidates within that active scope. The selector neither reserves slots for unrelated domains nor fills unused capacity. Gear uses armor and weapons; accessory and pet details remain unloaded unless selected. Specific armor-slot questions load only that slot. `availableAnalysis` separately summarizes candidate counts, Magical Power, accessory gaps, and owned pets so other domains remain discoverable without their detailed candidates.

The compact context retains exact candidate IDs, prices, known changes, requirements, ability/set text, and candidate warnings while omitting duplicate full lore and internal source objects. Account context contains economy, progression, current gear, active pet, and Magical Power. Repeated parser diagnostics are reduced to one aggregate warning. Pet progression uses the best owned representative by rarity and then level, and no-op owned-pet state does not consume detailed capacity.

Luna receives this context through the OpenAI Responses API without tools or response storage. It owns judgment, order, tradeoffs, and explanation. Strict Structured Outputs allow either `CLARIFICATION` or `PLAN`. Plan actions carry `BUY`, `PROGRESSION`, `HOLD`, or `INVESTIGATE` semantics and structured follow-up domains. Local validation enforces the Zod contract, contiguous ranks, action-specific candidate rules, and exact membership of every non-null candidate ID. There is no recommendation engine beneath the model and no advisor UI in this phase.

## Phase 4.2 goal relevance and feasibility

Scope determines which domains are loaded; a separate small goal enum determines which existing stat and ability lanes are relevant. Explicit current goals outrank conversation state and inferred class. General questions use the conversation role or selected Dungeon class as a fallback. Relevance removes candidates that appear only in unrelated lanes before the existing stable 32-item selector runs. It never replenishes removed entries, so fewer than 32 is valid.

Candidate preparation now has an explicit policy. Existing callers default to `ACTIONABLE_ONLY`, preserving the prior hard filters. The advisor uses `ADVISOR_DISCOVERY`, which retains goal-relevant candidates that are over budget or requirement-locked. Compact candidates carry price status, signed budget delta, overall requirement status, and individual parsed requirement gaps with current, required, and gap values. Unsupported and unparsed requirement families remain `UNKNOWN`. Deterministic code does not decide whether a gap is close enough; Luna may sequence progression or saving before a buy, or recommend holding resources.

## Phase 4.3 progression frontier

After goal relevance, every candidate receives descriptive feasibility and one context-selection bucket: `ACTIONABLE`, `MONEY_GATED`, `PROGRESSION_GATED`, or `DISTANT_OR_UNCERTAIN`. Broad `GEAR` / `GENERAL_UPGRADE` analysis uses soft representation ceilings of 12, 8, 8, and 4 respectively, with 32 as a hard ceiling rather than a target. Ordering is lexicographic: known requirement state, real numeric gaps within the same requirement family, positive budget distance, relevant evidence count, then stable lane order and ID. There is no weighted utility score and no comparison across unlike requirement units.

Structural keys use domain, armor slot or weapon category, relevant evidence, and bucket. Broad gear permits at most three candidates per armor slot and one distant armor representative per slot. A repeated distant structural key is capped at one; non-distant armor and weapon keys are capped at three and two. Narrow accessory and pet queries retain their domain behavior, while focused armor and stat queries still remove obvious distant repetition. Selection metadata and exclusion reasons stay diagnostic and are not added to Luna's compact payload.

The full raw scope, goal-relevant universe, and final frontier remain inspectable. Feasibility changes scarce-context priority only; it does not invalidate locked, over-budget, unknown, or distant candidates. Luna is explicitly told that the shortlist is representative and remains responsible for whether any supplied option is worthwhile.

## Phase 4.5 advisor discovery

Armor and weapon builders expose two views over the same prepared candidates. The existing Phase 3 lanes keep their top-six per-lane and total presentation caps. A separate advisor-discovery view retains every candidate that has qualifying deterministic stat or ability evidence before those presentation caps. Wrong slot or weapon type, exact owned IDs, and candidates without qualifying evidence remain excluded. Locked and over-budget candidates remain available under the existing advisor discovery preparation policy.

The advisor composes raw scope from the uncapped discovery lanes, deduplicates only exact candidate IDs, preserves all contributing lane provenance and evidence, and then applies the existing scope, goal-relevance, feasibility, and Phase 4.3 frontier stages. The frontier implementation and its 32-candidate ceiling are unchanged. Phase 3 consumers continue to receive the capped lanes.

## Scope guardrails

No source/mechanic closure, certificates, pairwise dominance, comparison witnesses, provider-state proofs, deterministic recommendation rank, advisor UI, or database schema has been added. Any future reuse from the old repository must first identify the user-facing problem it solves.

## Phase 5 profile intelligence

The advisor performs one normalized profile load and stores the normalized profile plus derived canonical and domain payloads in a five-minute in-memory cache. The versioned snapshot key combines player UUID, profile ID, and source update or fetch time; a username/profile alias points to that version. Session state carries the snapshot ID, budget, explicit role, current/previous domain, and current/previous goal.

Every advisor request contains a canonical payload (identity, economy, skills, slayers, basic Dungeon progress, and Magical Power) plus at most one payload for DUNGEONS, ACCESSORIES, FISHING, or MINING. Candidate discovery follows the routed domain. Dungeon routing retains the Phase 4.5 armor/weapon discovery, relevance, feasibility, and frontier path. Fishing and mining discovery only uses item categories and parsed domain stats already supported by the repository.
