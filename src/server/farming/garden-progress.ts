import milestones from "../reference/garden-milestones.json";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
const count = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const counts = (value: unknown) => Object.fromEntries(Object.entries(record(value)).flatMap(([key, raw]) => {
  const amount = count(raw);
  return amount === null ? [] : [[key, amount]];
}));
const milestone = (observed: number | null, thresholds: readonly number[]) => observed === null ? null : (() => {
  const index = thresholds.findIndex(threshold => threshold > observed);
  return index < 0 ? null : { tier: index + 1, threshold: thresholds[index], remaining: thresholds[index] - observed };
})();

/** Garden endpoint data is profile-wide. Nulls distinguish unreported progress from zero. */
export function buildGardenProgress(raw: unknown) {
  if (raw === null) return { available: false as const, gardenXp: null, gardenLevel: null, nextGardenLevel: null,
    resourcesCollected: {}, cropUpgradeLevels: {}, unlockedPlotIds: [], totalOffersAccepted: null,
    uniqueVisitorsServed: null, nextOffersMilestone: null, nextUniqueVisitorsMilestone: null,
    visitorCompletions: {}, activeOffers: [], composterUpgrades: {}, greenhouseSlotObservation: { status: "UNREPORTED" as const, count: null } };
  const garden = record(raw), commissions = record(garden.commission_data);
  const gardenXp = count(garden.garden_experience), totalOffersAccepted = count(commissions.total_completed);
  const uniqueVisitorsServed = count(commissions.unique_npcs_served);
  const gardenLevel = gardenXp === null ? null : milestones.gardenLevelCumulativeXp.filter(xp => xp <= gardenXp).length;
  const next = milestone(gardenXp, milestones.gardenLevelCumulativeXp);
  return {
    available: true as const, gardenXp, gardenLevel,
    nextGardenLevel: next ? { level: next.tier, xpRequired: next.threshold, xpRemaining: next.remaining } : null,
    resourcesCollected: counts(garden.resources_collected), cropUpgradeLevels: counts(garden.crop_upgrade_levels),
    unlockedPlotIds: Array.isArray(garden.unlocked_plots_ids) ? garden.unlocked_plots_ids.filter((id): id is string => typeof id === "string") : [],
    totalOffersAccepted, uniqueVisitorsServed, nextOffersMilestone: milestone(totalOffersAccepted, milestones.offersAccepted),
    nextUniqueVisitorsMilestone: milestone(uniqueVisitorsServed, milestones.uniqueVisitorsServed),
    visitorCompletions: counts(commissions.completed),
    activeOffers: Object.entries(record(garden.active_commissions)).map(([visitor, rawOffer]) => {
      const offer = record(rawOffer);
      return { visitor, status: typeof offer.status === "string" ? offer.status : null,
        requirements: Array.isArray(offer.requirement) ? offer.requirement.flatMap(rawRequirement => {
          const requirement = record(rawRequirement);
          return typeof requirement.item === "string" && count(requirement.amount) !== null
            ? [{ itemId: requirement.item, amount: count(requirement.amount)! }] : [];
        }) : [] };
    }),
    composterUpgrades: counts(record(garden.composter_data).upgrades),
    greenhouseSlotObservation: Array.isArray(garden.greenhouse_slots)
      ? { status: "REPORTED" as const, count: garden.greenhouse_slots.length }
      : { status: "UNREPORTED" as const, count: null },
  };
}
