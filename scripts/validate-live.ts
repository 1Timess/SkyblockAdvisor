import assert from "node:assert/strict";
import { normalizedProfileSchema, profilesResponseSchema } from "../src/schemas/normalized-profile";

async function main() {
  const [username, base = "http://localhost:3000"] = process.argv.slice(2);
  if (!username) throw new Error("Usage: npm run validate:live -- <username> [base-url]");
  const url = (route: string, query: Record<string, string>) => `${base}/api/skyblock/${route}?${new URLSearchParams(query)}`;
  const listResponse = await fetch(url("profiles", { username }));
  assert.equal(listResponse.status, 200, "Profile list must return 200");
  const listed = profilesResponseSchema.parse(await listResponse.json());
  assert.ok(listed.profiles.length > 0, "Live validation requires a player with profiles");
  const profileResponse = await fetch(url("profile", { username }));
  assert.equal(profileResponse.status, 200, "Normalized endpoint must return 200");
  const profile = normalizedProfileSchema.parse(await profileResponse.json());
  assert.ok(profile.gear.armor.items.length + profile.gear.equipment.items.length + profile.gear.weapons.length + profile.accessories.owned.length > 0, "Live NBT must yield readable items");
  assert.equal(profile.warnings.some(w => w.code === "INVENTORY_DECODE_FAILED"), false, "All supplied inventories must decode successfully");
  for (const selector of [profile.profile.cuteName.toLowerCase(), profile.profile.id]) {
    const response = await fetch(url("profile", { username, profile: selector }));
    assert.equal(response.status, 200);
    assert.equal(normalizedProfileSchema.parse(await response.json()).profile.id, profile.profile.id);
  }
  const byUuid = await fetch(url("profiles", { username: profile.identity.uuid }));
  assert.equal(byUuid.status, 200);
  assert.equal(profilesResponseSchema.parse(await byUuid.json()).identity.username, profile.identity.username);
  assert.equal((await fetch(url("profile", {}))).status, 400);
  assert.equal((await fetch(url("profile", { username, profile: "__missing_profile__" }))).status, 404);
  console.log(JSON.stringify({ status: "passed", username: profile.identity.username, selectedProfile: profile.profile.cuteName,
    availableProfiles: listed.profiles.map(p => p.cuteName),
    armor: profile.gear.armor.items.length, equipment: profile.gear.equipment.items.length,
    weapons: profile.gear.weapons.length, accessories: profile.accessories.owned.length,
    magicalPower: profile.accessories.magicalPower.total, pets: profile.pets.owned.length,
    skills: Object.keys(profile.progression.skills).length, slayers: Object.keys(profile.progression.slayers).length,
    catacombsLevel: profile.progression.dungeons.catacombs?.level ?? null,
    missingAccessories: profile.accessories.missing.length, accessoryUpgrades: profile.accessories.upgrades.length,
    warningCounts: profile.warnings.reduce<Record<string, number>>((counts, warning) => {
      counts[warning.code] = (counts[warning.code] ?? 0) + 1; return counts;
    }, {}),
  }, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Live validation failed."); process.exitCode = 1; });
