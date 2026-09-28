# Slayer research inventory (2026-09-27)

This is the source and evidence boundary for the complete Slayer domain. It precedes advisor routing or recommendations. Source snapshots can change; retain their revision or retrieval time with every derived catalog.

## Sources checked

| Evidence | What it can establish | What it cannot establish |
| --- | --- | --- |
| Selected member's `slayer.slayer_bosses` from Hypixel profiles | XP and recorded boss kills by tier for each present family | Boss capability, a currently active quest, drops owned, or the best tier to farm |
| Supplied cumulative thresholds in `src/server/skyblock/domains/slayers.ts` | Level, next XP threshold and remaining XP for six families | Unlock names or kill efficiency |
| Hypixel public item resource | Current canonical item IDs and names | Complete Slayer reward tiers, recipe ingredients or boss drop attribution |
| NEU item snapshot, `slayer_req` and parsed lore | Item use requirements and candidate item identities | Proof that an item is a direct level reward or a boss drop; use requirement is distinct from recipe unlock |
| NEU `constants/rngscore.json`, `slayer` section | Possible RNG meter selections and their score constants by boss | Player's selected drop, accrued score, ownership, probability, current availability by boss tier, or economic value |

The inspected NEU upstream revision is `55e071b65ce75ad89dd1d1288eb213e818ddba20` (`NotEnoughUpdates/NotEnoughUpdates-REPO`, `master`). Its six RNG catalog keys are Revenant Horror (16 entries), Tarantula Broodfather (17), Sven Packmaster (10), Voidgloom Seraph (20), Inferno Demonlord (20), and Riftstalker Bloodfiend (9). This is a *possible rewards* catalog, not a list of rewards unlocked on a given profile. Preserve NEU IDs with semicolon suffixes (for example, enchanted books and runes) rather than collapsing them into Hypixel item IDs. Source: https://github.com/NotEnoughUpdates/NotEnoughUpdates-REPO/blob/55e071b65ce75ad89dd1d1288eb213e818ddba20/constants/rngscore.json

Hypixel documents profile and item endpoints, but no Slayer reward resource alongside the listed SkyBlock resources. Source: https://api.hypixel.net/ . The former official wiki redirects to Hypixel's July 2026 closure notice; its old pages cannot serve as live authoritative reward tables. Source: https://hypixel.net/threads/end-of-the-official-hypixel-wiki-july-2026.6112020/

## Current code audit

`buildSlayers` now keeps XP, whether XP was reported, derived level, boss kills, and the literal `claimed_levels` keys. The raw Zod contract accepts `xp`, `boss_kills_tier_0` through `_4`, and `claimed_levels`; it discards other fields inside each boss object. In particular, do not infer RNG score or quest status from missing normalized fields. Missing Slayer section produces a partial-profile warning. An absent family remains unknown.

The two redacted live inspections on 2026-09-28 found all six family keys in both profiles. iTimess has Blaze and Vampire with empty `claimed_levels` but no `xp`; ShinyFloa has XP and claim keys for all six. The latter also has a top-level `slayer_quest` key, whose contents were not inspected. Zombie claim keys include `level_7_special` and `level_8_special`; retain these literal keys rather than treating an absent `level_7` as unclaimed. Boss attempts were present, but counts were not included in this inspection. These observations establish field shapes for two members, not universal API semantics.

The research catalog now preserves reported XP status and literal claimed keys, computes next XP gaps only from reported XP, and snapshots the 92 NEU RNG options at the pinned revision. The meter scores are catalog constants. It does not claim the player has selected or progressed toward any option.

## Level rewards and drop conditions (2026-09-28)

