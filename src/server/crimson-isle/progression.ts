import type { RawMember } from "../hypixel/types";

// Data-only Crimson Isle domain. These are reported facts or explicitly labelled
// eligibility estimates, never proof of ownership, claim state, or combat readiness.
type UnknownRecord = Record<string,unknown>;
const object = (value:unknown):UnknownRecord => value!==null&&typeof value==="object"&&!Array.isArray(value)?value as UnknownRecord:{};
const number = (value:unknown):number|null => typeof value==="number"&&Number.isFinite(value)&&value>=0?value:null;
const int = (value:unknown):number|null => {const n=number(value);return n!==null&&Number.isSafeInteger(n)?n:null};
const str = (value:unknown):string|null => typeof value==="string"&&value.length>0?value:null;
const DOJO_TESTS = [
 ["force","mob_kb"],["stamina","wall_jump"],["mastery","archer"],
 ["discipline","sword_swap"],["swiftness","snake"],["control","lock_head"],["tenacity","fireball"],
] as const;
const BELTS=[["Black",7000],["Brown",6000],["Blue",4000],["Green",2000],["Yellow",1000],["White",0]] as const;
const REPUTATION=[["Hero",12000],["Honored",7000],["Trusted",3000],["Friendly",1000],["Neutral",0]] as const;
const KUUDRA=[
 {id:"none",name:"Basic",reputation:0,points:1},
 {id:"hot",name:"Hot",reputation:1000,points:2},
 {id:"burning",name:"Burning",reputation:3000,points:3},
 {id:"fiery",name:"Fiery",reputation:7000,points:4},
 {id:"infernal",name:"Infernal",reputation:12000,points:5},
] as const;
const FISH=[
 "gusher","blobfish","lava_horse","golden_fish","volcanic_stonefish","slugfish",
 "vanille","obfuscated_fish_1","obfuscated_fish_2","obfuscated_fish_3",
 "sulphur_skitter","skeleton_fish","mana_ray","flyfish","steaming_hot_flounder",
 "soul_fish","karate_fish","moldfin",
] as const;
const QUALITIES=["bronze","silver","gold","diamond"] as const;
function rank(points:number){return points>=1000?"S":points>=800?"A":points>=600?"B":points>=400?"C":points>=200?"D":"F"}
function reputationRank(value:number|null){return value===null?null:REPUTATION.find(([,required])=>value>=required)?.[0]??null}
export function buildCrimsonIsleProgress(member:RawMember){
 const raw=member.nether_island_player_data;
 const available=raw!==undefined&&raw!==null;
 const nether=object(raw);
 const selectedFaction=str(nether.selected_faction);
 const reputation={
  mages:number(nether.mages_reputation),barbarians:number(nether.barbarians_reputation),
  magesHighest:number(nether.mages_reputation_highest),
 };
 const factions=[
  {id:"mages",reputation:reputation.mages,rank:reputationRank(reputation.mages)},
  {id:"barbarians",reputation:reputation.barbarians,rank:reputationRank(reputation.barbarians)},
 ];
 const currentFaction=selectedFaction?.toLowerCase()??null;
 const currentReputation=currentFaction?.includes("mage")?reputation.mages:currentFaction?.includes("barbarian")?reputation.barbarians:null;
 const dojoRecord=object(nether.dojo);
 const dojoAvailable=nether.dojo!==undefined&&nether.dojo!==null;
 const dojoTests=DOJO_TESTS.map(([name,id])=>{
  const points=int(dojoRecord[`dojo_points_${id}`]);
  return {id,name,points,time:number(dojoRecord[`dojo_time_${id}`]),rank:points===null?null:rank(points)};
 });
 const dojoTotal=dojoTests.every(t=>t.points!==null)?dojoTests.reduce((sum,t)=>sum+t.points!,0):null;
 const belt=dojoTotal===null?null:BELTS.find(([,required])=>dojoTotal>=required)?.[0]??null;
 const nextBelt=dojoTotal===null?null:[...BELTS].reverse().find(([,required])=>required>dojoTotal);
 const kuudraRecord=object(nether.kuudra_completed_tiers);
 const kuudraAvailable=nether.kuudra_completed_tiers!==undefined&&nether.kuudra_completed_tiers!==null;
 const tiers=KUUDRA.map((t,i)=>{
  const completions=int(kuudraRecord[t.id]);
  const highestWave=int(kuudraRecord[`highest_wave_${t.id}`]);
  const previous=i===0?null:KUUDRA[i-1];
  const previousCleared=previous===null?null:int(kuudraRecord[previous.id]);
  // Storyline completion is not inferred from kills, reputation, or prior clears.
  const reputationMet=currentReputation===null?null:currentReputation>=t.reputation;
  const prerequisiteCleared=previous===null?null:previousCleared===null?null:previousCleared>0;
  return {...t,completions,highestWave,reputationMet,previousCleared:prerequisiteCleared,
   storyRequired:t.id==="hot",storyVerified:false};
 });
 const kuudraCollection=kuudraAvailable && tiers.every(t=>t.completions!==null)
  ? tiers.reduce((sum,t)=>sum+t.completions!*t.points,0):null;
 const totalCompletions=kuudraAvailable&&tiers.every(t=>t.completions!==null)
  ? tiers.reduce((sum,t)=>sum+t.completions!,0):null;
 const trophyRecord=object(member.trophy_fish);
 const trophyAvailable=member.trophy_fish!==undefined&&member.trophy_fish!==null;
 const fish=FISH.map(id=>{
  const counts=QUALITIES.map(quality=>int(trophyRecord[`${id}_${quality}`]));
  const highestQuality=[...QUALITIES].reverse().find(quality=>(int(trophyRecord[`${id}_${quality}`])??0)>0)??null;
  return {id,bronze:counts[0],silver:counts[1],gold:counts[2],diamond:counts[3],
   highestQuality,total:counts.every(n=>n!==null)?counts.reduce<number>((sum,n)=>sum+n!,0):null};
 });
 const rawRewards=trophyRecord.rewards;
 const rewards=Array.isArray(rawRewards)?rawRewards.filter((value):value is number=>int(value)!==null):null;
 const highestReward=rewards?.length?Math.max(...rewards):null;
 const claimedOdgerRank=highestReward===null?null:({1:"Bronze",2:"Silver",3:"Gold",4:"Diamond"} as Record<number,string>)[highestReward]??null;
 const grades=QUALITIES.map((quality,index)=>({quality,unique:fish.filter(f=>QUALITIES.slice(index).some(q=>(f[q]??0)>0)).length}));
 const matriarchRecord=object(nether.matriarch);
 const matriarchAvailable=nether.matriarch!==undefined&&nether.matriarch!==null;
 return {available,
  faction:{selected:selectedFaction,currentReputation,reputation,factions},
  dojo:{available:dojoAvailable,tests:dojoTests,totalPoints:dojoTotal,eligibleBelt:belt,
   nextBelt:nextBelt?.[0]??null,pointsToNext:dojoTotal===null?null:nextBelt?nextBelt[1]-dojoTotal:0},
  kuudra:{available:kuudraAvailable,tiers,totalCompletions,collectionPoints:kuudraCollection},
  trophyFishing:{available:trophyAvailable,fish,totalCaught:int(trophyRecord.total_caught),
   rewards,claimedOdgerRank,grades,fishTypes:FISH.length},
  matriarch:{available:matriarchAvailable,pearlsCollected:int(matriarchRecord.pearls_collected),
   lastAttempt:number(matriarchRecord.last_attempt),
   recentRefreshes:Array.isArray(matriarchRecord.recent_refreshes)?matriarchRecord.recent_refreshes.filter((x):x is number=>number(x)!==null):null},
  questDataAvailable:nether.quests!==undefined&&nether.quests!==null,
 };
}
