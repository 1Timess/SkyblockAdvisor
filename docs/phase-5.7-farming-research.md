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
