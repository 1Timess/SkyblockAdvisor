import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";

export interface GodPotionMixinReference {
  id: string;
  name: string;
  effect: string;
  requirement: { slayer: "zombie" | "spider" | "wolf" | "enderman" | "blaze"; level: 8 } | null;
}

export const godPotionMixins: readonly GodPotionMixinReference[] = [
  { id: "ZOMBIE_BRAIN_MIXIN", name: "Zombie Brain Mixin", effect: "+10 Ferocity.", requirement: { slayer: "zombie", level: 8 } },
  { id: "SPIDER_EGG_MIXIN", name: "Spider Egg Mixin", effect: "+15 Crit Damage.", requirement: { slayer: "spider", level: 8 } },
  { id: "WOLF_FUR_MIXIN", name: "Wolf Fur Mixin", effect: "+7 Magic Find when slaying monsters in one hit.", requirement: { slayer: "wolf", level: 8 } },
  { id: "END_PORTAL_FUMES_MIXIN", name: "End Portal Fumes", effect: "Soulflow conversions provide +30% more overflow.", requirement: { slayer: "enderman", level: 8 } },
  { id: "GABAGOEY_MIXIN", name: "Gabagoey Mixin", effect: "+5% True Defense.", requirement: { slayer: "blaze", level: 8 } },
  { id: "DEEPTERROR_MIXIN", name: "Deepterror Mixin", effect: "+210 Health and +40 Defense in The End and Crimson Isle.", requirement: null },
  { id: "MUSHED_MUSHROOM_MIXIN", name: "Glowing Mush Mixin", effect: "+30 Fishing Speed unless supplied by Mushed Glowy Tonic.", requirement: null },
  { id: "HOT_CHOCOLATE_MIXIN", name: "Hot Chocolate Mixin", effect: "+15 Pet Luck and +0.05x Chocolate per second.", requirement: null },
  { id: "BLENDED_FISH_MIXIN", name: "Blended Fish Mixin", effect: "+25% Fishy Treats from Bouncy Beach Ball variants.", requirement: null },
  { id: "PIG_BRAIN_MIXIN", name: "Pig Brain Mixin", effect: "+50% chance for Shiny Pigs to drop Potato Talisman or Blood God Crest.", requirement: null },
  { id: "MELON_JUICE_MIXIN", name: "Melon Juice Mixin", effect: "+15 Farming Fortune.", requirement: null },
  { id: "HOTSPOT_TONIC_MIXIN", name: "Hotspot Tonic Mixin", effect: "+10% chance to catch Hotspot Sea Creatures while fishing in a Hotspot.", requirement: null },
  { id: "CELESTIAL_MASON_JAR", name: "Celestial Mason Jar", effect: "+3 Magic Find, +5 Tracking, +3 Wisdom, +15 Farming Fortune, +15 Foraging Fortune, and +15 Mining Fortune.", requirement: null },
] as const;

export function mixinRequirementStatus(profile: NormalizedSkyBlockProfile, mixin: GodPotionMixinReference): "AVAILABLE" | "LOCKED" | "NO_REQUIREMENT" | "UNKNOWN" {
  if (!mixin.requirement) return "NO_REQUIREMENT";
  const slayer = profile.progression.slayers[mixin.requirement.slayer];
  if (!slayer || slayer.level === null) return "UNKNOWN";
  return slayer.level >= mixin.requirement.level ? "AVAILABLE" : "LOCKED";
}
