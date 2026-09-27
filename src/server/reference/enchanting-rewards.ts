import { possibleExperimentRewardSchema, type PossibleExperimentReward } from "../../schemas/enchanting-mechanics";

const patch = "https://hypixel.net/threads/hypixel-skyblock-0-21-1-experimentation-table-rng-meter-abandoned-quarry-and-more.5839374/";
const wiki = "https://hypixelskyblock.minecraft.wiki/w/Experiments";

// Patch 0.21.1 replaced the Basic/Advanced book pools. These names are possible
// rewards, not owned items, RNG Meter progress, expected values, or drop chances.
const rareBooks = [
  "Respite III", "Chance IV", "Syphon IV", "Life Steal IV", "Scavenger V", "Giant Killer VI",
  "Growth VI", "Titan Killer VI", "Projectile Protection VI", "Fire Protection VI",
  "Blast Protection VI", "Protection VI", "Power VI", "Ender Slayer VI", "Sharpness VI", "Thunderbolt VI",
] as const;

const ultraRareBooks = [
  "Snipe IV", "First Strike V", "Triple-Strike V", "Life Steal V", "Looting V", "Chance V",
  "Syphon V", "Prosecute VI", "Cleave VI", "Execute VI", "Venomous VI", "Cubism VI",
  "Thunderlord VII", "Thunderbolt VII", "Critical VII", "Titan Killer VII", "Luck VII",
  "Sharpness VII", "Protection VII", "Projectile Protection VII", "Power VII",
  "Blast Protection VII", "Fire Protection VII", "Giant Killer VII", "Growth VII",
  "Ender Slayer VII", "Smite VII", "Bane of Arthropods VII",
] as const;

const reward = (name: string, kind: PossibleExperimentReward["kind"], pool: PossibleExperimentReward["pool"],
  minimumStake: PossibleExperimentReward["minimumStake"], source: string,
  minimumStakeSource: string | null = minimumStake === null ? null : source): PossibleExperimentReward =>
  possibleExperimentRewardSchema.parse({ name, kind, pool, minimumStake, source, minimumStakeSource });

export const possibleExperimentRewards: readonly PossibleExperimentReward[] = Object.freeze([
  ...rareBooks.map(name => reward(name, "ENCHANTED_BOOK", "RARE", null, patch)),
  ...ultraRareBooks.map(name => reward(name, "ENCHANTED_BOOK", "ULTRA_RARE", "SUPREME", patch, wiki)),
  reward("Golden Bounty", "ENDCAP_UPGRADE", "ULTRA_RARE", "SUPREME", patch, wiki),
  reward("A Beginner's Guide to Pesthunting", "ENDCAP_UPGRADE", "ULTRA_RARE", "SUPREME", patch, wiki),
  reward("Guardian Pet", "PET", "OTHER", "BEGINNER", wiki),
  reward("Metaphysical Serum", "CONSUMABLE", "OTHER", "GRAND", wiki),
  reward("Nadeshiko Dye", "DYE", "OTHER", "SUPREME", wiki),
  reward("Experiment the Fish", "COSMETIC", "OTHER", "METAPHYSICAL", wiki),
]);
