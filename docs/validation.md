# Validation record

Validated September 23, 2026 with Node.js 24.11.0, npm 11.6.1, Next.js 16.3.5, and React 19.2.8. Both supplied Word documents were read; supplemental contracts take precedence.

## Commands and results

| Command | Result |
| --- | --- |
| `npm install --prefer-offline --maxsockets=2` | Installed locked dependencies after interrupted registry downloads; used locally cached Next/React versions |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 26 offline tests passed; no live network/credentials used |
| `npm run build` | Production build passed, including TypeScript and route generation |
| `npm run inspect:profile -- iTimess` | Live normalized service passed; real inventories decoded |
| `npm run start -- --hostname 127.0.0.1 --port 3017` | Production server started successfully |
| `npm run validate:live -- iTimess http://127.0.0.1:3017` | HTTP validation passed |

Node/esbuild/Next subprocess execution and live requests required running outside the restricted sandbox. Initial sandbox test/build attempts reported spawn EPERM; the approved reruns passed. Initial latest-package downloads reset repeatedly; the final installed versions are recorded in package-lock.json.

## Checkpoint coverage and files

| Checkpoint | Files | What was verified |
| --- | --- | --- |
| Bootstrap | package/config files, app layout/page, server env | Startup, lint, typecheck, production build |
| Identity/profile | server/minecraft, hypixel, cache, http/errors; identity-profile tests | Username/UUID, error handling, TTL, explicit/selected/first selection |
| NBT/item | schemas/items, skyblock/nbt, items, gear, inventory-sources; item fixtures/tests | Compressed/uncompressed NBT, slot preservation, malformed source isolation, raw lore retention, public output, armor ordering/totals |
| Combined profile | remaining schemas, reference constants, domain builders, routes; accessory/progression/profile tests | Required domains, partial data, accessory rules, pet/skill/dungeon/Slayer levels, schema validation |
| Final Phase 1 | inspect-profile and validate-live scripts; documentation | Real NBT, production HTTP routes, explicit selectors, UUID lookup, 400 and 404 behavior |

Dependency installation interruptions and the usage interruption delayed checkpoint commits; the validated implementation is saved in separate bootstrap, identity, NBT, and combined-profile commits. No previous-engine source was copied.

## Live snapshot

The owner selected iTimess for validation. The selected profile was Lemon; the list also contained Tomato.

| Section | Result |
| --- | --- |
| Armor | 4 pieces |
| Equipment | 4 pieces |
| Weapons | 4 |
| Owned accessories | 68 |
| Magical Power | 433 under supplied rules |
| Pets | 15 |
| Skills | 12 |
| Slayers | 6 |
| Catacombs | Level 21 |
| Missing accessory catalog entries | 203 |
| Accessory upgrade entries | 41 |

The response contained 82 unknown-stat warnings and 79 unknown-category warnings. These represent unsupported lore labels and categories; they do not fail normalization. There were no inventory-decode, missing-reference, disabled-API, or partial-profile warnings for this live check. No raw player dump or credential was committed.

The first live source validation found a null optional pet UUID. The source schema now accepts null identifiers, consistent with the normalized nullable UUID contract, and an offline regression test covers it.

## Limits and stop point

This validates the supplied Phase 1 behavior, not complete SkyBlock mechanics or parity with SkyCrypt. Known stat totals are item-lore sums. Unknown lore remains available. Pet ability/stat enrichment and optional rank/Abiphone adjustments remain deferred. In-memory caches are per process and reset on restart.

No UI beyond the startup page, advisor calls, database infrastructure, or proof systems were added. Phase 1 is complete.

## Phase 2 validation

Validated September 23, 2026 against the supplied project documents and data-contract supplement.

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 34 tests passed, including 8 Phase 2 catalog/market tests |
| `npm run inspect:catalog -- ASPECT_OF_THE_END SHADOW_ASSASSIN_CHESTPLATE WOLF_TALISMAN` | Loaded 5,655 Hypixel items; enriched 5,053 from NEU; retained 602 without NEU; zero NEU parse failures |
| `npm run sync:auctions` | Read one consistent 44-page generation with 43,125 auctions; accepted 39,517 active BIN listings; published 2,532 quotes |
| `npm run inspect:market -- ASPECT_OF_THE_END SHADOW_ASSASSIN_CHESTPLATE PET:ENDER_DRAGON:LEGENDARY` | All three keys resolved from the local snapshot with high-confidence median-lowest-five quotes |

The catalog check used the existing local NEU snapshot and the official Hypixel item resource. Shadow Assassin Chestplate produced a Catacombs Floor V requirement. The market sync completed in about 10.5 seconds. Its generated JSON is ignored and contains aggregate public auction data, so no credential or raw player profile is committed.

Phase 2 stops at validated facts and local quotes. It does not generate candidates, recommendations, proof certificates, or advisor output.

## Phase 3 validation

