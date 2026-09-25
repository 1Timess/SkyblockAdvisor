import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";

export const miningMechanics = {
  access: { crystalHollowsHotm: 4, glaciteTunnelsHotm: 7 },
  statRoles: {
    general: ["miningSpeed", "miningFortune"],
    gemstone: ["gemstoneFortune", "pristine"],
    glacite: ["coldResistance"],
  },
  facts: [
    "Pristine increases the chance for mined Gemstones to drop at a higher quality.",
    "In the Glacite Tunnels, Cold above Cold Resistance reduces Mining Speed by 0.5% per point.",
  ],
} as const;

export function buildMiningKnowledge(profile: NormalizedSkyBlockProfile) {
  const mining = profile.progression.mining, hotmLevel = mining.hotmLevel;
  const crystalActivity = Object.values(mining.crystalHollows.crystals).some(crystal =>
    (crystal.totalFound ?? 0) > 0 || crystal.state === "FOUND" || crystal.state === "PLACED");
  const glaciteActivity = (mining.glaciteTunnels.mineshaftsEntered ?? 0) > 0
    || (mining.glaciteTunnels.totalCorpsesLooted ?? 0) > 0 || (mining.powder.glacite ?? 0) > 0
    || mining.glaciteTunnels.fossilsDonated.length > 0;
  const crystalHollowsEligible = hotmLevel !== null && hotmLevel >= miningMechanics.access.crystalHollowsHotm;
  const glaciteTunnelsEligible = hotmLevel !== null && hotmLevel >= miningMechanics.access.glaciteTunnelsHotm;
  const stage: "EARLY" | "DWARVEN_MINES" | "CRYSTAL_HOLLOWS" | "GLACITE_TUNNELS" = glaciteActivity ? "GLACITE_TUNNELS"
    : crystalActivity ? "CRYSTAL_HOLLOWS" : hotmLevel !== null && hotmLevel > 0 ? "DWARVEN_MINES" : "EARLY";
  return {
    stage,
    access: {
      crystalHollowsHotmRequirement: miningMechanics.access.crystalHollowsHotm, crystalHollowsEligible,
      glaciteTunnelsHotmRequirement: miningMechanics.access.glaciteTunnelsHotm, glaciteTunnelsEligible,
    },
    activity: { crystalHollows: crystalActivity, glaciteTunnels: glaciteActivity },
    relevantStats: miningRelevantStats(profile),
    facts: [...miningMechanics.facts],
  };
}

export function miningRelevantStats(profile: NormalizedSkyBlockProfile) {
  const mining = profile.progression.mining, hotm = mining.hotmLevel;
  const crystal = (hotm !== null && hotm >= miningMechanics.access.crystalHollowsHotm)
    || Object.values(mining.crystalHollows.crystals).some(value => (value.totalFound ?? 0) > 0 || value.state === "FOUND" || value.state === "PLACED");
  const glacite = (hotm !== null && hotm >= miningMechanics.access.glaciteTunnelsHotm)
    || (mining.glaciteTunnels.mineshaftsEntered ?? 0) > 0 || (mining.glaciteTunnels.totalCorpsesLooted ?? 0) > 0
    || (mining.powder.glacite ?? 0) > 0 || mining.glaciteTunnels.fossilsDonated.length > 0;
  return [...miningMechanics.statRoles.general,
    ...(crystal ? miningMechanics.statRoles.gemstone : []),
    ...(glacite ? miningMechanics.statRoles.glacite : [])];
}
