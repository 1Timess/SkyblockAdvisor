import assert from "node:assert/strict";
import test from "node:test";
import { buildNormalizedProfile, listProfiles } from "../src/server/skyblock/profile/build-normalized-profile";
import { normalizedProfileSchema } from "../src/schemas/normalized-profile";
import { fixtureMember, fixtureSources, fixtureProfiles } from "./fixtures/profile";
import { parseProfileQuery, errorResponse } from "../src/server/api";

test("combined profile validates and shares items across all required domains", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources());
  assert.ok(normalizedProfileSchema.safeParse(profile).success);
  assert.equal(profile.economy.purse, 1234); assert.equal(profile.economy.personalBank, 0);
  assert.equal(profile.gear.armor.items.length, 4); assert.equal(profile.gear.equipment.items.length, 1);
  assert.deepEqual(profile.gear.weapons.map(i => i.id), ["TEST_SWORD", "TEST_BOW"]);
  assert.equal(profile.gear.weapons[0].abilityText[1], "A mysterious ability remains readable.");
  assert.equal(profile.accessories.magicalPower.total, 32);
  assert.equal(profile.pets.activePet?.level, 2);
  assert.equal(profile.progression.skills.combat.level, 2);
  assert.equal(profile.progression.slayers.zombie.level, 3);
  assert.equal(profile.progression.dungeons.catacombs?.level, 2);
  assert.equal(profile.warnings.length, 0);
  assert.equal(JSON.stringify(profile).includes("ExtraAttributes"), false);
});
test("a broken inventory and unavailable catalog preserve unrelated profile sections", async () => {
  const member = fixtureMember(); member.inventory!.inv_contents = { data: "not-base64" };
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, {
    ...fixtureSources(member), getItems: async () => { throw new Error("Unavailable"); },
  });
  assert.equal(profile.gear.armor.items.length, 4);
  assert.deepEqual(profile.gear.weapons.map(i => i.id), ["TEST_BOW"]);
  assert.equal(profile.warnings.filter(w => w.code === "INVENTORY_DECODE_FAILED").length, 1);
  assert.ok(profile.warnings.some(w => w.scope === "accessories.catalog"));
});
test("missing API sections return partial data instead of invented levels/balances", async () => {
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources({}));
  assert.equal(profile.economy.purse, null); assert.deepEqual(profile.progression.skills, {});
  assert.equal(profile.progression.dungeons.catacombs, null);
  assert.ok(profile.warnings.some(w => w.code === "API_DATA_DISABLED"));
});
test("selection never silently substitutes a different coop member", async () => {
  const sources = fixtureSources();
  sources.getProfiles = async () => [{ ...fixtureProfiles()[0], members: { otherMember: {} } }];
  await assert.rejects(buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, sources), { code: "MEMBER_NOT_FOUND" });
});
test("profile listing and input validation are independent of a particular username", async () => {
  const result = await listProfiles("OtherPlayer", { ...fixtureSources(), resolvePlayer: async () => ({ username: "OtherPlayer", uuid: "a".repeat(32) }) });
  assert.equal(result.identity.username, "OtherPlayer"); assert.equal(result.profiles[0].cuteName, "Apple");
  assert.throws(() => parseProfileQuery(new Request("http://localhost/api/skyblock/profile")), { code: "INVALID_USERNAME" });
  assert.equal(parseProfileQuery(new Request("http://localhost/api/skyblock/profile?username=OtherPlayer&profile=Apple")).requestedProfile, "Apple");
});
test("unexpected API failures never expose secrets or stack traces", async () => {
  const response = errorResponse(new Error("secret-key-value"));
  assert.equal(response.status, 500); assert.equal((await response.text()).includes("secret-key-value"), false);
});
