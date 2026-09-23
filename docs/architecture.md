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

Use Next.js App Router and TypeScript, Zod at source/API boundaries, prismarine-nbt 2.8.x, and a small in-memory TTL cache. PostgreSQL is deferred until persistence is needed. No Redis, queue, worker, ORM, or AI SDK is needed for Phase 1.

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
- scripts: profile/inventory inspection.

Pet leveling, XP tables, and accessory rules are local constants taken from the supplement. An optional NEU subsystem was not needed. Runtime schemas validate upstream responses and the normalized result; they are not a game-mechanics proof layer.

## API targets

- GET /api/skyblock/profiles?username=... returns identity and available profiles.
- GET /api/skyblock/profile?username=...&profile=... returns identity, selected profile, economy, gear, accessories, pets, progression, warnings, and metadata.

Cache identities for approximately 24 hours, profiles for 5 minutes, and static resources for 12 hours. Player data fetching is request-driven, without background polling.

## Scope guardrails

No source/mechanic closure, certificates, pairwise dominance, comparison witnesses, provider-state proofs, or recommendation frontier. No market ingestion, Luna integration, UI polish, or database schema in the first milestone. Any future reuse from the old repository must first identify the user-facing problem it solves.
