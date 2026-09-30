# Foraging v1 observability contract

Status: research contract for `phase-5.8a-foraging-research`.

This document separates facts directly exposed by the Hypixel profile/item state from deterministic derivations, reference mechanics, and unsafe inference. Missing profile fields remain unknown unless the API contract for that field proves that absence means zero/false.

## Profile progression

| Concern | Raw evidence | Normalized ownership | Safe now | Requires reference mechanics | Do not infer |
| --- | --- | --- | --- | --- | --- |
| Foraging skill | `player_data.experience.SKILL_FORAGING` | skill XP | preserve XP | level thresholds | level from unrelated achievements |
| Level cap | `SKILL_FORAGING_extra_level_cap` | extra cap count | preserve reported count | base cap and unlock-source mapping | which source granted each +1 |
| HOTF XP | `skill_tree.experience.foraging` | `treeExperience` | preserve XP | HOTF tier thresholds | tier from owned gear |
| HOTF presets | `skill_tree.nodes.foraging` through `foraging_5` | five independent preset maps | node level/value/state and toggle state | topology, prerequisites, max levels, effects and costs | flatten or merge presets |
| Active preset | `skill_tree.selected_skill_tree_slot.foraging` | `activePreset` | preserve selected slot | exact slot-to-storage-key convention if needed | active state from highest investment |
| Selected ability | `skill_tree.selected_ability.foraging*` | selected ability per preset | preserve per-preset values | ability mechanics | selected ability implies enabled perk |
| Tokens | `skill_tree.tokens_spent.forest*` | spent by preset | preserve spend | total token schedule | available tokens until total schedule is sourced |
| Whispers | `foraging_core.whispers.{forest,desert}.total` and per-preset `spent` | totals + spent by preset | preserve both independently | confirm total/current-pool semantics and costs | `total - spent` balance before semantics are verified |
| Daily core state | `foraging_core.daily_*` | raw core evidence | preserve raw values | reset semantics where useful | activity conclusions from zero counters |

Purchased node level and toggle/enabled state are separate facts. A disabled toggle must not erase the purchased level.

## Tree progression and collections

| Concern | Raw evidence | Safe now | Requires reference mechanics | Do not infer |
| --- | --- | --- | --- | --- |
| Tree Gifts | `foraging.tree_gifts.FIG/MANGROVE/HELIX` | exact reported counts | milestone thresholds/rewards | absent tree count is zero unless API semantics prove it |
| Claimed gift tiers | `tree_gifts.milestone_tier_claimed` | preserve reported tree/tier pairs | reward mapping | absent claimed tier as numeric 0 |
| Collections | member `collection` including `FIG_LOG`, `MANGROVE_LOG`, `HELIX_LOG`, `HONEYCOMB`, `RUBY_VEILSHROOM`, `TENDER_WOOD` | exact reported counts | collection thresholds/rewards | unlocks without reference thresholds |
| Hina | `foraging.hina` task/progress evidence | preserve observed task state | task catalog/reward meaning | full Agatha/Miria state from sampled Hina evidence |
| Starlyn | `foraging.starlyn.personal_bests` | preserve Agatha/Miria PBs | contest reward/progression rules | PB as contest rank or progression level |
| Tree access | progression + collections can support checks | only when required inputs are explicit | Fig/Mangrove/Helix access requirements | current tree being chopped |
| Toughness/Sweep | no runtime tree target in profile | none | current tree Toughness and Sweep mechanics | logs/action or effective chop rate |

## Attributes and Hunting boundary

`attributes.stacks` is directly observable and may contain Foraging-relevant stack counts such as `fig_sharpening`, `first_sweep`, `foragers_fortune`, `foraging_speed`, `forest_essence`, `forest_strength`, `galatea_training`, `moonglade_mastery`, `spirit_axe`, `starlyn_training`, `torrhus_mastery`, `tree_lurker`, and `woodland_fortune`.

Foraging v1 may preserve/read these counts. It may only turn a stack into an active stat bonus when the attribute definition and activation semantics are sourced. Owned stacks are not automatically active stats.

