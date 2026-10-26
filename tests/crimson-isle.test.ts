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

test("real API objective IDs produce reported storyline milestones, not invented branch completions",()=>{
 const result=buildCrimsonIsleProgress(memberSchema.parse({
  quests:{select_mage_faction:{status:"COMPLETE"}},
  objectives:{
   talk_to_elle_1:{status:"COMPLETE",completed_at:1234},
   help_elle:{status:"COMPLETE",completed_at:1235},
   talk_to_elle_2:{status:"ACTIVE",progress:2},
   collect_nether_items:{status:"INACTIVE",progress:0},
   talk_to_dean_4:{status:"COMPLETE",completed_at:1236},
   tutorial:["zone_dragontail_town_blacksmith"]
  },
  nether_island_player_data:{selected_faction:"mages",mages_reputation:12000,
   kuudra_completed_tiers:{none:1}},
 }));
 const q=result.quests;
 assert.equal(q.storyEvidence.reportedSteps,4);
 assert.equal(q.storyEvidence.completedSteps,2);
 assert.equal(q.storyEvidence.historicallyAccessedKuudra,true);
 assert.equal(q.storyline.find(x=>x.id==="talk_to_elle_1")?.status,"COMPLETE");
 assert.equal(q.storyline.find(x=>x.id==="talk_to_elle_2")?.status,"ACTIVE");
 assert.ok(q.unknownStorylineKeys.includes("talk_to_dean_4"));
 assert.equal(q.branches.find(x=>x.id==="mages")?.completionVerified,false);
 assert.ok(!q.storyline.map(x=>String(x.id)).includes("select_mage_faction"));
});
test("captured faction daily API fields are decoded without mislabeling rewards as claims",()=>{
 const result=buildCrimsonIsleProgress(memberSchema.parse({
  nether_island_player_data:{quests:{quest_data:{
   quest_list:["crimson_isle_rescue_c","crimson_isle_fight_kuudra_none_tier_c"],
   fishing:{status:"INACTIVE",progress:0,completed_at:0},
   fetch:{status:"INACTIVE",progress:0,completed_at:0},
   rescue:{status:"ACTIVE",progress:1},
   dojo:{status:"COMPLETE",completed_at:9000},
   boss:{status:"INACTIVE",progress:0},future_quest:{status:"ACTIVE"},
  },quest_rewards:{PYROCLASTIC_SCALE:1,crimson_isle_flyfish_d:"PYROCLASTIC_SCALE"}}},
 }));
 assert.deepEqual(result.quests.daily.assignments,["crimson_isle_rescue_c","crimson_isle_fight_kuudra_none_tier_c"]);
 assert.equal(result.quests.daily.entries.find(x=>x.id==="rescue")?.status,"ACTIVE");
 assert.equal(result.quests.daily.entries.find(x=>x.id==="dojo")?.status,"COMPLETE");
 assert.equal(result.quests.daily.rewardEntries.find(x=>x.id==="crimson_isle_flyfish_d")?.reward,"PYROCLASTIC_SCALE");
 assert.ok(result.quests.daily.extraKeys.includes("future_quest"));
});
test("absent objectives stay unknown and no made-up quest status survives",()=>{
 const result=buildCrimsonIsleProgress(memberSchema.parse({
  quests:{select_barbarian_faction:{status:"COMPLETE"}},
  objectives:{tutorial:["zone_scarleton_community_center"]},
 }));
 assert.equal(result.quests.storyEvidence.reportedSteps,0);
 assert.equal(result.quests.storyEvidence.historicallyAccessedKuudra,false);
 assert.ok(result.quests.storyline.every(x=>x.status==="UNKNOWN"&&!x.available));
 assert.equal(result.quests.branches.find(x=>x.id==="barbarians")?.completionVerified,false);
});
test("Kuudra prerequisite gates distinguish documented completions, missing storyline evidence and locked tiers",()=>{
 const result=buildCrimsonIsleProgress(memberSchema.parse({nether_island_player_data:{
  selected_faction:"mages",mages_reputation:3500,
  kuudra_completed_tiers:{none:3,hot:0,burning:0,fiery:0,infernal:0},
 }}));
 const basic=result.unlocks.kuudraTiers[0];
 const hot=result.unlocks.kuudraTiers[1];
 const burning=result.unlocks.kuudraTiers[2];
 assert.equal(basic.overall,"HISTORICALLY_CLEARED");
 assert.equal(hot.reputation,"MET");
 assert.equal(hot.previousTier,"MET");
 assert.equal(hot.storyline,"UNKNOWN");
 assert.equal(hot.overall,"NOT_VERIFIED");
 assert.equal(burning.previousTier,"NOT_MET");
 assert.equal(burning.overall,"KNOWN_GATE_UNMET");
 assert.equal(result.unlocks.factionRanks[0].thresholds.find(t=>t.name==="Trusted")?.status,"MET");
});
test("missing faction and clear history cannot be translated into definite unlock failures",()=>{
 const result=buildCrimsonIsleProgress(memberSchema.parse({}));
 assert.equal(result.unlocks.kuudraTiers[1].overall,"NOT_VERIFIED");
 assert.equal(result.unlocks.kuudraTiers[1].reputation,"UNKNOWN");
 assert.equal(result.unlocks.kuudraTiers[1].previousTier,"UNKNOWN");
});

