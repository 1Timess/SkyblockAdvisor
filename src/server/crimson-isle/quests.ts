import type { RawMember } from "../hypixel/types";

// Source-of-truth is explicit Hypixel quest status. Story order labels are backed
// by the current official Wiki; unrecognized flags and ambiguous states remain visible.
type RawMap=Record<string,unknown>;
const record=(v:unknown):RawMap=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as RawMap:{};
const string=(v:unknown):string|null=>typeof v==="string"&&v.length>0?v:null;
const numeric=(v:unknown):number|null=>typeof v==="number"&&Number.isFinite(v)&&v>=0?v:null;
const STEP_CATALOG=[
 {id:"find_elle",label:"Find Elle",branch:"opening"},
 {id:"talk_to_elle_1",label:"Speak to Elle",branch:"opening"},
 {id:"select_mage_faction",label:"Join the Mage Faction",branch:"mages"},
 {id:"meet_dean_at_academy",label:"Meet the Dean",branch:"mages"},
 {id:"collect_items_for_dean",label:"Collect the Dean's items",branch:"mages"},
 {id:"select_barbarian_faction",label:"Join the Barbarian Faction",branch:"barbarians"},
 {id:"give_heavy_pearl_to_gris",label:"Give a Heavy Pearl to Gris",branch:"barbarians"},
] as const;
const DAILY_CATEGORIES=[
 ["fetch","Fetch"],["fishing","Fishing"],["wanted_mini_boss","Wanted Miniboss"],
 ["dojo","Dojo"],["boss","Boss"],
] as const;
type QuestStatus="COMPLETE"|"ACTIVE"|"UNKNOWN";
function questStatus(value:unknown):QuestStatus{
 const valueMap=record(value),raw=string(valueMap.status)?.toUpperCase();
 return raw==="COMPLETE"?"COMPLETE":raw==="ACTIVE"?"ACTIVE":"UNKNOWN";
}
export function buildCrimsonQuests(member:RawMember) {
 const top=record(member.quests);
 const nether=record(member.nether_island_player_data);
 const netherQuests=record(nether.quests);
 const questData=record(netherQuests.quest_data);
 const objectives=record(member.objectives);
 const objectiveTutorial=new Set(Array.isArray(objectives.tutorial)?objectives.tutorial.filter((x):x is string=>typeof x==="string"):[]);
 const storyline=STEP_CATALOG.map(step=>{
  const raw=top[step.id],status=questStatus(raw);
  const fields=record(raw);
  return {...step,status,available:raw!==undefined,activatedAt:numeric(fields.activated_at),
   completedAt:numeric(fields.completed_at)};
 });
 const unknownStorylineKeys=Object.keys(top).filter(key=>
  !STEP_CATALOG.some(step=>step.id===key) &&
  /elle|dean|chief|ugo|lasea|gris|mage_faction|barbarian_faction|kuudra|heavy_pearl|sulphur/i.test(key)
 ).sort();
 const daily=DAILY_CATEGORIES.map(([id,label])=>{
  const raw=questData[id],entry=record(raw);
  return {id,label,available:raw!==undefined,status:string(entry.status),progress:numeric(entry.progress),
   completedAt:numeric(entry.completed_at)};
 });
 const dailyList=Array.isArray(questData.quest_list)?questData.quest_list.filter((x):x is string=>typeof x==="string"):[];
 const dailyExtraKeys=Object.keys(questData).filter(key=>key!=="quest_list"&&!DAILY_CATEGORIES.some(([id])=>id===key));
 const questRewards=record(netherQuests.quest_rewards);
 const claimedQuestRewards=Object.keys(questRewards).filter(key=>questRewards[key]===true).sort();
 // A Kuudra completion is not proof that the final Elle/Chief/Dean conversation happened.
 const branches=["opening","mages","barbarians"].map(branch=>{
  const steps=storyline.filter(step=>step.branch===branch);
  const reported=steps.some(step=>step.available);
  const allComplete=steps.length>0&&steps.every(step=>step.status==="COMPLETE");
  return {id:branch,reported,allKnownStepsComplete:allComplete,
   observedComplete:steps.filter(step=>step.status==="COMPLETE").length,
   totalMappedSteps:steps.length,completionVerified:false};
 });
 return {
  questApiAvailable:member.quests!==undefined,netherQuestApiAvailable:nether.quests!==undefined,
  storyline,branches,unknownStorylineKeys,
  objectiveSignals:[...objectiveTutorial].filter(x=>/elle|faction|kuudra|nether/i.test(x)).sort(),
  daily:{available:netherQuests.quest_data!==undefined,assignments:dailyList,entries:daily,
   extraKeys:dailyExtraKeys.sort(),questRewardsClaimed:claimedQuestRewards},
 };
}
