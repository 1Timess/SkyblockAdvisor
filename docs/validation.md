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

## Phase 4.2 deterministic validation

Phase 4.2 separates goal relevance from feasibility. All 66 offline tests passed. Coverage includes explicit-goal precedence, query-sensitive single-stat candidates, no quota replenishment, locked nearby and distant candidates, signed budget gaps, mixed and unknown requirements, prerequisite-first plans, hold-only plans, duplicate pets, and warning compaction. Typecheck, lint, and the production build also passed.

| Question | Route / goal / inferred role | Raw scope | Goal-relevant | Final |
| --- | --- | ---: | ---: | ---: |
| F5 / 30m upgrade | GEAR / GENERAL_UPGRADE / berserk | 152 | 63 | 32 |
| Intelligence for AOTE teleporting | MAGE / INTELLIGENCE / berserk | 38 | 31 | 31 |
| Get much faster | GEAR / SPEED / berserk | 152 | 24 | 24 |

The F5 final IDs are:

`INFERNAL_CRIMSON_HELMET`, `INFERNAL_TERROR_HELMET`, `INFERNAL_CRIMSON_CHESTPLATE`, `INFERNAL_TERROR_CHESTPLATE`, `INFERNAL_CRIMSON_LEGGINGS`, `INFERNAL_TERROR_LEGGINGS`, `INFERNAL_CRIMSON_BOOTS`, `INFERNAL_TERROR_BOOTS`, `TORMENTOR`, `BOUQUET_OF_LIES`, `ZOMBIE_SOLDIER_CUTLASS`, `STARRED_BAT_WAND`, `STARRED_FELTHORN_REAPER`, `FIERY_CRIMSON_HELMET`, `FIERY_TERROR_HELMET`, `BERSERKER_CHESTPLATE`, `ELEGANT_TUXEDO_CHESTPLATE`, `FIERY_CRIMSON_LEGGINGS`, `FIERY_TERROR_LEGGINGS`, `FIERY_CRIMSON_BOOTS`, `FIERY_TERROR_BOOTS`, `DARK_CLAYMORE`, `FLOWER_OF_TRUTH`, `ATOMSPLIT_KATANA`, `GIANT_CLEAVER`, `HEARTFIRE_DAGGER`, `BURNING_TERROR_HELMET`, `FIERY_CRIMSON_CHESTPLATE`, `FIERY_TERROR_CHESTPLATE`, `BERSERKER_LEGGINGS`, `BURNING_TERROR_LEGGINGS`, `BURNING_CRIMSON_BOOTS`.

The Intelligence final IDs are:

`INFERNAL_AURORA_HELMET`, `INFERNAL_AURORA_CHESTPLATE`, `INFERNAL_AURORA_LEGGINGS`, `INFERNAL_AURORA_BOOTS`, `HYPERION`, `CRYPT_BOW`, `FIERY_AURORA_HELMET`, `FIERY_AURORA_CHESTPLATE`, `FIERY_AURORA_LEGGINGS`, `FIERY_AURORA_BOOTS`, `STARRED_BAT_WAND`, `BURNING_AURORA_HELMET`, `ELEGANT_TUXEDO_CHESTPLATE`, `BURNING_AURORA_LEGGINGS`, `BURNING_AURORA_BOOTS`, `ATOMSPLIT_KATANA`, `WISE_WITHER_HELMET`, `BURNING_AURORA_CHESTPLATE`, `REAPER_LEGGINGS`, `REAPER_BOOTS`, `BAT_WAND`, `HOT_AURORA_HELMET`, `REAPER_CHESTPLATE`, `WISE_WITHER_LEGGINGS`, `WISE_WITHER_BOOTS`, `FIRE_FURY_STAFF`, `INFERNAL_HOLLOW_HELMET`, `WISE_WITHER_CHESTPLATE`, `HOT_AURORA_LEGGINGS`, `HOT_AURORA_BOOTS`, `PIGMAN_SWORD`.

The Speed final IDs are:

`RACING_HELMET`, `INFERNAL_TERROR_CHESTPLATE`, `INFERNAL_TERROR_LEGGINGS`, `RANCHERS_BOOTS`, `INFERNAL_TERROR_HELMET`, `SPEED_WITHER_CHESTPLATE`, `SPEED_WITHER_LEGGINGS`, `FARMER_BOOTS`, `SPEED_WITHER_HELMET`, `GLOSSY_MINERAL_CHESTPLATE`, `GLOSSY_MINERAL_LEGGINGS`, `STARRED_THORNS_BOOTS`, `STARRED_SPIRIT_MASK`, `THERMODYNAMIC_CHESTPLATE`, `THERMODYNAMIC_LEGGINGS`, `INFERNAL_TERROR_BOOTS`, `THERMODYNAMIC_HELMET`, `FIERY_TERROR_CHESTPLATE`, `FIERY_TERROR_LEGGINGS`, `SPEED_WITHER_BOOTS`, `FIERY_TERROR_HELMET`, `YOUNG_DRAGON_CHESTPLATE`, `YOUNG_DRAGON_LEGGINGS`, `THERMODYNAMIC_BOOTS`.

In the generic F5 context, Racing Helmet, Rancher's Boots, Glossy Mineral speed pieces, and Intelligence-only Aurora/Storm pieces were removed because their surviving lanes were irrelevant to the Berserk fallback goal. Those Speed items returned for the explicit Speed question, while Intelligence candidates were retained despite the inferred Berserk role. Relevant locked and over-budget candidates also remained. Full per-candidate F5 relevance, known changes, prices, budget gaps, requirement gaps, warnings, and source lanes are recorded in `phase-4.2-f5-candidates.json`. No OpenAI request was made.

