# Implementation plan

Status: planning baseline; no application code or validation is complete.

## Required inputs before implementation

Resolve the missing inputs in data-sources.md. Sections 17 and 18 of the brief require stopping when necessary external behavior or reference tables are absent. Do not fill those gaps through external research or guessed formulas.

## Phase 0 bootstrap checkpoint

Create the Next.js App Router TypeScript foundation in this repository. Add Zod, prismarine-nbt, and tsx; defer database infrastructure. Add server-only environment validation, basic scripts, and the initial module structure. Verify the app starts and lint/typecheck pass. Commit and report the checkpoint.

## Phase 1 identity and profiles checkpoint

Implement identity resolution, the Hypixel client, TTL caching, profile summaries, and selection by explicit ID/cute name or selected/first fallback. Expose the profiles route. Test identity and selection offline, then verify arbitrary username behavior with configured credentials. Commit and report the checkpoint.

## Phase 1 NBT and item checkpoint

Decode a supplied real inventory fixture. Process ID, UUID, names, raw/clean lore, rarity, categories, known stats, reforge, enchantments, stars, recombobulation, count, source, and slot. Preserve unknown lore. Verify the real fixture, malformed inventory isolation, item parsing, armor order, and stat totals. Commit and report the checkpoint.

## Phase 1 combined profile checkpoint

Build gear, accessories/MP, owned pets, skills, slayers, dungeons, and economy using supplied source mappings and reference tables. Decode/process once and share the results. Return warnings for partial sections. Expose the normalized profile endpoint and an inspect-profile script. Validate domain transformations and the public response against offline fixtures. Commit and report the checkpoint.

## Phase 1 final validation checkpoint

Verify arbitrary usernames and profile selection, real NBT decoding, all required domain sections, retained unknown lore, offline tests, lint, typecheck, and application build. Update architecture and data-source documentation. Report exact commands, results, changed files, and remaining limitations. Commit and STOP; recommendations require a new prompt.

## Later phases from the brief

1. Phase 1.5: profile viewer UI.
2. Phase 2: static candidate catalog and local market snapshots.
3. Phase 3: small deterministic candidate lanes.
4. Phase 4: Luna advisor consuming the normalized profile.
5. Phase 5: further domains only from demonstrated demand.
