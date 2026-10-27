import assert from "node:assert/strict";
import test from "node:test";
import catalogue from "../src/server/reference/rift-gear-catalogue.json";
import costs from "../src/server/reference/rift-costs.json";

test("Rift armor catalogue contains the verified named time-progression slots",()=>{
 const armor=catalogue.armor.filter(x=>x.slot!=="set");
 assert.equal(armor.length,17);
 for(const slot of ["helmet","chestplate","leggings","boots"]){
  assert.ok(armor.some(x=>x.slot===slot));
 }
 for(const piece of armor){
  assert.ok(piece.riftTimeSeconds>0);
  assert.equal(piece.acquisitionStatus,"UNVERIFIED");
  assert.equal(piece.transferability,"UNKNOWN");
  assert.equal(piece.playerTradeable,null);
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
