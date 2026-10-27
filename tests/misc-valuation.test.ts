import assert from "node:assert/strict";
import test from "node:test";
import {buildMiscValuation} from "../src/server/skyblock/profile/misc-valuation";
import type {ProcessedItem} from "../src/schemas/items";
import type {MarketSnapshot} from "../src/schemas/market";

const item=(id:string,source:string,uuid:string|null,count=1):ProcessedItem=>({
 id,source,uuid,name:id,count,rarity:"legendary",categories:[],stats:{},
 reforge:null,enchantments:{},stars:null,recombobulated:false,lore:[],
 abilityText:[],setBonusText:[],slotIndex:0,rawLore:[],cleanLore:[],extraAttributes:{},
});
const at="2026-10-27T14:00:00.000Z";
const snapshot:MarketSnapshot={version:1,snapshotId:"test",hypixelLastUpdated:0,
 observedAt:at,completedAt:at,pagesFetched:1,auctionsObserved:1,binListingsAccepted:1,
 quotes:{A:{marketKey:"A",coins:100,observedAt:at,basis:"LOWEST_BIN",confidence:"MEDIUM"},
 B:{marketKey:"B",coins:900,observedAt:at,basis:"LOWEST_BIN",confidence:"MEDIUM"}}};
test("Misc valuation ranks by market quote, not rarity or inventory order",()=>{
 const report=buildMiscValuation([item("A","inventory","one"),item("B","enderchest","two")],snapshot);
 assert.deepEqual(report.items.map(x=>x.id),["B","A"]);
 assert.equal(report.pricedCount,2);
});
test("Misc valuation deduplicates repeated UUIDs and leaves missing prices unpriced",()=>{
 const report=buildMiscValuation([item("B","armor","shared"),item("B","loadout:armor:0:slot","shared"),
 item("UNPRICED","backpack:0",null)],snapshot);
 assert.equal(report.items.length,1);
 assert.equal(report.unpricedCount,1);
});
test("Misc valuation does not invent market values when snapshot is absent",()=>{
 const report=buildMiscValuation([item("A","inventory",null)],null);
 assert.equal(report.items.length,0);
 assert.equal(report.unpricedCount,1);
});
