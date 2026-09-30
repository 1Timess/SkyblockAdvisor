export const TAMING_BASE_CAP = 50;
export const TAMING_MAX_CAP = 60;

export const tamingXpMechanics = {
  petXpConversionRate: {
    COMBAT: 0.25,
    MINING: 0.25,
    FARMING: 0.25,
    FORAGING: 0.25,
    FISHING: 0.25,
    ENCHANTING: 0.25,
    ALCHEMY: 0.025,
  },
  unsupportedSkillSources: ["CARPENTRY", "RUNECRAFTING", "SOCIAL", "DUNGEONEERING"],
  note: "Taming XP is derived from Pet XP actually earned, not directly from the raw skill XP event. Taming Wisdom then modifies Taming XP.",
} as const;

export const tamingLevelRewards = {
  petLuckPerLevel: 1,
  extraPetXpPercentPerLevel: 1,
  expSharePercentPerLevel: 0.2,
} as const;

export const tamingServiceUnlocks = [
  { level: 1, service: "KAT", unlock: "Common to Uncommon pet upgrades" },
  { level: 5, service: "KAT", unlock: "Uncommon to Rare pet upgrades" },
  { level: 10, service: "KAT", unlock: "Rare to Epic pet upgrades" },
  { level: 10, service: "FANN", unlock: "Free Training" },
  { level: 20, service: "KAT", unlock: "Epic to Legendary pet upgrades" },
  { level: 20, service: "FANN", unlock: "Light Training" },
  { level: 25, service: "KAT", unlock: "Legendary to Mythic pet upgrades" },
  { level: 30, service: "FANN", unlock: "Moderate Training" },
  { level: 40, service: "FANN", unlock: "Expert Training" },
  { level: 50, service: "FANN", unlock: "Ultra Training" },
  { level: 60, service: "FANN", unlock: "Turbo Training" },
] as const;

export const georgeCapRequirements = [
  { petType: "RIFT FERRET", minimumRarity: "EPIC" },
  { petType: "SLUG", minimumRarity: "EPIC" },
  { petType: "SPIRIT", minimumRarity: "EPIC" },
  { petType: "GIRAFFE", minimumRarity: "EPIC" },
  { petType: "JELLYFISH", minimumRarity: "EPIC" },
  { petType: "BAL", minimumRarity: "EPIC" },
  { petType: "BABY YETI", minimumRarity: "EPIC" },
  { petType: "BLACK CAT", minimumRarity: "LEGENDARY" },
  { petType: "FROST WISP", minimumRarity: "RARE" },
  { petType: "ENDERMAN", minimumRarity: "MYTHIC" },
] as const;

export const tamingMechanics = {
  purpose: "Skill progression earned through Pet XP. Taming owns skill XP, level rewards, service unlocks, and the George cap extension; individual pet recommendations remain in the Pets domain.",
  baseCap: TAMING_BASE_CAP,
  maxCap: TAMING_MAX_CAP,
  georgeSubmissionsMayBeCompletedInAnyOrder: true,
} as const;
