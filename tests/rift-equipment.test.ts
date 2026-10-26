import assert from "node:assert/strict";
import test from "node:test";
import {buildRiftEquipment} from "../src/server/rift/equipment";
import type {ProcessedItem} from "../src/schemas/items";

const item=(id:string,source:string):ProcessedItem=>({
 id,uuid:null,name:id,count:1,rarity:"epic",categories:[],stats:{},
 reforge:null,enchantments:{},stars:null,recombobulated:false,lore:[],
 abilityText:[],setBonusText:[],source,slotIndex:0,rawLore:[],cleanLore:[],extraAttributes:{},
});
test("Rift cloak and necklace bonuses use 52 souls and eight Timecharms only when equipped",()=>{
 const p=buildRiftEquipment([item("ENIGMA_CLOAK","rift:equipment"),
  item("RIFT_NECKLACE_INSIDE","rift:equipment")],{soulCount:52,charmCount:8,cloakPurchased:true});
 assert.equal(p.time.knownEquippedSubtotalSeconds,1420);
 assert.equal(p.time.totalRiftTimeSeconds,null);
 assert.equal(p.time.complete,false);
 assert.deepEqual(p.time.contributions.map(x=>x.seconds),[1040,380]);
});
test("Unequipped stored Rift items do not inflate equipped time",()=>{
 const p=buildRiftEquipment([item("ENIGMA_CLOAK","rift:inventory")],
  {soulCount:52,charmCount:8,cloakPurchased:true});
 assert.equal(p.time.knownEquippedSubtotalSeconds,0);
 assert.ok(p.time.contributions.every(x=>!x.equipped));
});
test("Rift missing collection counts do not imply a zero-second cloak",()=>{
 const p=buildRiftEquipment([item("ENIGMA_CLOAK","rift:equipment")],
  {soulCount:null,charmCount:null,cloakPurchased:null});
 assert.equal(p.time.knownEquippedSubtotalSeconds,null);
 assert.equal(p.time.contributions[0].seconds,null);
});
test("Rift Necklace lookup supports intermediate Gallery totals exactly",()=>{
 const expected=[0,60,110,155,200,245,270,335,380];
 for(let i=0;i<expected.length;i++){
  const p=buildRiftEquipment([item("RIFT_NECKLACE_INSIDE","rift:equipment")],
   {soulCount:0,charmCount:i,cloakPurchased:false});
  assert.equal(p.time.contributions[1].seconds,expected[i]);
 }
});
test("Mote costs remain in Motes, nontradable items do not get fabricated market quotes",()=>{
 const p=buildRiftEquipment([],{soulCount:0,charmCount:0,cloakPurchased:false});
 const cloak=p.costs.find(x=>x.id==="enigma_cloak")!;
 assert.deepEqual(cloak.materials,[{currency:"MOTES",quantity:100}]);
 assert.equal(cloak.tradeable,false);
 assert.equal(p.costs.find(x=>x.id==="rift_necklace")?.materials.length,0);
 assert.ok(p.unpricedUpgrades.length>0);
});
