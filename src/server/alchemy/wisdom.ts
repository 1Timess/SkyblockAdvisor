import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";

export interface AlchemyWisdomSource {
  id: string; name: string; wisdom: number | null;
  status: "ACTIVE" | "OWNED_INACTIVE" | "UNOBSERVED" | "UNREPORTED";
  evidence: string;
}

export interface AlchemyWisdomState {
  confirmedWisdom: number;
  effectiveWisdomStatus: "PARTIAL";
  sources: AlchemyWisdomSource[];
  effectiveXpMultiplierFloor: number;
  witch: {
    owned: boolean; active: boolean; rarity: string | null; level: number | null;
    wisdom: number | null; brewTimeReductionPercent: number | null; brewSeconds: number | null;
  };
}

const witchBrewReduction = (rarity: string, level: number | null) => {
  if (level === null) return null;
  const upper = rarity.toUpperCase();
  const perLevel = upper === "RARE" ? 0.4 : upper === "EPIC" || upper === "LEGENDARY" ? 0.5 : 0;
  return Math.min(50, Math.max(0, level * perLevel));
};

export function buildAlchemyWisdomState(profile: NormalizedSkyBlockProfile): AlchemyWisdomState {
  const spider = profile.progression.slayers.spider;
  const spiderEight = spider?.level >= 8;
  const witchPets = profile.pets.owned.filter(pet => pet.type.toUpperCase() === "WITCH");
  const activeWitch = profile.pets.activePet?.type.toUpperCase() === "WITCH" ? profile.pets.activePet : null;
  const bestWitch = activeWitch ?? [...witchPets].sort((a,b) => (b.level ?? -1) - (a.level ?? -1))[0] ?? null;
  const witchWisdom = activeWitch?.level === null || activeWitch?.level === undefined ? null : Math.min(5, activeWitch.level * 0.05);
  const reduction = activeWitch ? witchBrewReduction(activeWitch.rarity, activeWitch.level) : null;
  const accessory = profile.accessories.owned.find(item => ["WITCH'S_ARTIFACT","WITCH'S_RING","WITCH'S_TALISMAN"]
    .some(name => item.name.toUpperCase().includes(name))) ?? null;
  const accessoryWisdom = accessory ? accessory.name.toUpperCase().includes("ARTIFACT") ? 1.5
    : accessory.name.toUpperCase().includes("RING") ? 1 : 0.5 : 0;
  const confirmedWisdom = (spiderEight ? 5 : 0) + (witchWisdom ?? 0) + accessoryWisdom;
  return {
    confirmedWisdom,
    effectiveWisdomStatus: "PARTIAL",
    effectiveXpMultiplierFloor: 1 + confirmedWisdom / 100,
    sources: [
      { id: "SPIDER_SLAYER_8", name: "Spider Slayer VIII", wisdom: 5, status: spiderEight ? "ACTIVE" : "UNOBSERVED",
        evidence: "Normalized Spider Slayer level." },
      { id: "WITCH_PET", name: "Active Witch Pet", wisdom: witchWisdom, status: activeWitch ? "ACTIVE" : witchPets.length ? "OWNED_INACTIVE" : "UNOBSERVED",
        evidence: activeWitch ? "Normalized active pet." : "No active Witch Pet is observed." },
      { id: "WITCH_ACCESSORY", name: accessory?.name ?? "Witch accessory line", wisdom: accessory ? accessoryWisdom : null,
        status: accessory ? "ACTIVE" : "UNOBSERVED", evidence: accessory ? "Observed active accessory/inventory state." : "No Witch accessory is observed." },
      { id: "BOOSTER_COOKIE", name: "Booster Cookie", wisdom: 25, status: "UNREPORTED", evidence: "Cookie buff state is not normalized." },
      { id: "ALCHEMY_XP_BOOST_III", name: "Alchemy XP Boost III / God Potion", wisdom: 20, status: "UNREPORTED",
        evidence: "Active potion effects are not normalized." },
      { id: "CELESTIAL_MASON_JAR", name: "Celestial Mason Jar", wisdom: 3, status: "UNREPORTED",
        evidence: "Consumed temporary Alchemy Wisdom is not normalized." },
    ],
    witch: {
      owned: witchPets.length > 0, active: activeWitch !== null, rarity: bestWitch?.rarity ?? null, level: bestWitch?.level ?? null,
      wisdom: activeWitch ? witchWisdom : null, brewTimeReductionPercent: reduction,
      brewSeconds: reduction === null ? null : 20 * (1 - reduction / 100),
    },
  };
}
