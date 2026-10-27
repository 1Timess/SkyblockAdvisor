import assert from "node:assert/strict";
import test from "node:test";
import catalogue from "../src/server/reference/rift-gear-catalogue.json";
import costs from "../src/server/reference/rift-costs.json";

test("Rift armor catalogue contains the verified named time-progression slots",()=>{
 const armor=catalogue.armor.filter(x=>x.slot!=="set");
 assert.equal(armor.length,21);
 for(const slot of ["helmet","chestplate","leggings","boots"]){
  assert.ok(armor.some(x=>x.slot===slot));
 }
 for(const piece of armor){
  assert.ok("riftTimeSeconds" in piece && typeof piece.riftTimeSeconds==="number" && piece.riftTimeSeconds>0);
  assert.ok("itemId" in piece && typeof piece.itemId==="string");
  assert.ok(["UNVERIFIED","CRAFTING_RECIPE_VERIFIED","METHOD_VERIFIED_COST_UNKNOWN","SHOP_COST_VERIFIED","EXCHANGE_COST_VERIFIED","QUEST_REWARD_VERIFIED"].includes(piece.acquisitionStatus));
  assert.ok(["UNKNOWN","NON_TRANSFERABLE"].includes(piece.transferability));
  assert.ok(piece.playerTradeable===null || piece.playerTradeable===false);
 }
});
test("Rift trade and Rift Transfer are explicitly separate concepts",()=>{
 const belt=catalogue.rewardEquipment[0];
 assert.equal(belt.itemId,"GOLDEN_BELT");
 assert.equal(belt.riftTransferable,false);
 assert.equal(belt.playerTradeable,false);
 assert.equal(belt.costStatus,"REWARD_NO_PURCHASE");
 assert.equal(belt.soulbound,"UNKNOWN");
 assert.ok(catalogue.riftTransferExceptions.some(item=>item.name==="Scarf's Studies"&&item.riftTransferable));
});
test("Rift recipe costs stay native to material and Mote denominations",()=>{
 for(const c of costs.costs){
  assert.equal(c.requires.status,"EXACT");
  for(const component of c.requires.cost){
   assert.notEqual(component.currency,"COINS");
   assert.ok(component.quantity>=0);
  }
 }
});

test("NEU crafting grid totals are preserved without converting materials to coins",()=>{
 const expected:Record<string,Array<{itemId:string;quantity:number}>>={
  "Agaricus Cap Cap":[{itemId:"AGARICUS_CAP",quantity:60},{itemId:"NOT_DEADGEHOG_MASK",quantity:1}],
  "Chicken Leggs":[{itemId:"VOLT_CRUX",quantity:16},{itemId:"WYLD_LEGGINGS",quantity:1},{itemId:"METAPHORIC_EGG",quantity:32}],
  "Orange Chestplate":[{itemId:"HALF_EATEN_CARROT",quantity:448},{itemId:"ETALPTSEHC_NORI",quantity:1}],
  "Ugly Boots":[{itemId:"UGLY_BOOTS_FRAGMENT",quantity:4},{itemId:"SNAKE_IN_A_BOOT",quantity:1}]
 };
 for(const [name,ingredients] of Object.entries(expected)){
  const entry=catalogue.armor.find(x=>x.name===name);
  assert.ok(entry && "recipe" in entry);
  assert.deepEqual(entry.recipe?.ingredients,ingredients);
 }
});

test("Wyld Armor Mote prices sum to 4050 and exchange uses no invented coins",()=>{
 const wyld=catalogue.armor.filter(x=>x.itemId.startsWith("WYLD_"));
 assert.equal(wyld.length,4);
 assert.equal(wyld.reduce((sum,e)=>sum+("acquisition" in e&&e.acquisition&&"materials" in e.acquisition?e.acquisition.materials?.[0]?.quantity??0:0),0),4050);
 const chest=catalogue.armor.find(x=>x.itemId==="ETALPTSEHC_NORI");
 assert.ok(chest && "acquisition" in chest && chest.acquisition && "materials" in chest.acquisition);
 assert.deepEqual(chest.acquisition.materials,[{currency:"WYLD_CHESTPLATE",quantity:1},{currency:"SHADOW_CRUX",quantity:12}]);
});

test("Exact noncraft Rift exchanges preserve Motes and predecessor equipment",()=>{
 for(const [id,expected] of [
  ["DETRANSFIGURED_MASK",[{currency:"AGARICUS_CAP_CAP",quantity:1},{currency:"MOTES",quantity:1500}]],
  ["EXCEEDINGLY_COMFY_SNEAKERS",[{currency:"GUNTHER_SNEAKERS",quantity:1},{currency:"MOTES",quantity:49999}]]
 ] as const){
  const entry=catalogue.armor.find(x=>x.itemId===id);
  assert.ok(entry && "acquisition" in entry && entry.acquisition && "materials" in entry.acquisition);
  assert.deepEqual(entry.acquisition.materials,expected);
 }
 const wizard=catalogue.armor.find(x=>x.itemId==="WIZARD_FACE");
 assert.ok(wizard && "acquisition" in wizard);
 assert.equal(wizard.acquisition?.costStatus,"REWARD_NO_PURCHASE");
});
