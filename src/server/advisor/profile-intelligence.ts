import type { AdvisorDomainContext, ProfileIntelligenceDomain } from "../../schemas/advisor";
import type { ItemStats, ProfileItem } from "../../schemas/items";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { TtlCache } from "../cache/ttl-cache";
import { buildNormalizedProfile } from "../skyblock/profile/build-normalized-profile";
import { buildMiningKnowledge, miningRelevantStats } from "../reference/mining-knowledge";

export interface ProfileIntelligenceSnapshot {
  snapshotId: string;
  profile: NormalizedSkyBlockProfile;
  canonical: {
    identity: NormalizedSkyBlockProfile["identity"];
    profile: { id: string; cuteName: string; selected: boolean; gameMode: string | null; snapshotId: string; fetchedAt: string };
    economy: NormalizedSkyBlockProfile["economy"];
    skills: Record<string, { level: number; maxLevel: number }>;
    slayers: Record<string, { level: number; xp: number }>;
    dungeons: { catacombsLevel: number | null; selectedClass: string | null; highestFloorNormal: number | null; highestFloorMaster: number | null };
    magicalPower: number;
  };
  domains: Record<ProfileIntelligenceDomain, AdvisorDomainContext>;
}

const fishingStats = ["fishingSpeed", "seaCreatureChance"] as const;

export function buildProfileIntelligence(profile: NormalizedSkyBlockProfile): ProfileIntelligenceSnapshot {
  const version = profile.meta.sourceUpdatedAt ?? profile.meta.fetchedAt;
  const snapshotId = `${profile.identity.uuid}:${profile.profile.id}:${version}`;
  const compact = (item: ProfileItem) => ({ id: item.id, name: item.name, rarity: item.rarity, categories: item.categories,
    stats: item.stats, abilityText: item.abilityText, setBonusText: item.setBonusText });
  const compactPet = (pet: NormalizedSkyBlockProfile["pets"]["owned"][number]) => ({ type: pet.type, name: pet.name,
    rarity: pet.rarity, level: pet.level, heldItem: pet.heldItem, stats: pet.stats, abilityLore: pet.abilityLore });
  const dungeon = profile.progression.dungeons;
  const fishingTools = byCategory(profile.inventoryItems, ["fishing_rod"]);
  const miningTools = byCategory(profile.inventoryItems, ["pickaxe", "drill"]);
  const ownedArmor = profile.inventoryItems.filter(item => item.categories.includes("armor"));
  const ownedEquipment = profile.inventoryItems.filter(item => item.categories.includes("equipment"));
  const fishingArmor = withStats(ownedArmor, fishingStats);
  const fishingEquipment = withStats(ownedEquipment, fishingStats);
  const miningStats = miningRelevantStats(profile), miningKnowledge = buildMiningKnowledge(profile);
  const miningArmor = withStats(ownedArmor, miningStats);
  const miningEquipment = withStats(ownedEquipment, miningStats);
  const fishingPets = profile.pets.owned.filter(pet => hasAnyStat(pet.stats, fishingStats));
  const miningPets = profile.pets.owned.filter(pet => hasAnyStat(pet.stats, miningStats));
  return {
    snapshotId,
    profile,
    canonical: {
      identity: profile.identity,
      profile: { id: profile.profile.id, cuteName: profile.profile.cuteName, selected: profile.profile.selected,
        gameMode: profile.profile.gameMode, snapshotId, fetchedAt: profile.meta.fetchedAt },
      economy: profile.economy,
      skills: Object.fromEntries(Object.entries(profile.progression.skills).map(([id, value]) => [id, { level: value.level, maxLevel: value.maxLevel }])),
      slayers: Object.fromEntries(Object.entries(profile.progression.slayers).map(([id, value]) => [id, { level: value.level, xp: value.xp }])),
      dungeons: { catacombsLevel: dungeon.catacombs?.level ?? null, selectedClass: dungeon.selectedClass,
        highestFloorNormal: dungeon.highestFloorNormal, highestFloorMaster: dungeon.highestFloorMaster },
      magicalPower: profile.accessories.magicalPower.total,
    },
    domains: {
      DUNGEONS: { domain: "DUNGEONS", catacombsLevel: dungeon.catacombs?.level ?? null, selectedClass: dungeon.selectedClass,
        highestFloorNormal: dungeon.highestFloorNormal, highestFloorMaster: dungeon.highestFloorMaster,
        armor: profile.gear.armor.items.map(compact), weapons: profile.gear.weapons.map(compact),
        equipment: profile.gear.equipment.items.map(compact), activePet: profile.pets.activePet ? compactPet(profile.pets.activePet) : null },
      ACCESSORIES: { domain: "ACCESSORIES", selectedPower: profile.accessories.selectedPower,
        magicalPower: profile.accessories.magicalPower.total, highestMagicalPower: profile.accessories.highestMagicalPower,
        unlockedPowers: profile.accessories.unlockedPowers, bagUpgradesPurchased: profile.accessories.bagUpgradesPurchased,
        tuning: profile.accessories.tuning,
        owned: profile.accessories.owned.map(item => ({ ...compact(item), active: item.active, inactiveReason: item.inactiveReason })),
        missing: profile.accessories.missing.map(({ id, name, rarity }) => ({ id, name, rarity })),
        upgrades: profile.accessories.upgrades.map(({ id, name, rarity }) => ({ id, name, rarity })) },
      FISHING: { domain: "FISHING", fishingLevel: compactLevel(profile.progression.skills.fishing),
        itemsFished: profile.progression.fishing.itemsFished, seaCreatureKills: profile.progression.fishing.seaCreatureKills,
        trophyFish: profile.progression.fishing.trophyFish,
        tools: fishingTools.map(compact), armor: fishingArmor.map(compact), equipment: fishingEquipment.map(compact), pets: fishingPets.map(compactPet),
        knownStats: knownStats([...fishingTools, ...fishingArmor, ...fishingEquipment], fishingPets, fishingStats),
        unavailableFacts: fishingPets.length ? [] : ["Pet fishing effects are unavailable in the normalized profile data."] },
      MINING: { domain: "MINING", miningLevel: compactLevel(profile.progression.skills.mining), hotmLevel: profile.progression.mining.hotmLevel,
        treeExperience: profile.progression.mining.treeExperience, nodes: profile.progression.mining.nodes,
        selectedAbility: profile.progression.mining.selectedAbility, selectedAbilities: profile.progression.mining.selectedAbilities,
        selectedTreeSlot: profile.progression.mining.selectedTreeSlot, selectedTreeSlots: profile.progression.mining.selectedTreeSlots,
        tokensSpent: profile.progression.mining.tokensSpent, tokensSpentByTree: profile.progression.mining.tokensSpentByTree,
        mithrilPowder: profile.progression.mining.powder.mithril,
        gemstonePowder: profile.progression.mining.powder.gemstone, glacitePowder: profile.progression.mining.powder.glacite,
        miningKnowledge, crystalHollows: profile.progression.mining.crystalHollows, glaciteTunnels: profile.progression.mining.glaciteTunnels,
        crystals: profile.progression.mining.crystals, biomes: profile.progression.mining.biomes,
        tools: miningTools.map(compact), armor: miningArmor.map(compact),
        equipment: miningEquipment.map(compact), pets: miningPets.map(compactPet),
        knownStats: knownStats([...miningTools, ...miningArmor, ...miningEquipment], miningPets, miningStats),
        unavailableFacts: miningPets.length ? [] : ["Pet mining effects are unavailable in the normalized profile data."] },
    },
  };
}

