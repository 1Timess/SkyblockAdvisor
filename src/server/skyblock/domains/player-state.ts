import type { RawMember } from "../../hypixel/types";

export function buildExtendedPlayerState(member: RawMember) {
  const miningNodes = normalizeNodes(member.skill_tree?.nodes?.mining);
  const foragingNodes = normalizeNodes(member.skill_tree?.nodes?.foraging);
  const stats = member.player_stats;
  return {
    mining: {
      treeExperience: finiteNumber(member.skill_tree?.experience?.mining), hotmLevel: null,
      nodes: miningNodes, selectedAbility: typeof member.skill_tree?.selected_ability === "string" ? member.skill_tree.selected_ability : null,
      selectedAbilities: stringMap(member.skill_tree?.selected_ability),
      selectedTreeSlot: scalar(member.skill_tree?.selected_skill_tree_slot), selectedTreeSlots: numericMap(member.skill_tree?.selected_skill_tree_slot),
      tokensSpent: finiteNumber(member.skill_tree?.tokens_spent), tokensSpentByTree: numericMap(member.skill_tree?.tokens_spent),
      lastReset: finiteNumber(member.skill_tree?.last_reset),
      powder: { mithril: finiteNumber(member.mining_core?.powder_mithril), mithrilTotal: finiteNumber(member.mining_core?.powder_mithril_total),
        mithrilSpent: finiteNumber(member.mining_core?.powder_spent_mithril), gemstone: finiteNumber(member.mining_core?.powder_gemstone),
        gemstoneTotal: finiteNumber(member.mining_core?.powder_gemstone_total), gemstoneSpent: finiteNumber(member.mining_core?.powder_spent_gemstone),
        nonRefundableMithrilSpent: finiteNumber(member.mining_core?.powder_spent_non_refundable_mithril),
        nonRefundableMithrilSpent2: finiteNumber(member.mining_core?.powder_spent_non_refundable_mithril_2) },
      dailyOres: { total: finiteNumber(member.mining_core?.daily_ores_mined), gemstone: finiteNumber(member.mining_core?.daily_ores_mined_gemstone),
        glacite: finiteNumber(member.mining_core?.daily_ores_mined_glacite), mithrilOre: finiteNumber(member.mining_core?.daily_ores_mined_mithril_ore) },
      crystals: dynamicRecord(member.mining_core?.crystals), biomes: dynamicRecord(member.mining_core?.biomes),
    },
    foraging: { treeExperience: finiteNumber(member.skill_tree?.experience?.foraging), nodes: foragingNodes,
      sweepLevel: nodeLevel(foragingNodes.sweep), foragingFortuneNodeLevel: nodeLevel(foragingNodes.foraging_fortune),
      core: { ...dynamicRecord(member.foraging_core), ...dynamicRecord(member.foraging) } },
    fishing: { itemsFished: numericMap(stats?.items_fished), seaCreatureKills: finiteNumber(stats?.sea_creature_kills),
      trophyFish: numericMap(member.trophy_fish) },
    attributes: numericMap(member.attributes?.stacks),
    shards: { owned: member.shards?.owned ?? null, fused: member.shards?.fused ?? null, traps: member.shards?.traps ?? null },
    collections: numericMap(member.collection), unlockedCollectionTiers: stringList(member.player_data?.unlocked_coll_tiers),
    craftedGenerators: stringList(member.player_data?.crafted_generators),
    playerStats: { highestDamage: finiteNumber(stats?.highest_damage), highestCriticalDamage: finiteNumber(stats?.highest_critical_damage),
      kills: numericMap(stats?.kills), deaths: numericMap(stats?.deaths), itemsFished: numericMap(stats?.items_fished),
      seaCreatureKills: finiteNumber(stats?.sea_creature_kills), pets: numericMap(stats?.pets), auctions: numericMap(stats?.auctions),
      races: numericMap(stats?.races), rift: numericMap(stats?.rift) },
    bestiary: { kills: numericMap(member.bestiary?.kills), deaths: numericMap(member.bestiary?.deaths),
      milestone: numericMap(member.bestiary?.milestone), miscellaneous: numericMap(member.bestiary?.miscellaneous) },
    otherProgression: { fairySoul: member.fairy_soul ?? null, leveling: member.leveling ?? null, jacobsContest: member.jacobs_contest ?? null,
      garden: member.garden_player_data ?? null, forge: member.forge ?? null, netherIsland: member.nether_island_player_data ?? null, rift: member.rift ?? null },
  };
}

export function buildAccessoryPlayerState(member: RawMember) {
  const storage = member.accessory_bag_storage, tuning = storage?.tuning;
  const slots: Record<string, Record<string, number>> = {};
  for (const [slot, value] of Object.entries(tuning ?? {})) {
    if (slot === "highest_unlocked_slot") continue;
    const stats = numericMap(value);
    if (Object.keys(stats).length) slots[slot] = stats;
  }
  return { highestMagicalPower: finiteNumber(storage?.highest_magical_power), unlockedPowers: stringList(storage?.unlocked_powers),
    bagUpgradesPurchased: finiteNumber(storage?.bag_upgrades_purchased),
    tuning: { highestUnlockedSlot: finiteNumber(tuning?.highest_unlocked_slot), slots } };
}

type NormalizedNode = { level: number | null; value: number | null; enabled: boolean | null; state: Record<string, number | boolean> };
function normalizeNodes(value: unknown): Record<string, NormalizedNode> {
  const result: Record<string, NormalizedNode> = {};
  for (const [name, raw] of Object.entries(dynamicRecord(value))) {
    if (typeof raw === "number" && Number.isFinite(raw)) result[name] = { level: raw, value: raw, enabled: null, state: { level: raw } };
    else if (typeof raw === "boolean") result[name] = { level: null, value: null, enabled: raw, state: { enabled: raw } };
    else {
      const state = scalarMap(raw), level = finiteNumber(state.level), nodeValue = finiteNumber(state.value);
      const enabled = typeof state.enabled === "boolean" ? state.enabled : typeof state.toggle === "boolean" ? state.toggle : null;
      result[name] = { level: level ?? nodeValue, value: nodeValue ?? level, enabled, state };
    }
  }
  return result;
}
function nodeLevel(node: NormalizedNode | undefined) { return node?.level ?? node?.value ?? null; }
function dynamicRecord(value: unknown): Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function numericMap(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return { value };
  return Object.fromEntries(Object.entries(dynamicRecord(value)).flatMap(([key, entry]) => typeof entry === "number" && Number.isFinite(entry) ? [[key, entry]] : []));
}
function scalarMap(value: unknown) {
  return Object.fromEntries(Object.entries(dynamicRecord(value)).flatMap(([key, entry]) =>
    (typeof entry === "number" && Number.isFinite(entry)) || typeof entry === "boolean" ? [[key, entry]] : [])) as Record<string, number | boolean>;
}
function finiteNumber(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function scalar(value: unknown): string | number | null { return typeof value === "string" || (typeof value === "number" && Number.isFinite(value)) ? value : null; }
function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
  return Object.entries(dynamicRecord(value)).filter(([, enabled]) => enabled !== false && enabled !== null).map(([id]) => id);
}
function stringMap(value: unknown) {
  return Object.fromEntries(Object.entries(dynamicRecord(value)).flatMap(([key, entry]) => typeof entry === "string" ? [[key, entry]] : []));
}
