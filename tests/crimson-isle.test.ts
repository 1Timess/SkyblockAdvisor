import assert from "node:assert/strict";
import test from "node:test";
import { memberSchema } from "../src/server/hypixel/types";
import { buildCrimsonIsleProgress } from "../src/server/crimson-isle/progression";

const parse=(nether?:Record<string,unknown>,fish?:Record<string,unknown>)=>buildCrimsonIsleProgress(
 memberSchema.parse({...(nether?{nether_island_player_data:nether}:{}),...(fish?{trophy_fish:fish}:{})}));
test("missing Crimson Isle fields stay unknown rather than zero",()=>{
 const result=parse();assert.equal(result.available,false);
 assert.equal(result.faction.currentReputation,null);
 assert.equal(result.kuudra.totalCompletions,null);
 assert.equal(result.dojo.totalPoints,null);
 assert.equal(result.trophyFishing.claimedOdgerRank,null);
 assert.equal(result.matriarch.pearlsCollected,null);
});
test("faction ranks use observed reputation, not inferred quest completion",()=>{
 const result=parse({selected_faction:"mages",mages_reputation:7100,barbarians_reputation:500});
 assert.equal(result.faction.currentReputation,7100);
 assert.equal(result.faction.factions[0].rank,"Honored");
 assert.equal(result.faction.factions[1].rank,"Neutral");
 assert.equal(result.kuudra.tiers[1].storyVerified,false);
 assert.equal(result.kuudra.tiers[1].reputationMet,true);
});
test("Dojo scores map seven canonical suffixes, including Control and Tenacity",()=>{
 const ids=["mob_kb","wall_jump","archer","sword_swap","snake","lock_head","fireball"];
 const dojo=Object.fromEntries(ids.flatMap(id=>[[`dojo_points_${id}`,1000],[`dojo_time_${id}`,100]]));
 const result=parse({dojo});
 assert.equal(result.dojo.totalPoints,7000);
 assert.equal(result.dojo.eligibleBelt,"Black");
 assert.equal(result.dojo.tests.find(x=>x.name==="control")?.points,1000);
 assert.equal(result.dojo.tests.find(x=>x.name==="tenacity")?.points,1000);
});
test("Kuudra uses none as Basic and weighted completion points without counting waves",()=>{
 const result=parse({selected_faction:"barbarians",barbarians_reputation:4000,
  kuudra_completed_tiers:{none:12,hot:4,burning:2,fiery:0,infernal:0,highest_wave_hot:6}});
 assert.equal(result.kuudra.totalCompletions,18);
 assert.equal(result.kuudra.collectionPoints,26);
 assert.equal(result.kuudra.tiers[0].name,"Basic");
 assert.equal(result.kuudra.tiers[1].highestWave,6);
 assert.equal(result.kuudra.tiers[2].previousCleared,true);
 assert.equal(result.kuudra.tiers[3].reputationMet,false);
});
test("partial Kuudra counters don't invent a collection total",()=>{
 const result=parse({kuudra_completed_tiers:{none:10}});
 assert.equal(result.kuudra.tiers[0].completions,10);
 assert.equal(result.kuudra.collectionPoints,null);
 assert.equal(result.kuudra.totalCompletions,null);
});
test("Trophy Fish rewards and tier quality stay separate",()=>{
 const result=parse({}, {gusher_bronze:12,gusher_gold:1,rewards:[1,2,3],total_caught:13});
 assert.equal(result.trophyFishing.fishTypes,18);
 assert.equal(result.trophyFishing.claimedOdgerRank,"Gold");
 assert.equal(result.trophyFishing.fish.find(f=>f.id==="gusher")?.highestQuality,"gold");
 assert.equal(result.trophyFishing.grades.find(g=>g.quality==="bronze")?.unique,1);
 assert.equal(result.trophyFishing.grades.find(g=>g.quality==="diamond")?.unique,0);
});
test("Matriarch history does not imply current daily availability",()=>{
 const result=parse({matriarch:{pearls_collected:18,last_attempt:123,recent_refreshes:[4,5]}});
 assert.equal(result.matriarch.pearlsCollected,18);
 assert.equal(result.matriarch.lastAttempt,123);
 assert.deepEqual(result.matriarch.recentRefreshes,[4,5]);
});
