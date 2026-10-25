import assert from "node:assert/strict";
import test from "node:test";
import { buildMinionProgress } from "../src/server/minions/progression";
import { rawProfileSchema } from "../src/server/hypixel/types";

const catalog = [
  { id:"CLAY_GENERATOR_1",name:"Clay Minion I",generator:"CLAY",generator_tier:1 },
  { id:"CLAY_GENERATOR_2",name:"Clay Minion II",generator:"CLAY",generator_tier:2 },
  { id:"CLAY_GENERATOR_11",name:"Clay Minion XI",generator:"CLAY",generator_tier:11 },
  { id:"WHEAT_GENERATOR_1",name:"Wheat Minion I",generator:"WHEAT",generator_tier:1 },
];

const member = (crafted?:string[])=> crafted===undefined ? {} : {player_data:{crafted_generators:crafted}};
function profile(members:Record<string,unknown>,bonus?:number) {
  return rawProfileSchema.parse({profile_id:"sample",cute_name:"Apple",members,
    ...(bonus===undefined?{}:{community_upgrades:{upgrade_states:[{upgrade:"minion_slots",tier:bonus,claimed_ms:123}]}})});
}
test("co-op minion tiers are deduplicated and community upgrades use highest reported tier",()=>{
 const result=buildMinionProgress(profile({alice:member(["CLAY_1","CLAY_2"]),bob:member(["CLAY_2","WHEAT_1"])},3),catalog);
 assert.equal(result.available,true);assert.equal(result.historyComplete,true);
 assert.equal(result.uniqueCrafts,3);assert.equal(result.craftedSlots,5);
 assert.equal(result.bonusSlots,3);assert.equal(result.totalSlots,8);assert.equal(result.craftsToNextSlot,2);
 assert.deepEqual(result.families.find(x=>x.id==="CLAY")?.craftedTiers,[1,2]);
});
test("incomplete co-op craft histories retain observed lower-bound slot progression",()=>{
 const result=buildMinionProgress(profile({alice:member(["CLAY_1"]),bob:member()}),catalog);
 assert.equal(result.historyComplete,false);assert.equal(result.craftedSlots,5);
 assert.equal(result.totalSlots,5);assert.equal(result.nextSlotAt,5);assert.equal(result.craftsToNextSlot,4);
 assert.equal(result.uniqueCrafts,1);
});
test("catalogue includes never-crafted families and max known tiers",()=>{
 const result=buildMinionProgress(profile({alice:member(["CLAY_1"])}),catalog);
 assert.equal(result.families.find(x=>x.id==="WHEAT")?.maxCraftedTier,0);
 assert.equal(result.families.find(x=>x.id==="CLAY")?.nextTier,2);
 assert.equal(result.families.find(x=>x.id==="CLAY")?.maxCatalogTier,11);
});
test("slot threshold at five unique tiers unlocks sixth crafted slot",()=>{
 const result=buildMinionProgress(profile({alice:member(["A_1","B_1","C_1","D_1","E_1"])},0),[]);
 assert.equal(result.craftedSlots,6);assert.equal(result.totalSlots,6);
 assert.equal(result.nextSlotAt,15);assert.equal(result.craftsToNextSlot,10);
});

test("incomplete history still surfaces earned craft slots and known Community Shop bonuses",()=>{
 const result=buildMinionProgress(profile({
  alice:member(["A_1","B_1","C_1","D_1","E_1"]),bob:member(),
 },2),catalog);
 assert.equal(result.historyComplete,false);
 assert.equal(result.uniqueCrafts,5);
 assert.equal(result.craftedSlots,6);
 assert.equal(result.bonusSlots,2);
 assert.equal(result.totalSlots,8);
 assert.equal(result.nextSlotAt,15);
 assert.equal(result.craftsToNextSlot,10);
});

test("Community Shop minion slot upgrades are counted without claimed timestamps", () => {
 const upgrades = [1, 2, 3, 4, 5].map(tier => ({upgrade:"minion_slots",tier}));
 const profileData = rawProfileSchema.parse({
  profile_id:"max-community", cute_name:"Apple",
  members:{alice:member(["CLAY_1"])},
  community_upgrades:{upgrade_states:upgrades},
 });
 const result = buildMinionProgress(profileData,catalog);
 assert.equal(result.bonusSlots,5);
 assert.equal(result.craftedSlots,5);
 assert.equal(result.totalSlots,10);
});

test("Community Shop upgrade states remain distinct from missing data and never exceed five", () => {
 const missing = buildMinionProgress(profile({alice:member(["CLAY_1"])}),catalog);
 assert.equal(missing.bonusSlots,null);
 const empty = rawProfileSchema.parse({profile_id:"no-upgrades",cute_name:"Apple",
  members:{alice:member(["CLAY_1"])},community_upgrades:{upgrade_states:[]}});
 assert.equal(buildMinionProgress(empty,catalog).bonusSlots,0);
 const oversized = rawProfileSchema.parse({profile_id:"oversized",cute_name:"Apple",
  members:{alice:member(["CLAY_1"])},
  community_upgrades:{upgrade_states:[{upgrade:"minion_slots",tier:8}]}});
 assert.equal(buildMinionProgress(oversized,catalog).bonusSlots,5);
});
