import assert from "node:assert/strict";
import test from "node:test";
import { buildKuudraArmorProgress,kuudraArmorTierRequirements } from "../src/server/crimson-isle/equipment";
import { armorUpgradePath, priceUpgradeSteps } from "../src/server/crimson-isle/upgrade-costs";
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
 assert.equal(result.pieces[0].nextUpgrade,null);
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

test("NEU star recipes expose exact essence, Heavy Pearl and direct coin requirements",()=>{
 const path=armorUpgradePath("CRIMSON_CHESTPLATE",7,{});
 assert.equal(path.nextStep?.action,"STAR");
 assert.deepEqual(path.nextStep?.requirements,[
  {id:"ESSENCE_CRIMSON",quantity:70},{id:"SKYBLOCK_COIN",quantity:250000},
  {id:"HEAVY_PEARL",quantity:2},
 ]);
 assert.equal(path.nextCost?.recipeComplete,true);
 assert.equal(path.nextCost?.estimatedTotalCoins,null);
 assert.ok(path.nextCost?.missingPriceIds.includes("ESSENCE_CRIMSON"));
});
test("10-star prestige uses separately verified non-NEU prestige recipe",()=>{
 const path=armorUpgradePath("BURNING_AURORA_BOOTS",10,{});
 assert.equal(path.nextStep?.action,"PRESTIGE");
 assert.equal(path.nextStep?.toTier,"Fiery");
 assert.deepEqual(path.nextStep?.requirements,[
  {id:"ESSENCE_CRIMSON",quantity:4500},
  {id:"KUUDRA_TEETH",quantity:50},
  {id:"SKYBLOCK_COIN",quantity:10000000},
 ]);
});
test("market quotes yield attributed materials, exact coin fees, and complete totals",()=>{
 const at="2026-10-25T19:00:00.000Z";
 const mk=(id:string,coins:number,basis:"BAZAAR"|"MEDIAN_LOWEST_FIVE")=>({marketKey:id,coins,
  observedAt:at,basis,confidence:"HIGH" as const});
 const prices={"ESSENCE_CRIMSON":mk("ESSENCE_CRIMSON",1000,"BAZAAR"),
  "KUUDRA_TEETH":mk("KUUDRA_TEETH",5000,"BAZAAR"),
  "HEAVY_PEARL":mk("HEAVY_PEARL",200000,"BAZAAR")};
 const p=armorUpgradePath("CRIMSON_BOOTS",9,prices);
 assert.equal(p.nextCost?.estimatedTotalCoins,1000000+90*1000+4*200000);
 assert.equal(p.nextCost?.directCoins,1000000);
 assert.equal(p.nextCost?.ingredients.find(x=>x.id==="HEAVY_PEARL")?.basis,"BAZAAR");
 assert.equal(p.nextCost?.ingredients.find(x=>x.id==="HEAVY_PEARL")?.observedAt,at);
 assert.equal(p.toMax?.recipeComplete,true);
 assert.ok(p.toMax?.estimatedTotalCoins!==null);
});
test("missing Bazaar price cannot become an artificially cheap complete upgrade",()=>{
 const p=armorUpgradePath("FIERY_HOLLOW_HELMET",10,{
  ESSENCE_CRIMSON:{marketKey:"ESSENCE_CRIMSON",coins:1000,observedAt:"2026-10-25T19:00:00.000Z",basis:"BAZAAR",confidence:"HIGH"},
 });
 assert.equal(p.nextCost?.recipeComplete,true);
 assert.equal(p.nextCost?.estimatedTotalCoins,null);
 assert.ok(p.nextCost?.missingPriceIds.includes("KUUDRA_TEETH"));
 assert.equal(p.nextCost?.directCoins,20000000);
});
test("fully starred Infernal has no upgrade cost and partial steps stay bounded",()=>{
 const max=armorUpgradePath("INFERNAL_TERROR_CHESTPLATE",15,{});
 assert.equal(max.known,true);
 assert.equal(max.nextStep,null);
 assert.equal(max.toMax?.steps,0);
 assert.equal(max.toMax?.estimatedTotalCoins,0);
 const partial=armorUpgradePath("HOT_CRIMSON_HELMET",3,{});
 assert.equal(partial.nextStep?.toStars,4);
 assert.equal(partial.toMax?.recipeComplete,true);
 assert.equal(armorUpgradePath("HOT_CRIMSON_HELMET",null,{}).known,false);
});
