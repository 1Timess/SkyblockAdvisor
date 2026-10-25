import assert from "node:assert/strict";
import test from "node:test";
import { buildCollectionsProgress } from "../src/server/collections/profile-progress";
import { rawProfileSchema } from "../src/server/hypixel/types";

const resource={version:"test",collections:{MINING:{items:{
 COBBLESTONE:{name:"Cobblestone",tiers:[{tier:1,amountRequired:50,unlocks:["Minion recipe"]},{tier:2,amountRequired:100,unlocks:["Another recipe"]},{tier:3,amountRequired:250,unlocks:[]}]},
}},FARMING:{items:{WHEAT:{name:"Wheat",tiers:[{tier:1,amountRequired:50,unlocks:["Wheat Minion Recipes"]}]}}}}};
const profile=(members:Record<string,unknown>)=>rawProfileSchema.parse({profile_id:"p",cute_name:"Apple",members});
const member=(counts?:Record<string,number>,unlocked?:string[])=>({
 ...(counts===undefined?{}:{collection:counts}),player_data:unlocked===undefined?{}:{unlocked_coll_tiers:unlocked},
});
test("collection progress combines co-op contributions without doubling shared unlock history",()=>{
 const result=buildCollectionsProgress(profile({
  a:member({COBBLESTONE:75,WHEAT:10},["COBBLESTONE_1"]),
  b:member({COBBLESTONE:75,WHEAT:40},["COBBLESTONE_2","WHEAT_1"]),
 }),"a",resource);
 const cobble=result.collections.find(c=>c.id==="COBBLESTONE")!;
 assert.equal(cobble.personal,75);assert.equal(cobble.observed,150);
 assert.equal(cobble.confirmedTier,2);assert.equal(cobble.inferredTier,2);
 assert.equal(cobble.earnedTier,2);assert.equal(cobble.nextTier,3);
 assert.equal(cobble.remaining,100);assert.equal(result.earnedTiers,3);
 assert.deepEqual(cobble.tiers.map(t=>t.confirmed),[true,true,false]);
 assert.equal(result.contributionsComplete,true);
});
test("incomplete co-op data retains observed totals and explicit unlocks",()=>{
 const result=buildCollectionsProgress(profile({
  a:member({COBBLESTONE:25},["COBBLESTONE_2"]),b:member(),
 }),"a",resource);
 const cobble=result.collections.find(c=>c.id==="COBBLESTONE")!;
 assert.equal(cobble.observed,25);assert.equal(cobble.earnedTier,2);
 assert.equal(cobble.remaining,225);
 assert.equal(result.contributionsComplete,false);assert.equal(result.unlocksComplete,false);
});
test("missing collection count is distinct from a confirmed zero",()=>{
 const result=buildCollectionsProgress(profile({a:member(undefined,[])}),"a",resource);
 const cobble=result.collections.find(c=>c.id==="COBBLESTONE")!;
 assert.equal(cobble.observed,null);assert.equal(cobble.inferredTier,null);
 assert.equal(cobble.remaining,null);assert.equal(cobble.progress,null);
});
test("collection reference absence degrades without invented tiers",()=>{
 const result=buildCollectionsProgress(profile({a:member({COBBLESTONE:999},[])}),"a",null);
 assert.equal(result.referenceAvailable,false);assert.equal(result.totalCollections,0);
});
test("special vanilla IDs survive reference and co-op counting",()=>{
 const special={collections:{FARMING:{items:{"INK_SACK:3":{name:"Cocoa",tiers:[{tier:1,amountRequired:75,unlocks:[]}]}}}}};
 const result=buildCollectionsProgress(profile({a:member({"INK_SACK:3":35},["INK_SACK:3_1"]),b:member({"INK_SACK:3":40},[])}),"a",special);
 assert.equal(result.collections[0].observed,75);assert.equal(result.collections[0].confirmedTier,1);
});
