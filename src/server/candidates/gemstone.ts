import type { AdvisorCandidate } from "../../schemas/candidates";
import type { ProfileItem } from "../../schemas/items";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";

const qualityRank = { ROUGH: 0, FLAWED: 1, FINE: 2, FLAWLESS: 3, PERFECT: 4 } as const;
const miningStatByGemstone = { AMBER: "miningSpeed", JADE: "miningFortune", TOPAZ: "pristine" } as const;

export function buildMiningGemstoneUpgradeLanes(profile: NormalizedSkyBlockProfile): Record<string, AdvisorCandidate[]> {
  const lanes: Record<string, AdvisorCandidate[]> = {};
  for (const item of profile.inventoryItems) {
    if (!item.gemstones) continue;
    for (const slot of item.gemstones.slots) {
      const fixedGemstone = slot.slotType in miningStatByGemstone ? slot.slotType as keyof typeof miningStatByGemstone : null;
      const gemstone = slot.gemstoneType && slot.gemstoneType in miningStatByGemstone
        ? slot.gemstoneType as keyof typeof miningStatByGemstone : fixedGemstone;
      if (!gemstone) continue;
      const stat = miningStatByGemstone[gemstone];
      const candidate = gemstoneCandidate(item, slot, gemstone, stat);
      if (!candidate) continue;
      (lanes[stat] ??= []).push(candidate);
    }
  }
  return lanes;
}

function gemstoneCandidate(item: ProfileItem, slot: NonNullable<ProfileItem["gemstones"]>["slots"][number],
  gemstone: keyof typeof miningStatByGemstone, stat: string): AdvisorCandidate | null {
  let operation: string, warning: string;
  if (slot.status === "LOCKED") {
    operation = `Unlock and fill ${slot.id}`;
    warning = `${item.name} has a locked ${slot.slotType} gemstone slot. Unlocking this Divan slot requires a Gemstone Chamber before a ${gemstone} gemstone can be installed.`;
  } else if (slot.status === "UNLOCKED_EMPTY") {
    operation = `Fill empty ${slot.id}`;
    warning = `${item.name} has an unlocked but empty ${slot.slotType} gemstone slot that can accept ${gemstone}.`;
  } else if (slot.status === "FILLED" && slot.quality && qualityRank[slot.quality] < qualityRank.PERFECT) {
    operation = `Upgrade ${slot.id} to PERFECT`;
    warning = `${item.name} has ${slot.quality} ${gemstone} in ${slot.id}; PERFECT is a higher gemstone quality.`;
  } else return null;

  const id = `GEMSTONE:${item.uuid ?? item.id ?? item.name}:${slot.id}:PERFECT`;
  return {
    id,
    domain: item.categories.includes("armor") || item.categories.some(category => ["helmet", "chestplate", "leggings", "boots"].includes(category)) ? "armor" : "tool",
    item: {
      id,
      name: `${operation} on ${item.name}`,
      rarity: item.rarity,
      categories: [...new Set([...item.categories, "item_upgrade", "gemstone_upgrade"])],
      stats: {},
      lore: [],
      abilityText: [],
      setBonusText: [],
      requirements: [],
      unparsedRequirementText: [],
      wiki: null,
      marketKey: id,
      sources: { hypixel: true, neu: false },
    },
    knownChanges: { [stat]: { current: null, candidate: null } },
    requirements: [],
    abilityText: [],
    setBonusText: [],
    warnings: [
      warning,
      `Gemstone upgrade affects ${stat}; exact stat delta and acquisition cost are intentionally not inferred from NBT alone.`,
      "This is an upgrade to an owned item, not a replacement-item recommendation.",
    ],
  };
}
