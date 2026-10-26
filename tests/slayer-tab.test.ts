import test from "node:test";
import assert from "node:assert/strict";
import {buildSlayerTabProgress} from "../src/server/slayer/tab-progress";
import {buildSlayers} from "../src/server/skyblock/domains/slayers";
import type {RawMember} from "../src/server/hypixel/types";

function from(member:RawMember){
 return buildSlayerTabProgress(buildSlayers(member,[]));
}
test("six Slayer families use reported XP and distinguish missing family XP",()=>{
 const progress=from({slayer:{slayer_bosses:{
  zombie:{xp:100000,boss_kills_tier_0:9,boss_kills_tier_4:2,claimed_levels:{level_7_special:true}},
  blaze:{claimed_levels:{}},
 }}} as RawMember);
 assert.equal(progress.families.length,6);
 assert.equal(progress.families[0].level,7);
 assert.equal(progress.families[0].nextLevel,8);
 assert.equal(progress.families[0].xpRemaining,300000);
 assert.equal(progress.families[0].kills.find(x=>x.tier===5)?.count,2);
 assert.equal(progress.families[0].kills.find(x=>x.tier===2)?.count,null);
 assert.equal(progress.families.find(x=>x.id==="blaze")?.xp,null);
 assert.equal(progress.families.find(x=>x.id==="vampire")?.reported,false);
 assert.equal(progress.summary.totalXp,null);
});
test("Slayer rewards and drop eligibility do not imply ownership",()=>{
 const p=from({slayer:{slayer_bosses:{enderman:{xp:5000,boss_kills_tier_2:4}}}} as RawMember);
 const e=p.families.find(x=>x.id==="enderman")!;
 assert.equal(e.level,5);
 assert.equal(e.levels.find(x=>x.level===5)?.status,"REACHED");
 assert.equal(e.levels.find(x=>x.level===6)?.status,"UPCOMING");
 const judgement=e.drops.find(x=>/judgement core/i.test(x.name))!;
 assert.ok(judgement.conditions.every(c=>c.bossTier===4));
 assert.ok(judgement.conditions.every(c=>c.levelMet!==null));
});
test("Paragon is separate reference drop from RNG list and excludes Vampire",()=>{
 const p=from({} as RawMember);
 for(const f of p.families){
  const paragon=f.drops.find(x=>x.name==="Paragon Shard");
  if(f.id==="vampire"){assert.equal(paragon,undefined);continue;}
  assert.ok(paragon);
  assert.ok(paragon!.conditions.some(x=>x.bossTier===4&&x.slayerLevel===5));
  assert.equal(paragon!.conditions.some(x=>x.bossTier===5),f.id==="zombie"||f.id==="spider");
 }
 assert.equal(p.families.reduce((n,f)=>n+f.rng.length,0),92);
});
test("fully known Slayer progress computes totals and max-level progress safely",()=>{
 const all=Object.fromEntries(["zombie","spider","wolf","enderman","blaze","vampire"].map(id=>[id,{xp:1000000,boss_kills_tier_0:1}]));
 const p=from({slayer:{slayer_bosses:all}} as RawMember);
 assert.equal(p.summary.totalXp,6000000);
 assert.equal(p.summary.totalKills,6);
 assert.equal(p.families.find(f=>f.id==="vampire")?.nextLevel,null);
});
