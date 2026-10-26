import assert from "node:assert/strict";
import test from "node:test";
import {memberSchema} from "../src/server/hypixel/types";
import {buildRiftProgress} from "../src/server/rift/progression";

const build=(value:unknown)=>buildRiftProgress(memberSchema.parse(value));
test("missing Rift API is unknown, not zero progress",()=>{
 const p=build({});
 assert.equal(p.available,false);assert.equal(p.gallery.securedCount,null);
 assert.equal(p.enigma.soulCount,null);assert.equal(p.access.consumedPrism,null);
 assert.equal(p.regions.find(x=>x.id==="castle")?.accessConfirmed,false);
});
test("Gallery secured Timecharms deduplicate by exact API type and preserve metadata",()=>{
 const p=build({rift:{gallery:{elise_step:5,secured_trophies:[
  {type:"supreme",timestamp:1000,visits:2},{type:"supreme",timestamp:1100,visits:3},
  {type:"celestial",timestamp:1200,visits:9}],sent_trophy_dialogues:["supreme","celestial"]}}});
 assert.deepEqual(p.gallery.uniqueSecuredTypes,["supreme","celestial"]);
 assert.equal(p.gallery.securedCount,2);assert.equal(p.gallery.securedTrophies?.length,3);
 assert.equal(p.gallery.securedTrophies?.[2].visits,9);
 assert.equal(p.gallery.eliseStep,5);
});
test("Enigma souls count unique IDs without assuming a fixed outdated max",()=>{
 const p=build({rift:{enigma:{bought_cloak:true,found_souls:["A","A","B"],
  claimed_bonus_index:2}}});
 assert.deepEqual(p.enigma.soulsFound,["A","B"]);
 assert.equal(p.enigma.soulCount,2);
 assert.equal(p.enigma.boughtCloak,true);
 assert.equal(p.enigma.claimedBonusIndex,2);
});
test("Rift-specific quest flags and region presence do not mean region cleared",()=>{
 const p=build({rift:{west_village:{mirrorverse:{
  visited_rooms:["room_a","room_b"],claimed_chest_items:["item_a"],claimed_reward:false},
  crazy_kloon:{quest_complete:true}},
  dead_cats:{found_cats:["one"],unlocked_pet:true},wizard_tower:{wizard_quest_step:4}}});
 const read=(id:string)=>p.activities.find(x=>x.id===id);
 assert.equal(read("west_village.mirrorverse.visited_rooms")?.count,2);
 assert.equal(read("west_village.mirrorverse.claimed_reward")?.boolean,false);
 assert.equal(read("west_village.crazy_kloon.quest_complete")?.boolean,true);
 assert.equal(read("wizard_tower.wizard_quest_step")?.count,4);
 assert.equal(p.regions.find(x=>x.id==="west_village")?.dataReported,true);
 assert.equal(p.regions.find(x=>x.id==="west_village")?.accessConfirmed,false);
});
test("Rift inventory sources are detected independently of normal inventory",()=>{
 const p=build({rift:{inventory:{inv_contents:{data:"abc"},equipment_contents:{data:"def"}},
  lifetime_purchased_boundaries:["a","b","a"],access:{consumed_prism:false,last_free:42},
  future_system:{new_key:1}}});
 assert.deepEqual(p.inventory.availableSources,["inv_contents","equipment_contents"]);
 assert.equal(p.boundaries.count,2);
 assert.equal(p.access.consumedPrism,false);
 assert.deepEqual(p.unmodeledKeys,["future_system"]);
});
test("Vampire Slayer is sourced from existing Slayer field, not guessed from Rift quests",()=>{
 const p=build({rift:{slayer_quest:{type:"vampire"}},slayer:{slayer_bosses:{vampire:{xp:840}}}});
 assert.equal(p.vampireSlayer.reported,true);assert.equal(p.vampireSlayer.xp,840);
 assert.equal(build({rift:{}}).vampireSlayer.xp,null);
});