The F5 relevance set still contained 63 candidates, so the stable lane selector used the full 32-item ceiling. Several high-stat candidates are distant, expensive, or have partially unknown Kuudra requirements. They remain because Phase 4.2 explicitly keeps relevant feasibility gaps and forbids deterministic “close enough” thresholds. This is the principal review concern before the next Luna call; the model must use those gaps rather than treating shortlist membership as an endorsement.

## Phase 4.3 deterministic validation

Phase 4.3 keeps Phase 4.2 goal relevance intact and spends the context budget on a representative progression frontier. Broad general gear uses bucket ceilings of 12 actionable, 8 money-gated, 8 progression-gated, and 4 distant or uncertain candidates. Structural ceilings cap broad armor at three candidates per slot, distant armor at one per slot, repeated distant keys at one, non-distant armor keys at three, and weapon keys at two. Selection is lexicographic and uses no weighted recommendation score.

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 74 offline tests passed |
| `npm run build` | Production build passed |
| Three required `inspect:advisor-context` queries | Passed against iTimess / Lemon / 30m; no OpenAI request |

| Question | Route / goal / inferred role | Raw | Relevant | Final | Final bucket counts |
| --- | --- | ---: | ---: | ---: | --- |
| F5 / 30m upgrade | GEAR / GENERAL_UPGRADE / berserk | 152 | 63 | 28 | 11 actionable, 7 money, 6 progression, 4 distant |
| Intelligence for AOTE teleporting | MAGE / INTELLIGENCE / berserk | 38 | 31 | 17 | 3 actionable, 1 money, 9 progression, 4 distant |
| Get much faster | GEAR / SPEED / berserk | 152 | 24 | 20 | 6 actionable, 2 money, 8 progression, 4 distant |

For F5, 35 goal-relevant candidates remained unselected: 16 hit structural redundancy limits and 19 hit the distant bucket ceiling. None hit the final cap. The final IDs are:

`ZOMBIE_SOLDIER_CUTLASS`, `STARRED_BAT_WAND`, `FLOWER_OF_TRUTH`, `GIANT_CLEAVER`, `PIGMAN_SWORD`, `MYTHOS_CHESTPLATE`, `FANCY_TUXEDO_CHESTPLATE`, `ELEGANT_TUXEDO_BOOTS`, `HYPER_CLEAVER`, `STARRED_SHADOW_FURY`, `YETI_SWORD`, `FELTHORN_REAPER`, `BOUQUET_OF_LIES`, `STARRED_YETI_SWORD`, `ELEGANT_TUXEDO_LEGGINGS`, `STARRED_FELTHORN_REAPER`, `ELEGANT_TUXEDO_CHESTPLATE`, `GIANTS_SWORD`, `HEARTFIRE_DAGGER`, `HEARTMAW_DAGGER`, `ATOMSPLIT_KATANA`, `SOUL_WHIP`, `FLAMING_FLAY`, `REAPER_SCYTHE`, `BERSERKER_LEGGINGS`, `BURNING_TERROR_BOOTS`, `BURNING_TERROR_HELMET`, `DARK_CLAYMORE`.

The old flood probe fell from 20 matching entries in the Phase 4.2 final context to three: two Burning Terror pieces and Dark Claymore. Infernal Crimson, Infernal Terror, Fiery Crimson/Terror, and Burning Crimson contributed zero final entries. These strings are validation probes only and do not appear in selection logic. `NECRON*` and `MIDAS*` were absent from the entire raw generated F5 scope, so neither reached goal relevance or selection; code was not changed to force them in.

The Intelligence final IDs are:

`CRYPT_BOW`, `STARRED_BAT_WAND`, `BAT_WAND`, `ELEGANT_TUXEDO_CHESTPLATE`, `ATOMSPLIT_KATANA`, `HYPERION`, `WISE_WITHER_HELMET`, `REAPER_LEGGINGS`, `REAPER_BOOTS`, `REAPER_CHESTPLATE`, `WISE_WITHER_LEGGINGS`, `WISE_WITHER_BOOTS`, `WISE_WITHER_CHESTPLATE`, `HOT_AURORA_LEGGINGS`, `HOT_AURORA_HELMET`, `HOT_AURORA_BOOTS`, `BURNING_AURORA_CHESTPLATE`.

The Speed final IDs are:

`RANCHERS_BOOTS`, `FARMER_BOOTS`, `GLOSSY_MINERAL_CHESTPLATE`, `STARRED_THORNS_BOOTS`, `YOUNG_DRAGON_CHESTPLATE`, `YOUNG_DRAGON_LEGGINGS`, `GLOSSY_MINERAL_LEGGINGS`, `STARRED_SPIRIT_MASK`, `THERMODYNAMIC_CHESTPLATE`, `THERMODYNAMIC_LEGGINGS`, `THERMODYNAMIC_HELMET`, `THERMODYNAMIC_BOOTS`, `SPEED_WITHER_CHESTPLATE`, `SPEED_WITHER_LEGGINGS`, `SPEED_WITHER_HELMET`, `SPEED_WITHER_BOOTS`, `RACING_HELMET`, `FIERY_TERROR_CHESTPLATE`, `FIERY_TERROR_LEGGINGS`, `INFERNAL_TERROR_BOOTS`.

The committed artifact [`phase-4.3-f5-candidate-frontier.json`](phase-4.3-f5-candidate-frontier.json) records all raw-scope candidates, all 63 goal-relevant candidates with feasibility and selection metadata, and the final 28 IDs. Fewer than 32 is explicitly supported and four aspirational candidates survived. No Luna or OpenAI request was made.
