import assert from "node:assert/strict";
import test from "node:test";
import { memberSchema } from "../src/server/hypixel/types";
import { buildBestiaryProgress } from "../src/server/bestiary/progression";

const inspect=(kills:Record<string,number>, milestone?:unknown)=>buildBestiaryProgress(memberSchema.parse({bestiary:{
  kills,milestone,
}}));
test("Bestiary reference includes regular and nested category families",()=>{
 const result=inspect({});
 assert.equal(result.apiAvailable,true);
 assert.ok(result.totalFamilies>=350);
 assert.ok(result.categories.some(c=>c.group==="Fishing"&&c.name==="Lava"));
 assert.ok(result.categories.some(c=>c.group==="Critter Safari"));
 assert.ok(result.categories.some(c=>c.group==="Catacombs"));
});
test("grouped Bestiary mob variants accumulate into one family",()=>{
 const baseline=inspect({});
 const category=baseline.categories.find(c=>c.families.some(f=>f.keys.length>1))!;
 const original=category.families.find(f=>f.keys.length>1)!;
 const kills=Object.fromEntries(original.keys.slice(0,2).map(key=>[key,3]));
 const result=inspect(kills);
 const family=result.categories.find(c=>c.id===category.id)!.families.find(f=>f.name===original.name)!;
 assert.equal(family.kills,6);
 assert.equal(family.deaths,0);
});
test("Bestiary thresholds use the family-specific bracket and cap",()=>{
 const base=inspect({});
 const family=base.categories.flatMap(c=>c.families).find(f=>f.maxTier>=2&&f.nextThreshold!==null)!;
 const first=family.nextThreshold!;
 const out=inspect({[family.keys[0]]:first});
 const moved=out.categories.flatMap(c=>c.families).find(f=>f.name===family.name&&f.keys.join()===family.keys.join())!;
 assert.equal(moved.tier,1);
 assert.equal(moved.progress,0);
 assert.ok(moved.nextThreshold!>first);
});
test("Critter Safari thresholds are distinct and bounded",()=>{
 const base=inspect({});
 const category=base.categories.find(c=>c.group==="Critter Safari")!;
 const family=category.families[0];
 const threshold=family.nextThreshold!;
 const found=inspect({[family.keys[0]]:threshold});
 const match=found.categories.find(c=>c.id===category.id)!.families[0];
 assert.equal(match.tier,1);
 assert.ok(match.maxTier<=10);
});
test("milestone claims are independent of calculated tiers",()=>{
 const result=inspect({}, {last_claimed_milestone:5});
 assert.equal(result.claimedMilestone,5);
 assert.equal(result.familyTiers,0);
 assert.equal(result.bestiaryLevel,0);
});
test("missing Bestiary API data is not treated as zero progress",()=>{
 const result=buildBestiaryProgress(memberSchema.parse({}));
 assert.equal(result.apiAvailable,false);
 assert.equal(result.totalFamilies,0);
 assert.deepEqual(result.categories,[]);
 assert.equal(result.claimedMilestone,null);
});
test("unmapped numeric kill keys are identified without silently assigning families",()=>{
 const result=inspect({not_in_reference_mob:3});
 assert.ok(result.unmappedKillKeys.includes("not_in_reference_mob"));
});
