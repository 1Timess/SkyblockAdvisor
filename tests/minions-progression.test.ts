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
test("co-op minion tiers are deduplicated and community upgrades use max claimed tier",()=>{
 const result=buildMinionProgress(profile({alice:member(["CLAY_1","CLAY_2"]),bob:member(["CLAY_2","WHEAT_1"])},3),catalog);
 assert.equal(result.available,true);assert.equal(result.historyComplete,true);
 assert.equal(result.uniqueCrafts,3);assert.equal(result.craftedSlots,5);
 assert.equal(result.bonusSlots,3);assert.equal(result.totalSlots,8);assert.equal(result.craftsToNextSlot,2);
 assert.deepEqual(result.families.find(x=>x.id==="CLAY")?.craftedTiers,[1,2]);
});
test("incomplete co-op craft histories do not invent slots",()=>{
 const result=buildMinionProgress(profile({alice:member(["CLAY_1"]),bob:member()}),catalog);
 assert.equal(result.historyComplete,false);assert.equal(result.craftedSlots,null);
 assert.equal(result.totalSlots,null);assert.equal(result.craftsToNextSlot,null);
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
