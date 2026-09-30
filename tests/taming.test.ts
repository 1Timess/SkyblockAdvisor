import assert from "node:assert/strict";
import test from "node:test";
import { advisorDomainContextSchema } from "../src/schemas/advisor";
import { buildTamingAdvisorContext } from "../src/server/taming/advisor-context";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";
import { fixtureMember, fixtureSources } from "./fixtures/profile";

test("Taming reports base progression and level rewards without entering pet recommendations", async () => {
  const member = fixtureMember();
  member.player_data!.experience!.SKILL_TAMING = 0;
  member.pets_data = { ...member.pets_data, pet_care: { ...member.pets_data?.pet_care, pet_types_sacrificed: [] } };
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  const context = buildTamingAdvisorContext(profile);
  assert.equal(context.domain, "TAMING"); if (context.domain !== "TAMING") throw new Error("unreachable");
  assert.equal(context.skill.observedCap, 50);
  assert.equal(context.georgeCap.observedSubmissions, 0);
  assert.equal(context.progressionFocus.actions[0]?.kind, "LEVEL_TAMING");
  assert.equal(context.xpMechanics.petXpConversionRate.ALCHEMY, 0.025);
  assert.equal(context.xpMechanics.petXpConversionRate.COMBAT, 0.25);
  assert.equal(context.xpMechanics.effectiveTamingWisdom, null);
  assert.equal(context.georgeCap.requirements.length, 10);
  advisorDomainContextSchema.parse(context);
});

test("George submissions extend the normalized Taming cap from direct profile evidence", async () => {
  const member = fixtureMember();
  member.player_data!.experience!.SKILL_TAMING = 55_172_425;
  member.pets_data = { ...member.pets_data, pet_care: { ...member.pets_data?.pet_care,
    pet_types_sacrificed: ["RIFT_FERRET", "SLUG", "SPIRIT", "GIRAFFE"] } };
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  const context = buildTamingAdvisorContext(profile);
  assert.equal(context.domain, "TAMING"); if (context.domain !== "TAMING") throw new Error("unreachable");
  assert.equal(context.skill.level, 50);
  assert.equal(context.skill.observedCap, 54);
  assert.equal(context.georgeCap.observedSubmissions, 4);
  assert.equal(context.progressionFocus.actions[0]?.kind, "LEVEL_TAMING");
});

test("Taming requests another George cap extension only when observed progress reaches the current cap", async () => {
  const member = fixtureMember();
  member.player_data!.experience!.SKILL_TAMING = 65_172_425;
  member.pets_data = { ...member.pets_data, pet_care: { ...member.pets_data?.pet_care, pet_types_sacrificed: ["SLUG"] } };
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  const context = buildTamingAdvisorContext(profile);
  assert.equal(context.domain, "TAMING"); if (context.domain !== "TAMING") throw new Error("unreachable");
  assert.equal(context.skill.observedCap, 51);
  assert.equal(context.skill.level, 51);
  assert.equal(context.progressionFocus.actions[0]?.kind, "EXTEND_TAMING_CAP");
});

test("Taming holds at level 60", async () => {
  const member = fixtureMember();
  member.player_data!.experience!.SKILL_TAMING = 111_672_425;
  member.pets_data = { ...member.pets_data, pet_care: { ...member.pets_data?.pet_care,
    pet_types_sacrificed: ["A","B","C","D","E","F","G","H","I","J"] } };
  const profile = await buildNormalizedProfile({ usernameOrUuid: "FixturePlayer" }, fixtureSources(member));
  const context = buildTamingAdvisorContext(profile);
  assert.equal(context.domain, "TAMING"); if (context.domain !== "TAMING") throw new Error("unreachable");
  assert.equal(context.skill.level, 60);
  assert.equal(context.skill.xpTo60, 0);
  assert.equal(context.rewards?.petLuck, 60);
  assert.equal(context.rewards?.extraPetXpPercent, 60);
  assert.equal(context.rewards?.expSharePercent, 12);
  assert.equal(context.progressionFocus.actions[0]?.kind, "HOLD");
});
