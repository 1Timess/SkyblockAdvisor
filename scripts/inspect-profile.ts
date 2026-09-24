import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { AppError } from "../src/server/errors";

async function main() {
  const [usernameOrUuid, requestedProfile] = process.argv.slice(2);
  if (!usernameOrUuid) throw new Error("Usage: npm run inspect:profile -- <username-or-uuid> [profile]");
  const profile = await buildNormalizedProfile({ usernameOrUuid, requestedProfile });
  // Deliberately print a compact checkpoint, not a permanent player-data fixture.
  console.log(JSON.stringify({ identity: profile.identity, profile: profile.profile, counts: {
    armor: profile.gear.armor.items.length, equipment: profile.gear.equipment.items.length,
    weapons: profile.gear.weapons.length, accessories: profile.accessories.owned.length,
    pets: profile.pets.owned.length, skills: Object.keys(profile.progression.skills).length,
  }, magicalPower: profile.accessories.magicalPower,
  mining: profile.progression.mining,
  foraging: { level: profile.progression.skills.foraging ?? null, ...profile.progression.foraging },
  accessories: { selectedPower: profile.accessories.selectedPower, highestMagicalPower: profile.accessories.highestMagicalPower,
    unlockedPowers: profile.accessories.unlockedPowers, bagUpgradesPurchased: profile.accessories.bagUpgradesPurchased, tuning: profile.accessories.tuning },
  fishing: { level: profile.progression.skills.fishing ?? null, ...profile.progression.fishing },
  extendedCounts: { attributes: Object.keys(profile.attributes).length, collections: Object.keys(profile.collections).length,
    craftedGenerators: profile.craftedGenerators.length, bestiaryKills: Object.keys(profile.bestiary.kills).length },
  warningCounts: profile.warnings.reduce<Record<string, number>>((counts, warning) => {
    counts[warning.code] = (counts[warning.code] ?? 0) + 1; return counts;
  }, {}),
  dataWarnings: profile.warnings.filter(w => w.code !== "UNKNOWN_ITEM_CATEGORY" && w.code !== "UNKNOWN_ITEM_STAT"),
  }, null, 2));
}
main().catch(error => {
  console.error(error instanceof AppError ? `${error.code}: ${error.message}` : "Profile inspection failed; check the input and server configuration.");
  process.exitCode = 1;
});
