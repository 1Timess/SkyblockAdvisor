import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { indexForagingGear } from "./gear-state";
import { verifiedForagingGearSweep } from "./reference";

const verifiedItemSweep: Record<string, number> = {
  SERIOUSLY_DAMAGED_AXE: verifiedForagingGearSweep.SERIOUSLY_DAMAGED_AXE,
  FIG_AXE: verifiedForagingGearSweep.FIG_HEW,
  FIGSTONE_AXE: verifiedForagingGearSweep.FIGSTONE_SPLITTER,
  HELIX_CHOPPER: verifiedForagingGearSweep.HELIX_CHOPPER,
  FIG_ARMOR_HELMET: verifiedForagingGearSweep.FIG_ARMOR_PER_PIECE,
  FIG_ARMOR_CHESTPLATE: verifiedForagingGearSweep.FIG_ARMOR_PER_PIECE,
  FIG_ARMOR_LEGGINGS: verifiedForagingGearSweep.FIG_ARMOR_PER_PIECE,
  FIG_ARMOR_BOOTS: verifiedForagingGearSweep.FIG_ARMOR_PER_PIECE,
  HELIX_ARMOR_HELMET: verifiedForagingGearSweep.HELIX_ARMOR_PER_PIECE,
  HELIX_ARMOR_CHESTPLATE: verifiedForagingGearSweep.HELIX_ARMOR_PER_PIECE,
  HELIX_ARMOR_LEGGINGS: verifiedForagingGearSweep.HELIX_ARMOR_PER_PIECE,
  HELIX_ARMOR_BOOTS: verifiedForagingGearSweep.HELIX_ARMOR_PER_PIECE,
};

export function buildForagingGearMechanics(profile: NormalizedSkyBlockProfile) {
  const gear = indexForagingGear(profile);
  const items = gear.visible.flatMap(item => {
    if (!item.id) return [];
    const verifiedBaseSweep = verifiedItemSweep[item.id];
    const observedSweep = typeof item.stats.sweep === "number" ? item.stats.sweep : null;
    const observedForagingFortune = typeof item.stats.foragingFortune === "number" ? item.stats.foragingFortune : null;
    const observedForagingWisdom = typeof item.stats.foragingWisdom === "number" ? item.stats.foragingWisdom : null;
    if (verifiedBaseSweep === undefined && observedSweep === null && observedForagingFortune === null && observedForagingWisdom === null
      && item.foragingState === null && item.gemstones === null) return [];
    return [{
      itemId: item.id, name: item.name, source: item.source, verifiedBaseSweep: verifiedBaseSweep ?? null,
      observedSweep, observedForagingFortune, observedForagingWisdom, stars: item.stars,
      gemstones: item.gemstones, foragingState: item.foragingState,
      warnings: verifiedBaseSweep !== undefined && observedSweep !== null && observedSweep !== verifiedBaseSweep
        ? [`Observed Sweep (${observedSweep}) differs from the verified base mechanic (${verifiedBaseSweep}); the difference is not attributed without proven modifier state.`]
        : [],
    }];
  });
  return { items,
    note: "These are observed owned-item mechanics, not purchase recommendations. verifiedBaseSweep is reference data; observed stats come from the live item. Differences are preserved rather than attributed to an unproven modifier." };
}
