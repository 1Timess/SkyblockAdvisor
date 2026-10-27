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
 assert.deepEqual(p.time.contributions.slice(0,2).map(x=>x.seconds),[1040,380]);
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

test("empty but supplied Rift inventory source is still reported as accessible",()=>{
 const p=buildRiftEquipment([],{soulCount:null,charmCount:null,cloakPurchased:null},["equipment_contents"]);
 assert.equal(p.sources.find(x=>x.id==="equipment_contents")?.reported,true);
 assert.equal(p.sources.find(x=>x.id==="inv_contents")?.reported,false);
});

test("Rift barter recipes retain item costs instead of inventing coin equivalents",()=>{
 const p=buildRiftEquipment([],{soulCount:null,charmCount:null,cloakPurchased:null});
 const leech=p.costs.find(c=>c.id==="leech_belt")!;
 assert.deepEqual(leech.materials,[{currency:"SILKRIDER_SAFETY_BELT",quantity:1},{currency:"LEECH_SUPREME_FRAGMENT",quantity:8}]);
 assert.equal(leech.tradeable,false);
 const ringalia=p.costs.find(c=>c.id==="shens_ringalia")!;
 assert.deepEqual(ringalia.materials,[{currency:"MOTES",quantity:25000},{currency:"PUFF_CRUX",quantity:64},
  {currency:"YOUNGITE",quantity:20},{currency:"TIMITE",quantity:20},
  {currency:"OBSOLITE",quantity:20},{currency:"DISINFESTOR_GLOVES",quantity:1}]);
 assert.equal(ringalia.tradeable,false);
});
test("Only equipped fixed Rift gear contributes to known time subtotal",()=>{
 const p=buildRiftEquipment([item("LEECH_BELT","rift:equipment"),
  item("DISINFESTOR_GLOVES","rift:equipment"),
  item("SHENS_RINGALIA","rift:inventory")],{soulCount:null,charmCount:null,cloakPurchased:null});
 assert.equal(p.time.knownEquippedSubtotalSeconds,110);
 assert.equal(p.time.totalRiftTimeSeconds,null);
 assert.equal(p.time.complete,false);
 assert.equal(p.time.contributions.find(c=>c.id==="shens_ringalia")?.equipped,false);
});
test("Golden Belt fixed bonus does not imply percentage Rift Time is fully modeled",()=>{
 const p=buildRiftEquipment([item("GOLDEN_BELT","rift:equipment")],
  {soulCount:null,charmCount:null,cloakPurchased:null});
 assert.equal(p.time.knownEquippedSubtotalSeconds,100);
 assert.equal(p.time.totalRiftTimeSeconds,null);
 assert.equal(p.time.complete,false);
});

test("Unequipped fixed Rift gear exposes no active time contribution",()=>{
 const p=buildRiftEquipment([item("VERMIN_BELT","rift:inventory")],
  {soulCount:null,charmCount:null,cloakPurchased:null});
 const belt=p.time.contributions.find(c=>c.id==="vermin_belt");
 assert.equal(belt?.equipped,false);
 assert.equal(belt?.seconds,null);
 assert.equal(p.time.knownEquippedSubtotalSeconds,0);
});

test("Four Wyld armor pieces count individually only when equipped",()=>{
 const ids=["WYLD_HELMET","WYLD_CHESTPLATE","WYLD_LEGGINGS","WYLD_BOOTS"];
 const p=buildRiftEquipment(ids.map(id=>item(id,"rift:armor")),
  {soulCount:null,charmCount:null,cloakPurchased:null});
 assert.equal(p.time.knownEquippedSubtotalSeconds,60);
 for(const id of ids)assert.equal(p.time.contributions.find(c=>c.id===id.toLowerCase())?.seconds,15);
 const stored=buildRiftEquipment([item("WYLD_HELMET","rift:inventory")],
  {soulCount:null,charmCount:null,cloakPurchased:null});
 assert.equal(stored.time.knownEquippedSubtotalSeconds,0);
});
test("Verified upgraded armor IDs contribute their exact equipped time only",()=>{
 const p=buildRiftEquipment([item("S_LOGO_CHESTPLATE","rift:armor"),
 item("ANTI_BITE_SCARF","rift:armor"),item("WIZARDMAN_LEGGINGS","rift:inventory")],
 {soulCount:null,charmCount:null,cloakPurchased:null});
 assert.equal(p.time.knownEquippedSubtotalSeconds,185);
 assert.equal(p.time.totalRiftTimeSeconds,null);
});