export class AdvisorProfileSnapshotCache {
  private aliases: TtlCache;
  private snapshots: TtlCache;
  constructor(private ttlSeconds = 300, now: () => number = Date.now) {
    this.aliases = new TtlCache(now);
    this.snapshots = new TtlCache(now);
  }

  async getOrLoad(input: { usernameOrUuid: string; requestedProfile?: string; profileSnapshotId?: string },
    loader: (input: { usernameOrUuid: string; requestedProfile?: string }) => Promise<NormalizedSkyBlockProfile> = buildNormalizedProfile) {
    if (input.profileSnapshotId) {
      const cached = this.snapshots.get<ProfileIntelligenceSnapshot>(input.profileSnapshotId);
      if (cached) return { snapshot: cached, cacheReused: true };
    }
    const alias = `${input.usernameOrUuid.toLowerCase()}:${(input.requestedProfile ?? "selected").toLowerCase()}`;
    const knownId = this.aliases.get<string>(alias);
    if (knownId) {
      const cached = this.snapshots.get<ProfileIntelligenceSnapshot>(knownId);
      if (cached) return { snapshot: cached, cacheReused: true };
    }
    const snapshot = buildProfileIntelligence(await loader({ usernameOrUuid: input.usernameOrUuid, requestedProfile: input.requestedProfile }));
    this.snapshots.set(snapshot.snapshotId, snapshot, this.ttlSeconds);
    this.aliases.set(alias, snapshot.snapshotId, this.ttlSeconds);
    return { snapshot, cacheReused: false };
  }
}

export const advisorProfileSnapshotCache = new AdvisorProfileSnapshotCache();

function compactLevel(level: NormalizedSkyBlockProfile["progression"]["skills"][string] | undefined) {
  return level ? { level: level.level, maxLevel: level.maxLevel } : null;
}
function byCategory(items: readonly ProfileItem[], categories: readonly string[]) {
  return items.filter(item => categories.some(category => item.categories.includes(category)));
}
function withStats(items: readonly ProfileItem[], stats: readonly string[]) { return items.filter(item => hasAnyStat(item.stats, stats)); }
function hasAnyStat(stats: ItemStats, names: readonly string[]) { return names.some(name => stats[name] !== undefined); }
function knownStats(items: readonly ProfileItem[], pets: readonly NormalizedSkyBlockProfile["pets"]["owned"][number][], supportedStats: readonly string[]) {
  const totals: ItemStats = {};
  for (const source of [...items, ...pets]) for (const stat of supportedStats) if (source.stats[stat] !== undefined) totals[stat] = (totals[stat] ?? 0) + source.stats[stat];
  return { totals, supportedStats: [...supportedStats] };
}