test("later Crimson Isle objectives are recorded without falsely completing faction chapters",()=>{
 const progress=buildCrimsonIsleProgress(memberSchema.parse({
  objectives:{
   talk_to_elle_5:{status:"COMPLETE",completed_at:12345},
   talk_to_elle_9:{status:"COMPLETE",completed_at:12346},
   talk_to_elle_10:{status:"ACTIVE",progress:0},
   talk_to_dean_4:{status:"COMPLETE",completed_at:12348},
  },
 }));
 assert.deepEqual(progress.quests.laterObjectives.map(x=>x.id),["talk_to_dean_4","talk_to_elle_5","talk_to_elle_9","talk_to_elle_10"]);
 assert.equal(progress.quests.laterObjectives.filter(x=>x.status==="COMPLETE").length,3);
 assert.equal(progress.quests.branches.find(x=>x.id==="mages")?.completionVerified,false);
});

test("later dialogue entries preserve API completion with readable NPC labels",()=>{
 const result=buildCrimsonIsleProgress(memberSchema.parse({objectives:{
  talk_to_elle_10:{status:"COMPLETE",completed_at:9000},
  talk_to_dean_4:{status:"ACTIVE",progress:0},
 }}));
 assert.deepEqual(result.quests.laterObjectives.map(o=>o.label),["Dean conversation 4","Elle conversation 10"]);
 assert.deepEqual(result.quests.laterObjectives.map(o=>o.status),["ACTIVE","COMPLETE"]);
});

test("same recorded faction and Basic Kuudra clear infer mandatory earlier chapters",()=>{
 const result=buildCrimsonIsleProgress(memberSchema.parse({
  objectives:{faction_villagers:{status:"COMPLETE"},explore_nether_island:{status:"COMPLETE",faction:"barbarians"}},
  nether_island_player_data:{selected_faction:"barbarians",kuudra_completed_tiers:{none:2}},
 }));
 const b=result.quests.chapterProgress.branches.find(x=>x.faction==="barbarians")!;
 assert.ok(b.chapters.slice(0,-1).every(x=>x.state==="COMPLETE"));
 assert.equal(b.chapters.at(-1)?.state,"IN_PROGRESS");
 assert.equal(b.completionBasis,"BASIC_KUUDRA_CLEAR");
 assert.ok(result.quests.chapterProgress.branches.find(x=>x.faction==="mages")!.chapters.every(x=>x.state==="UNKNOWN"));
});
test("a historical clear cannot be attributed to a different selected faction",()=>{
 const result=buildCrimsonIsleProgress(memberSchema.parse({
  objectives:{explore_nether_island:{status:"COMPLETE",faction:"mages"}},
  nether_island_player_data:{selected_faction:"barbarians",kuudra_completed_tiers:{none:10}},
 }));
 assert.equal(result.quests.chapterProgress.branches.find(x=>x.faction==="barbarians")?.completionBasis,"NONE");
 assert.ok(result.quests.chapterProgress.branches.find(x=>x.faction==="barbarians")!.chapters.every(x=>x.state==="UNKNOWN"));
});
test("no faction provenance means no invented chapter completion from a Kuudra clear",()=>{
 const result=buildCrimsonIsleProgress(memberSchema.parse({
  nether_island_player_data:{selected_faction:"mages",kuudra_completed_tiers:{none:3}},
 }));
 assert.ok(result.quests.chapterProgress.branches.find(x=>x.faction==="mages")!.chapters.every(x=>x.state==="UNKNOWN"));
});
