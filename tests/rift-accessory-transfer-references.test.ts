import assert from "node:assert/strict";
import test from "node:test";
import transfer from "../src/server/reference/rift-transferability.json";
import accessories from "../src/server/reference/rift-accessories.json";

test("Rift transfer references distinguish importable from exportable items",()=>{
 assert.equal(transfer.completeness,"NON_EXHAUSTIVE");
 assert.ok(transfer.transferableNames.includes("Scarf's Studies"));
 assert.ok(transfer.transferableNames.includes("Blood Donor Artifact"));
 assert.ok(transfer.exportableNames.includes("Spotlite"));
 assert.equal(transfer.transferableNames.includes("Spotlite"),false);
});
test("Rift accessory reference separates fixed, scaling and percentage effects",()=>{
 assert.equal(accessories.fixedSeconds.find(x=>x.name==="Bluetooth Ring")?.seconds,30);
 assert.equal(accessories.scalingSeconds.find(x=>x.name==="Crux Talisman")?.baseSeconds,10);
 assert.equal(accessories.percentage.find(x=>x.name==="IQ Point")?.percent,1);
 assert.ok(accessories.fixedSeconds.every(x=>x.internalItemId===null || typeof x.internalItemId==="string"));
});

test("NEU accessory IDs and exact Bluetooth Ring craft are recognized",()=>{
 const bluetooth=accessories.fixedSeconds.find(x=>x.name==="Bluetooth Ring");
 assert.equal(bluetooth?.internalItemId,"BLUETOOTH_RING");
 assert.ok(bluetooth && "recipe" in bluetooth);
 assert.deepEqual(bluetooth.recipe.ingredients,[{itemId:"METAL_HEART",quantity:32}]);
 assert.equal(accessories.fixedSeconds.find(x=>x.name==="Ring of Broken Love")?.internalItemId,"RING_OF_BROKEN_LOVE");
});

test("Crux chain uses verified progressive IDs and incremental NEU costs",()=>{
 const expected=[
  ["SHAME_CRUX",8],
  ["SHADOW_CRUX",16],
  ["VOLT_CRUX",16],
  ["SCRIBE_CRUX",16],
  ["FROSTY_CRUX",24],
  ["SPLATTER_CRUX",32],
  ["PUFF_CRUX",128],
 ] as const;
 for(let i=0;i<7;i++){
  const entry=accessories.scalingSeconds[i];
  assert.equal(entry.internalItemId,`CRUX_TALISMAN_${i+1}`);
  assert.ok("recipe" in entry);
  assert.ok(entry.recipe.ingredients.some(x=>x.itemId===expected[i][0]&&x.quantity===expected[i][1]));
  if(i>0) assert.ok(entry.recipe.ingredients.some(x=>x.itemId===`CRUX_TALISMAN_${i}`&&x.quantity===1));
  assert.equal(entry.activationStatus,"MILESTONE_COUNT_UNKNOWN");
 }
});
test("Future Calories item ID and recipe use NEU ingredient identifiers",()=>{
 const entry=accessories.fixedSeconds.find(x=>x.name==="Future Calories Talisman");
 assert.equal(entry?.internalItemId,"FUTURE_CALORIES");
 assert.ok(entry && "recipe" in entry);
 assert.deepEqual(entry.recipe.ingredients,[
  {itemId:"PRE_DIGESTION_FISH",quantity:1},
  {itemId:"MAGMA_FISH_SILVER",quantity:48},
  {itemId:"ENCHANTED_RAW_FISH",quantity:384},
 ]);
});
