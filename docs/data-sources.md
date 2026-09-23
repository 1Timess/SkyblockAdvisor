# Data sources and contracts

The original architecture brief defines the product. The Phase 1 Supplemental Data Contracts document takes precedence for exact field paths, formulas, constants, and narrowed requirements. Both Word documents are retained at the repository root. No external research was performed.

## Runtime sources

| Source | Purpose | Cache |
| --- | --- | --- |
| api.mojang.com/users/profiles/minecraft/{username} | Canonical username and UUID | 24 hours |
| sessionserver.mojang.com/session/minecraft/profile/{uuid} | Resolve UUID to canonical username | 24 hours |
| api.hypixel.net/v2/skyblock/profiles | Available profiles and selected member | 5 minutes |
| api.hypixel.net/v2/player | Thin client method available; not fetched until a used field requires it | 5 minutes |
| api.hypixel.net/v2/resources/skyblock/items | Accessory catalog | 12 hours |

The server sends the local HYPIXEL_API_KEY in the API-Key header for authenticated Hypixel requests. The public item resource does not require a key. Caches are bounded in-memory maps. Requests have a 15-second upstream timeout; there is no player polling or persistence.

## Supplied constants

- `src/server/reference/xp-tables.json`: supplement sections 5.2–5.5; 60 skill costs, 51 dungeon costs, 25 runecrafting costs, and 25 social costs. All are incremental costs, not cumulative thresholds.
- `src/server/reference/leveling.ts`: section 5.9 algorithm, including continued dungeon progression using the final cost.
- `src/server/skyblock/domains/slayers.ts`: section 6 cumulative thresholds for six Slayer types.
- `src/server/reference/pet-levels.json` and `pet-leveling.ts`: section 8, with 119 base costs, rarity offsets, Bingo exception, and dragon extensions to level 200.
- `src/server/reference/accessory-chains.json`: all 88 upgrade chains from section 9.4.
- `src/server/reference/accessory-data.ts`: section 9 aliases, MP constants, exclusions, and special rarity/recombobulation/enrichment rules.

JSON tables and chains were extracted directly from the supplement's OOXML text and checked for expected counts. Runtime code does not parse the Word documents.

## Raw profile paths

| Domain | Selected member path unless stated otherwise |
| --- | --- |
| Purse / personal bank | currencies.coin_purse / profile.bank_account |
| Shared bank | selected profile's banking.balance |
| Armor / equipment | inventory.inv_armor / inventory.equipment_contents |
| Inventory / ender chest | inventory.inv_contents / inventory.ender_chest_contents |
| Accessory bag | inventory.bag_contents.talisman_bag |
| Backpack contents | inventory.backpack_contents, decoded once per entry |
| Pets | pets_data.pets |
| Skill XP | player_data.experience.SKILL_* |
| Farming cap | jacobs_contest.perks.farming_level_cap |
| Taming cap | pets_data.pet_care.pet_types_sacrificed |
| Slayers | slayer.slayer_bosses |
| Dungeons | dungeons.dungeon_types / player_classes / selected_dungeon_class / secrets |
| Selected power | accessory_bag_storage.selected_power |
| Consumed Rift Prism | rift.access.consumed_prism |

Optional pet identifiers accept missing or null values. A live iTimess response contained a null UUID; public pet UUIDs already permit null under supplement section 14.1. Unsupported non-null source shapes produce a named contract error rather than guessed field mappings.

## Explicit Phase 1 choices

Foraging uses the supplied base cap of 50. Runecrafting uses its supplied table/cap without optional rank adjustment. Tier Boost preserves raw rarity for XP calculation and raises effective rarity for display/reference lookup. No local NEU enrichment exists, so pet stats and ability lore are empty as explicitly allowed by sections 8 and 12.

Accessory bag items begin active. Equal-rarity duplicates prefer a bag copy; higher-rarity aliases and higher chain members are resolved across all considered inventories, including inactive outside-bag copies. A consumed Rift Prism contributes 11 MP without duplicating a physical copy's benefit. Missing/upgrade lists come from the item resource; their absence during an upstream failure is warning-tagged.

Missing optional sections produce partial data and warnings. Missing purse is null rather than a fabricated zero; unavailable skills are omitted and unavailable Catacombs progress is null. Known gear totals are sums of displayed item stat lines, not simulated effective combat stats.

## Fixtures and live validation

Offline tests use a synthetic profile and independently encoded Java NBT, both gzip-compressed and uncompressed. Tests do not access the network. The synthetic fixture uses unrelated player/item IDs; no iTimess profile dump is retained as a development fixture.

Final real-data verification uses the locally configured key and iTimess, as authorized by the owner. The inspection and live HTTP scripts print compact validation summaries rather than storing raw profiles. See validation.md for results.

## Deferred

NEU lore/stat enrichment, optional Abiphone MP, wardrobe/backpack-icon presentation, personal vault/other bags, detailed mining/Garden/collections, market pricing, net worth, and advisor calls are outside this checkpoint.
