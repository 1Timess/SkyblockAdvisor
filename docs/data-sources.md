# Data sources and required inputs

The Word brief is the source of truth. No external sources have been researched or downloaded for this planning baseline.

## Supplied behavior

The brief supplies profile selection behavior, initial inventory paths, NBT decoding outline, item/stat parsing guidance, public contract sketches, cache TTLs, basic MP values, and the Hegemony Artifact/Rift Prism MP exceptions.

Live Hypixel data supplies player state. Hypixel resources supply public item definitions. A local NEU snapshot supplies item/pet reference data. Static tables supply leveling. Market data belongs to a later phase.

## Missing required inputs

1. **Leveling tables and rules:** skill XP tables and caps, Slayer thresholds per type, Catacombs/class XP tables, and the precise table conventions needed to calculate progress. The brief describes these tables but includes no values.
2. **Pet reference data:** NEU constants/pets.json, constants/petnums.json, relevant item templates, and the supported rules for rarity offsets, special max levels, Tier Boost, and interpolation. No local snapshot is present.
3. **Accessory reference data:** catalog fixture/snapshot, upgrade chains, aliases, exclusions, and special rarity mappings. Clarify whether a higher upgrade outside the bag suppresses a lower version inside the bag; the brief's active-bag and higher-owned rules leave this consequential case ambiguous.
4. **Real offline fixtures:** a sanitized Hypixel profile response and at least one retained encoded inventory blob, plus minimal relevant reference fixtures. Synthetic fixtures may supplement but cannot satisfy the required real NBT validation.
5. **Exact source contracts where absent:** identity endpoint URL/status behavior and raw member paths/shapes for pets, skill XP, Slayer data, dungeons, selected accessory power, personal bank, and backpack payloads/icons. A supplied annotated fixture or separately supplied mapping can resolve these. The brief names the domains without fully specifying these contracts.
6. **Live validation configuration:** a locally configured HYPIXEL_API_KEY will be needed for live checkpoint verification. Keep it out of source control and chat; it is not needed for offline tests.

The owner may supply these files/specifications or identify specific local reference files approved for reuse from the previous project. Do not copy the old repository wholesale or search online to fill the gaps.

## Handling unavailable data

Missing runtime data can produce null values, preserved raw text, and informational warnings as specified in the brief. Missing implementation formulas or mappings must be resolved first; warnings are not a substitute for implementing a mandatory Phase 1 domain correctly.
