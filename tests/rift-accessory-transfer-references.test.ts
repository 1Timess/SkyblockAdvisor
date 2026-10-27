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
 assert.ok(accessories.fixedSeconds.every(x=>x.internalItemId===null));
});
