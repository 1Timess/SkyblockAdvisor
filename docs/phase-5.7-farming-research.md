# Farming research inventory (2026-09-28)

## Source boundaries

| Source | Observable evidence | Unproven from that source |
| --- | --- | --- |
| Selected member of `skyblock/profiles` | Farming skill XP and cap from Jacob's perks; `jacobs_contest` keys; possible `garden_player_data` keys; inventory and collection observations | A complete Garden state, unreported fields, current contest outcome or competitive rank |
| [Hypixel `skyblock/garden`](https://api.hypixel.net/) queried by selected `profile_id` | Profile Garden XP, collected crop totals, crop upgrade levels, plots, visitor completions, active offers, composter upgrades when present | Member-specific ownership of profile-wide Garden state, ability to fulfill an offer from inventory, current crop rate, current pests or purchase feasibility |
| [Hypixel skills resource](https://api.hypixel.net/) | Current supplied skill tier definitions, if fetched and verified | Garden-specific levels or Jacob's contest cutoffs |
| [Community Garden guide](https://hypixelskyblock.minecraft.wiki/w/The_Garden) | Garden level rewards, crop and visitor milestones, unlock descriptions | A player's live Garden progress or the exact raw API contract |
| [NEU item catalog](https://github.com/NotEnoughUpdates/NotEnoughUpdates-REPO) | Item identities and recipe observations | Evidence an item is currently owned, affordable, or the best upgrade |

Hypixel documents a **separate** `GET /v2/skyblock/garden?profile=<profile-id>` endpoint. Its example exposes `garden_experience`, `resources_collected`, `crop_upgrade_levels`, `unlocked_plots_ids`, `commission_data`, `active_commissions`, and `composter_data`. A 404 means no Garden result from that endpoint, not Garden level zero. The app currently retains member `garden_player_data` and `jacobs_contest` as opaque values under `otherProgression`; it does not call the Garden endpoint. The research inspection uses both sources and records the endpoint status without serializing arbitrary raw objects.

The current Garden guide says crop milestones count Garden harvesting and separately grant Garden XP and Farming XP; collections can progress under different conditions. It lists 46 tiers per crop and separate visitor milestones. The December 2025 update reworked crop and visitor milestones and introduced new crops, so older threshold tables cannot be imported without an explicit current-source audit. Garden I starts on first Garden visit; no level-zero assumption should be applied to a missing Garden response.

## Validation and implementation order

1. Run `npm run inspect:farming-research -- <username> <profile>` on early and late profiles. Compare member and Garden endpoint field shapes and any missing/404 section. This inspection does not call Luna.
2. Decide whether Garden progress should be loaded lazily for Farming routes, with a bounded cache and a distinct `UNAVAILABLE` state for source failures. Add typed, partial normalization after field shapes are confirmed.
3. Audit the current Garden XP thresholds, direct level unlocks, crop milestone quantities and visitor milestones. Join only source-backed requirements to item identities; do not infer recipe affordability or contest medals.
4. Implement Farming context and goals, then validate deterministic output against both profiles. Add a single guarded advisor response check only after unit, type and lint gates pass.

The first advisor pass should make skill/Garden/crop/visitor progress legible and recommend explicit sourced milestones. Contest optimization, effective Farming Fortune, tool mutations, crop profit, and visitor cost ranking require additional evidence and should remain separate follow-up work.

## Two-profile field audit and sourced level pass

The 2026-09-28 inspections of iTimess Lemon and ShinyFloa Blueberry both returned Garden HTTP 200. Their member `garden_player_data` exposed only `copper`; Garden XP, crop resources, visitor counts, plots, active offers and composter upgrades came from the separate endpoint. Both had `jacobs_contest`, but neither reported `perks.farming_level_cap`. Do not equate a missing perk with a measured cap bonus. ShinyFloa's Garden contained five active offers, while iTimess's active offers object was empty. The inspection hid item quantities, so offer feasibility remains unresolved.

The [current Garden level table](https://hypixelskyblock.minecraft.wiki/w/The_Garden) gives cumulative thresholds of 10,120 XP for level 10 and 20,120 XP for level 11. The two observed Garden XP values therefore imply iTimess at level 10 with 7,939 XP to level 11, and ShinyFloa at level 9 with 790 XP to level 10. [Visitor milestone tables](https://hypixelskyblock.minecraft.wiki/w/The_Garden) put iTimess's 40 accepted offers 10 short of the 50-offer tier and 30 unique visitors 10 short of 40. ShinyFloa's 98 offers are 2 short of 100, and 46 unique visitors are 4 short of 50. These are count gaps, not estimates of cost or effort. The pinned threshold arrays in `garden-milestones.json` and `buildGardenProgress` implement these facts. The data remains profile-wide; a selected member's private inventory is not evidence of shared crop availability.

The next pass should inspect `validate:farming-state` results to verify parsed values and quantities, audit crop-specific milestone thresholds under the 2025 rebalance, then wire an on-demand Garden fetch into a Farming advisor route. Do not fetch Garden for unrelated advisor questions.

## Corrected live state and advisor boundary

The corrected `validate:farming-state` results confirm iTimess Lemon: Farming 24, Garden XP 12,181 (level 10; 7,939 XP to 11), 40 accepted offers (10 to 50), and 30 unique visitors (10 to 40). ShinyFloa Blueberry: Farming 32, Garden XP 9,330 (level 9; 790 XP to 10), 98 accepted offers (2 to 100), and 46 unique visitors (4 to 50). ShinyFloa has five active offers with observed item IDs and quantities; iTimess has none. The advisor reports these requirements without inferring owned ingredients or visitor value.

The current crop milestone guide presents a generic 46-tier progression but does not unambiguously attach crop-specific quantities to each crop after the December 2025 rebalance. The first advisor pass therefore omits next crop milestone tiers and XP rewards; Garden `resources_collected` remains observational context. The Farming route fetches Garden state on demand, offers no purchase candidates, and avoids cross-domain item recommendations. Run `validate:farming-advisor` for both profiles and inspect the deterministic payload before a guarded Luna response check. Freeze readiness requires that live route check and response review.

## Broader Farming scope audit

The Garden domain spans plot expansion and actual planted layouts, greenhouse slots and mutation discovery, pest activity, Jacob's contests and medals, crop upgrades, composter state, visitors, equipment and tool modifications, Farming XP, and crop milestones. The first advisor response covered only Garden XP and visitor counts. This is a partial milestone slice, not a Farming freeze.

The current Garden guide documents 24 ordinary plots and a separate greenhouse feature (up to three greenhouse plots), with greenhouse access following Garden VII and the Carpenter visitor. Mutations require particular neighboring crops; physical arrangement matters. Unlocked plot IDs in the API do not identify crops planted on those plots. The two validated profiles expose six and eight unlocked plot IDs respectively; only Lemon's Garden inspection reported a `greenhouse_slots` key. That difference is not evidence of zero greenhouses on Blueberry.

Run `inspect:farming-depth` on both profiles to whitelist field shapes for greenhouse slots, garden upgrades, and any pest/mutation fields in member and Garden data. Do not serialize arbitrary layouts or convert absent keys to zero. After inspection, map demonstrably observed greenhouse slots and mutation discoveries, identify whether the public API exposes crop placement or pest counts, then add sourced plot costs, relevant unlocks and crop thresholds. Equipment and tool mutation recommendations need owned-item observations and mechanic-specific reference data. Contest medals are historical inventory, not proof of current rank. Keep a visible capability matrix for observed, inferred, and unavailable facts before declaring Farming frozen.

## Greenhouse and plot field results

The 2026-09-28 bounded depth inspections returned Garden HTTP 200 for both profiles. Lemon has six `unlocked_plots_ids`, a present `greenhouse_slots: []`, and an empty `garden_upgrades` object. Blueberry has eight unlocked plot IDs, no `greenhouse_slots` key, and an empty `garden_upgrades` object. Neither returned top-level pest fields or a planted crop layout. The selected members' `garden_player_data` objects contain only `copper`; `jacobs_contest` includes historical fields, not live pest counts. A missing greenhouse field cannot be read as a count of zero, and an empty array reports zero recorded slots rather than whether the Carpenter blueprint quest was completed.

The sourced next Garden crop unlocks are Nether Wart at level 10 for Blueberry, and Sunflower and Moonflower at level 11 for Lemon. Garden VII makes the greenhouse quest eligible, but access also needs the Carpenter's visitor offer and Greenhouse Blueprint handoff to Sam. The advisor now exposes plot IDs, greenhouse slot observation status, and next crop access. It does not infer planted crops, mutation discoveries, active pests, or a greenhouse count from these observations. A deeper inspection of nested profile fields, if publicly exposed, would be needed before modeling pest capture history or actual garden layouts.

## Validated advisor payload and next mechanic inspection

The two post-unlock `validate:farming-advisor` payloads preserve the Garden XP gaps and route, show Lemon's six plot IDs with zero recorded greenhouse slots, and Blueberry's eight plot IDs with greenhouse slots unreported. They name Sunflower and Moonflower at Lemon's next Garden level and Nether Wart at Blueberry's next level. Both have zero purchase candidates; no Luna call is needed to check this deterministic join.

`inspect:farming-mechanics` now samples only contest entry field names and primitive types, historical medal/perk numbers, pest-related kill/bestiary counters, and capped visible farming gear metadata. Its next live outputs will determine which medal/contest facts can be normalized and whether gear is visible enough for tool-specific analysis. Pest kill history cannot be converted into current pests, and visible inventory cannot prove a complete wardrobe or account ownership of a communal layout.

## Member mechanic results and advisor join

Lemon reports five historical Jacob contests, no reported medal inventory, and six explicit `pest_` kills spread across fly, moth, mite, locust, slug and worm. Its visible sample contains Farmhand armor and two hoes, but the wardrobe API is disabled. Blueberry reports 24 historical contests, bronze 1/silver 1/gold 0 in the medal inventory, no explicit `pest_` kill counters, a Blessed Melon Dicer Mk. III and three observed Melon armor pieces in a loadout. The wardrobe API is also disabled. Contest samples vary: Lemon entries expose only `collected`, and one Blueberry entry exposes claimed position/participants/rewards. These snapshots cannot establish current contest placement or that every piece of gear is visible.

The first mechanics inspector overmatched Endermite and Magma Slug as pests and included unrelated items with crop terms in names. The filter now accepts only `pest_`-prefixed counters and farming IDs or items with an explicit Farming Fortune stat. The advisor joins bounded historical contest and pest facts with visible gear metadata, without purchase candidates or effective-stat comparisons. Later work must source crop-specific thresholds, tool upgrade mechanics, contest reward rules and greenhouse mutation recipes before ranking those paths.
