/** Bounded field-shape inspection; excludes raw plot layouts, inventories, and timestamps. */
export function inspectFarmingDepth(memberValue: unknown, gardenValue: unknown) {
  const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  const keys = (value: unknown) => Object.keys(object(value) ?? {}).sort();
  const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
  const shape = (value: unknown) => {
    const fields = object(value);
    if (fields) return { kind: "OBJECT" as const, count: Object.keys(fields).length, keys: keys(fields), entryShapes: Object.fromEntries(
      Object.entries(fields).slice(0, 4).map(([key, entry]) => [key, { keys: keys(entry), arrayLength: Array.isArray(entry) ? entry.length : null, number: number(entry) }])) };
    if (Array.isArray(value)) return { kind: "ARRAY" as const, count: value.length, sampleEntryKeys: keys(value[0]) };
    return { kind: value === undefined ? "ABSENT" as const : value === null ? "NULL" as const : typeof value, number: number(value) };
  };
  const member = object(memberValue), garden = object(gardenValue);
  const relevantMemberKeys = keys(member).filter(key => /garden|pest|farming|mutation|greenhouse|plot|jacob/i.test(key));
  return {
    memberFields: Object.fromEntries(relevantMemberKeys.map(key => [key, { keys: keys(member?.[key]), nestedKeys: Object.fromEntries(
      Object.entries(object(member?.[key]) ?? {}).filter(([nested]) => /pest|mutation|greenhouse|plot/i.test(nested))
        .map(([nested, value]) => [nested, keys(value)])) }])),
    gardenFields: { unlockedPlotIds: Array.isArray(garden?.unlocked_plots_ids) ? garden.unlocked_plots_ids.filter((id): id is string => typeof id === "string").sort() : null,
      greenhouseSlots: shape(garden?.greenhouse_slots), gardenUpgrades: shape(garden?.garden_upgrades),
      pestFields: Object.fromEntries(keys(garden).filter(key => /pest/i.test(key)).map(key => [key, shape(garden?.[key])])),
      relevantTopLevelKeys: keys(garden).filter(key => /pest|mutation|greenhouse|plot/i.test(key)) },
  };
}