The current community-maintained wiki provides editable leveling tables for [Zombie](https://hypixelskyblock.minecraft.wiki/w/Zombie_Slayer), [Spider](https://hypixelskyblock.minecraft.wiki/w/Spider_Slayer), [Wolf](https://hypixelskyblock.minecraft.wiki/w/Wolf_Slayer), [Enderman](https://hypixelskyblock.minecraft.wiki/w/Enderman_Slayer), [Blaze](https://hypixelskyblock.minecraft.wiki/w/Blaze_Slayer), and [Vampire](https://hypixelskyblock.minecraft.wiki/w/Vampire_Slayer). Their item-unlock columns yielded 148 named entries across 50 levels. `slayer-level-rewards.json` retains each family, level, source URL, and named grants separately. This source is community maintained, not a Hypixel API resource. A named level unlock is not proof the profile owns the item or that all crafting ingredients are present.

The threshold cross-check found one stale supplement value: Spider level I now requires 10 XP, not 5. `slayerThresholds.spider` was updated; all other 49 cumulative thresholds matched the inspected tables.

Boss pages for [Revenant Horror](https://hypixelskyblock.minecraft.wiki/w/Revenant_Horror), [Tarantula Broodfather](https://hypixelskyblock.minecraft.wiki/w/Tarantula_Broodfather), [Sven Packmaster](https://hypixelskyblock.minecraft.wiki/w/Sven_Packmaster), [Voidgloom Seraph](https://hypixelskyblock.minecraft.wiki/w/Voidgloom_Seraph), [Inferno Demonlord](https://hypixelskyblock.minecraft.wiki/w/Inferno_Demonlord), and [Riftstalker Bloodfiend](https://hypixelskyblock.minecraft.wiki/w/Riftstalker_Bloodfiend) supply the minimum Slayer level and eligible boss tier for 102 distinct named drops. `slayer-boss-drops.json` preserves per-tier conditions, because some entries differ by tier. It deliberately omits probabilities and assumes neither boss viability nor successful acquisition. The pinned NEU meter options contain 92 entries; the wiki drop tables include additional or renamed entries. Do not silently equate the two catalogs.

An audit against the inspected NEU item snapshot found 139 of 148 level-unlock names had a unique exact item name. The remaining entries include minion families, pet variants, and ambiguous or renamed accessories; they remain name-only until a safe canonical join exists. The boss drop join resolves all but one pinned NEU option against the wiki names: `ULTIMATE_REITERATE;1` has no matching sourced drop condition in these tables. It stays possible in the NEU RNG catalog without a claimed boss-tier condition. NEU `slayer_req` or parsed lore provides an *item use requirement*, which can differ from the level-unlock relation.

`parseItemRequirements` recognizes NEU `slayer_req` aliases and explicit lore. This is already useful for showing which *items* require a Slayer level. It does not imply the reward is earned automatically at that level. The collections pass also indexes crafted Slayer minions, which should be reused instead of building a second minion history.

## Research and implementation order

1. Inspect small, redacted raw `slayer.slayer_bosses` samples from early and late profiles to establish which quest/RNG/unlock fields are actually available and whether families with zero XP appear. Completed for iTimess Lemon and ShinyFloa Blueberry; the optional `slayer_quest` structure remains unknown.
2. Build a pinned, validated source catalog: family IDs, cumulative thresholds, NEU possible RNG rewards and item requirements. The possible RNG snapshot and XP gaps are indexed; item use requirements already exist in the item catalog. Record unresolved IDs before joining options to items.
3. Research direct level rewards and boss-tier/drop conditions independently. Indexed at the source-described granularity. A recipe unlock still needs ingredient research before cost or craft feasibility claims.
4. Derive profile-specific next levels, XP gaps, boss kill history and relevant catalogued goals. Unknown combat viability, active quests, drop history and RNG meter state must remain unknown.
5. Route Slayer questions into the advisor, test early and late profiles locally, then inspect only explicitly authorized Luna calls before a freeze decision.

The next code pass should begin with the raw-field audit and the catalog parser. A generic recommendation such as “farm tier IV for the best XP” requires tier XP, eligibility, kill time and cost evidence; none is established here.