Phase 3 adds offline coverage for armor, weapon, accessory, and pet lanes. The tests exercise category matching, ownership, known requirements, hard budgets, unknown-fact retention, known-stat improvements, MP gains, coins per MP, explicit accessory opportunities, NEU pet variants, raw ability text, and fixed caps/deduplication.

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 45 tests passed |
| `npm run inspect:candidates -- iTimess Lemon 30000000` | Produced capped lanes for four armor slots, four owned weapons, accessories, and pets using the local auction snapshot and NEU data |

The live inspection used snapshot `auction-1790175720881`. Armor and weapon stat/ability lanes, six missing accessories, six rarity upgrades, six coins-per-MP entries, one explicit enrichment opportunity, six owned pets, six pet leveling targets, and six pet rarity upgrades were returned where data supported them. It prints candidate IDs/counts only and does not save a player response.

## Phase 4 validation

Validated September 23, 2026 with the authorized `iTimess` Lemon profile and the question: “I just cleared F5 and have 30m coins. What should I upgrade next?”

| Check | Result |
| --- | --- |
| Offline suite | 50 tests passed before the live call |
| Context | 32 unique candidates selected across armor, weapon, accessory, and pet lanes |
| Model/API | `gpt-6-luna` through `POST /v1/responses`, no tools, `store: false`, strict JSON Schema output |
| Validation | Zod response accepted; action ranks contiguous; every non-null candidate ID belonged to the supplied context |
| Usage | 8,669 input tokens; 2,047 output tokens; 10,716 total; estimated standard-processing cost $0.0018904 at the documented rates used by the client |

Luna returned three ordered actions. It first asked the player to reconcile the question's F5 claim with the profile's recorded Floor VI completion, then referenced the supplied `FLOWER_OF_TRUTH` ID as a possible room-clearing complement after its stated prerequisite, and finally recommended retaining the rest of the budget because the shortlist did not justify another purchase. It distinguished room clearing from single-target performance, repeated the snapshot-price caveat, and did not return any unknown candidate ID.

The first local attempt stopped before an OpenAI request because the configured credential used the standard `OPENAI_API_KEY` name while the initial loader expected `OPENAI_API_TOKEN`. The loader now accepts either server-only name. Exactly one real Luna request was made and accepted. Phase 4 stops here; no advisor UI or further recommendation layer was added.

## Phase 4.1 deterministic routing validation

Validated September 23, 2026 against the authorized `iTimess` Lemon profile with a 30,000,000-coin hard budget. No OpenAI request was made. The profile exposed 78 armor, 38 weapon, 14 accessory, and 11 meaningful pet candidates before active-scope selection. Accessory metadata reported 433 Magical Power, 203 missing entries, and 41 upgrades; pet metadata reported 15 owned pets.

| Question | Scope | Clarification | Detailed count and domains |
| --- | --- | --- | --- |
| `I just cleared F5 and have 30m coins. What should I upgrade next?` | GEAR | No | 32: 22 armor, 10 weapon |
| `How should I increase my Magical Power?` | ACCESSORIES | No | 14 accessory |
| `What pet should I get?` | PETS | No | 11 pet |
| `What helmet should I get?` | ARMOR, helmet slot | No | 18 armor |

The F5 context contained no detailed accessories or pets; both remained discoverable through `availableAnalysis`. Its exact candidate IDs were:

`PERFECT_HELMET_13`, `TERROR_HELMET`, `WITHER_GOGGLES`, `RACING_HELMET`, `PERFECT_CHESTPLATE_13`, `BERSERKER_CHESTPLATE`, `FANCY_TUXEDO_CHESTPLATE`, `AURORA_CHESTPLATE`, `GLOSSY_MINERAL_CHESTPLATE`, `PERFECT_LEGGINGS_13`, `BERSERKER_LEGGINGS`, `AURORA_LEGGINGS`, `YOUNG_DRAGON_LEGGINGS`, `PERFECT_BOOTS_13`, `ELEGANT_TUXEDO_BOOTS`, `AURORA_BOOTS`, `RANCHERS_BOOTS`, `GIANTS_EYE_SWORD`, `FLOWER_OF_TRUTH`, `STARRED_BAT_WAND`, `ZOMBIE_SOLDIER_CUTLASS`, `GIANT_CLEAVER`, `STARRED_SPIDER_QUEENS_STINGER`, `STARRED_LAST_BREATH`, `DRAGON_SHORTBOW`, `CRYPT_BOW`, `STARRED_BONE_BOOMERANG`, `PERFECT_HELMET_12`, `AURORA_HELMET`, `GLOSSY_MINERAL_HELMET`, `PERFECT_CHESTPLATE_12`, `MYTHOS_CHESTPLATE`.

The live profile had 160 normalization warnings: 82 unknown stat labels and 78 unknown item categories. Advisor context reduced these to one aggregate warning. It detected 15 owned pets across nine types, including a level-100 Rabbit; the lower-level duplicate did not generate a Rabbit level target. Offline coverage includes routing isolation, no quota filling, the 32 cap, duplicate-pet selection, no-op pet removal, warning compaction, clarification/plan validation, semantic action rules, and constrained follow-up domains.