`shards.owned`, `shards.fused`, and `shards.traps` are profile-observable, but full Hunting progression remains outside Foraging v1. Foraging may consume a proven Hunting-derived Foraging bonus without becoming the Hunting advisor.

## Gear and modifier observability

The gear probe proves that inventory and loadout items retain live NBT plus normalized tooltip state.

| Modifier/state | Proven live representation | Contract |
| --- | --- | --- |
| Forest Essence / stars | `upgrade_level`; normalized `stars` | preserve live level; reference mechanics own per-star effects |
| Citrines | `gems.unlocked_slots` plus `CITRINE_n` quality; normalized gemstone slots | use NBT slot/quality state, not catalog assumptions |
| Boosters | `booster_tiers`, e.g. `foraging_wisdom: 1` | preserve booster type/tier; reference mechanics own effect |
| Absorb | `enchantments.absorb` + `absorb_logs_chopped` | enchant tier and progress are separate facts |
| Helix Mega Frenzy | `logs_cut` | preserve counter; derive Sweep only after progression formula is sourced |
| Reforge | normalized `reforge` when present | use observed item value; null means unreported/no parsed modifier, not a guessed reforge |
| David's Cloak | live tooltip stats + `attributeMenuValue` | preserve observed milestone value and tooltip bonuses; Hunting progression remains external |
| Forest Pledge | not observed in the probe | representation unknown; do not invent an NBT key |
| Wood Singularity | not proven by this fixture | representation/effect remains reference or future narrow-probe work |

Actual item state outranks a catalog template for owned gear. Catalog data describes candidate/template mechanics; it must not overwrite live stars, gemstones, boosters, counters, enchants, reforges, or tooltip-derived state.

Inventory ownership does not establish equipped state. Equipped armor/equipment is only claimed when the loadout API identifies an equipped set.

## Parser gaps exposed by the gear probe

The generic item stat parser currently retains these values in lore but does not normalize all of them as first-class stats:
- Sweep on Helix Armor.
- Sweep, Foraging Wisdom, Hunting Fortune, and Hunting Wisdom on David's Cloak.

These are implementation gaps, not missing Hypixel data. They should be added to generic stat normalization rather than handled by one-off username/item hacks.

## Deterministic v1 ownership

Foraging v1 may deterministically own:
- Foraging XP and reported extra level-cap count.
- HOTF XP.
- Five independent HOTF presets.
- Per-node level/value/state/toggle evidence.
- Active preset and per-preset selected ability.
- Tokens spent by preset.
- Forest/Desert whisper totals and per-preset spend.
- Tree Gift counts and reported claimed milestone tiers.
- Relevant collection counts.
- Hina/Starlyn observed evidence.
- Relevant attribute stack counts.
- Visible Foraging gear, loadout gear, and proven equipped loadout state.
- Live item stars, gemstones, boosters, enchants and progress counters where exposed.

After source-backed mechanics tables are frozen, deterministic code may additionally derive skill/HOTF levels, token availability, whisper balances, milestone progress, requirements, modifier effects, and supported upgrade comparisons.

## Explicitly unsafe / unavailable in v1

Do not claim:
- exact effective Foraging Fortune or Sweep from incomplete sources;
- exact logs per action or effective chopping rate;
- hourly profit;
- current tree being chopped;
- contest outcome/prediction;
- full Hunting progression;
- arbitrary attribute stacks are active;
- equipped state from inventory presence;
- missing field equals zero/false;
- Forest Pledge or Wood Singularity state from guessed NBT;
- global mathematical optimality.

## Probe decision

The broad raw-profile discovery pass and broad gear/NBT discovery pass are complete. No third broad profile probe is justified.

A future narrow probe is allowed only when implementation encounters a concrete unresolved field whose answer changes deterministic behavior. Likely candidates are:
1. exact Agatha/Miria progression beyond Hina evidence and Starlyn personal bests;
2. an owned item known to carry Forest Pledge or Wood Singularity when its live representation becomes necessary;
3. full shard identity only if a specific Foraging bonus cannot be established from normalized attribute/profile evidence.

Until one of those becomes necessary, the next step is production normalization, not more profile sampling.
