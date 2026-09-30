/** Whitelisted Farming field inspection. Raw profile and Garden payloads are never serialized. */
export function inspectFarmingResearch(memberValue: unknown, gardenValue: unknown) {
  const record = (value: unknown): Record<string, unknown> | null =>
    value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
  const keys = (value: unknown) => Object.keys(record(value) ?? {}).sort();
  const numeric = (value: unknown) => Object.fromEntries(Object.entries(record(value) ?? {})
    .filter(([, entry]) => typeof entry === "number" && Number.isFinite(entry)).sort(([a], [b]) => a.localeCompare(b)));
  const list = (value: unknown) => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string").sort() : [];
  const member = record(memberValue), gardenPlayer = record(member?.garden_player_data), jacob = record(member?.jacobs_contest);
  const garden = record(gardenValue), commissions = record(garden?.commission_data), composter = record(garden?.composter_data);
  const active = record(garden?.active_commissions);
  return {
    memberGarden: { present: gardenPlayer !== null, keys: keys(gardenPlayer), nestedKeys: Object.fromEntries(
      Object.entries(gardenPlayer ?? {}).filter(([, value]) => record(value) !== null).map(([key, value]) => [key, keys(value)])) },
    jacobsContest: { present: jacob !== null, keys: keys(jacob), nestedKeys: Object.fromEntries(
      Object.entries(jacob ?? {}).filter(([, value]) => record(value) !== null).map(([key, value]) => [key, keys(value)])),
      farmingLevelCapBonus: number(record(jacob?.perks)?.farming_level_cap) },
    garden: { present: garden !== null, keys: keys(garden), experience: number(garden?.garden_experience),
      resourcesCollected: numeric(garden?.resources_collected), cropUpgradeLevels: numeric(garden?.crop_upgrade_levels),
      unlockedPlotIds: list(garden?.unlocked_plots_ids),
      commissions: { keys: keys(commissions), visits: numeric(commissions?.visits), completed: numeric(commissions?.completed),
        totalCompleted: number(commissions?.total_completed), uniqueNpcsServed: number(commissions?.unique_npcs_served) },
      activeCommissions: Object.fromEntries(Object.entries(active ?? {}).map(([id, value]) => [id, {
        keys: keys(value), status: typeof record(value)?.status === "string" ? record(value)!.status : null,
        requirementItemIds: Array.isArray(record(value)?.requirement) ? (record(value)!.requirement as unknown[])
          .flatMap(entry => typeof record(entry)?.item === "string" ? [record(entry)!.item] : []).sort() : [],
      }])),
      composter: { keys: keys(composter), upgrades: numeric(composter?.upgrades) },
    },
  };
}
