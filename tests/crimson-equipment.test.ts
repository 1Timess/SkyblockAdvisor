import assert from "node:assert/strict";
import test from "node:test";
import { buildKuudraArmorProgress,kuudraArmorTierRequirements } from "../src/server/crimson-isle/equipment";
import type { ProcessedItem } from "../src/schemas/items";
import { buildCrimsonIsleProgress } from "../src/server/crimson-isle/progression";
import { memberSchema } from "../src/server/hypixel/types";
const gear=(id:string,stars:number|null):ProcessedItem=>({
 id,uuid:"test-"+id,name:id,count:1,rarity:"legendary",categories:["chestplate"],stats:{},
 reforge:null,enchantments:{},stars,recombobulated:false,lore:[],abilityText:[],setBonusText:[],
 source:"inventory",slotIndex:0,rawLore:[],cleanLore:[],extraAttributes:{},
});
test("kuudra armor tier IDs, star limits, and prestige steps are decoded",()=>{
 const items=[gear("CRIMSON_CHESTPLATE",9),gear("HOT_AURORA_BOOTS",10),gear("INFERNAL_TERROR_HELMET",15)];
 const result=buildKuudraArmorProgress(items,43,{none:1,hot:1,burning:1,fiery:1,infernal:1});
 assert.equal(result.pieces.length,3);
 assert.equal(result.pieces[0].nextAction,"STAR");
 assert.equal(result.pieces[0].starsUntilNext,1);
 assert.equal(result.pieces[1].nextAction,"PRESTIGE");
 assert.equal(result.pieces[1].nextTier,"Burning");
 assert.equal(result.pieces[2].nextAction,"MAXED");
 assert.equal(result.pieces[2].maxStars,15);
});
test("armor usage requirements require combat and tier clear separately",()=>{
 const result=kuudraArmorTierRequirements(2,30,{burning:0});
 assert.equal(result?.combatLevelRequired,32);
 assert.equal(result?.combatMet,false);
 assert.equal(result?.kuudraClearMet,false);
 assert.equal(kuudraArmorTierRequirements(4,null,{})?.kuudraClearMet,null);
});
test("unknown stars and unrelated equipment never create upgrade opportunities",()=>{
 const result=buildKuudraArmorProgress([gear("HOT_HOLLOW_LEGGINGS",null),gear("NECRON_CHESTPLATE",5)],null,{});
 assert.equal(result.pieces.length,1);
 assert.equal(result.pieces[0].nextAction,"UNKNOWN");
 assert.equal(result.pieces[0].upgradeCostKnown,false);
});
test("trophy catch requirements cover all 18 fish and missing quality progression",()=>{
 const result=buildCrimsonIsleProgress(memberSchema.parse({trophy_fish:{
  blobfish_bronze:2,slugfish_diamond:1,obfuscated_fish_2_silver:1,
 }}));
 assert.equal(result.trophyFishing.fish.length,18);
 assert.ok(result.trophyFishing.fish.every(f=>f.catchRequirement));
 assert.equal(result.trophyFishing.fish.find(f=>f.id==="slugfish")?.highestQuality,"diamond");
 assert.equal(result.trophyFishing.missingByQuality.find(q=>q.quality==="diamond")?.observed,1);
 assert.equal(result.trophyFishing.pityReference.countsAvailable,false);
});
