import type { RawMember } from "../hypixel/types";

// Only actual objective IDs observed in public Hypixel profile payloads are mapped.
// Reference captures: dungeon-hub/hypixel-wrapper full-profiles (6e08d322...)
// and Elfouille/Sky_Track objectives snapshots (Feb 2026).
// The full Mage/Barbarian branch sequence is NOT documented by the profile API.
type RawMap=Record<string,unknown>;
const record=(v:unknown):RawMap=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as RawMap:{};
const string=(v:unknown):string|null=>typeof v==="string"&&v.length>0?v:null;
const numeric=(v:unknown):number|null=>typeof v==="number"&&Number.isFinite(v)&&v>=0?v:null;
const STEP_CATALOG=[
 {id:"talk_to_elle_1",label:"Find and speak to Elle",branch:"opening"},
 {id:"help_elle",label:"Help Elle",branch:"opening"},
 {id:"talk_to_elle_2",label:"Continue speaking to Elle",branch:"opening"},
 {id:"collect_nether_items",label:"Gather Nether materials",branch:"opening"},
 {id:"explore_nether_island",label:"Explore Crimson Isle",branch:"opening"},
 {id:"faction_villagers",label:"Speak to faction representatives",branch:"opening"},
] as const;
const DAILY_CATEGORIES=[
 ["fetch","Fetch"],["fishing","Fishing"],["rescue","Rescue"],
 ["dojo","Dojo"],["boss","Boss"],
] as const;
type QuestStatus="COMPLETE"|"ACTIVE"|"INACTIVE"|"UNKNOWN";
function questStatus(value:unknown):QuestStatus {
 const raw=string(record(value).status)?.toUpperCase();
 return raw==="COMPLETE"||raw==="ACTIVE"||raw==="INACTIVE"?raw:"UNKNOWN";
}
export function buildCrimsonQuests(member:RawMember) {
 const objectives=record(member.objectives);
 const tutorial=new Set(Array.isArray(objectives.tutorial)?objectives.tutorial.filter((x):x is string=>typeof x==="string"):[]);
 const nether=record(member.nether_island_player_data);
 const netherQuests=record(nether.quests);
 const questData=record(netherQuests.quest_data);
 const storyline=STEP_CATALOG.map(step=>{
  const raw=objectives[step.id], fields=record(raw);
  return {...step,status:questStatus(raw),available:raw!==undefined,
   progress:numeric(fields.progress),completedAt:numeric(fields.completed_at)};
 });
 // Recorded Kuudra completions are historical evidence of completing the
 // storyline entry prerequisite, not evidence of completing both branches.
 const kuudra=record(nether.kuudra_completed_tiers);
 const firstClear=numeric(kuudra.none);
 const historicStorylineAccess=firstClear!==null&&firstClear>0;
 const reported=storyline.filter(step=>step.available);
 const additionalObjectiveKeys=Object.keys(objectives).filter(key=>
   !STEP_CATALOG.some(step=>step.id===key) &&
   /^(talk_to_elle(?:_\d+)?|help_elle|talk_to_dean_\d+|faction_villagers)$/.test(key)
 ).sort();
 const branchNames=["opening","mages","barbarians"];
 const branches=branchNames.map(branch=>{
  const steps=storyline.filter(step=>step.branch===branch);
  const recorded=steps.filter(step=>step.available);
  return {id:branch,reported:recorded.length>0,
   allKnownStepsComplete:recorded.length>0&&recorded.length===steps.length&&recorded.every(step=>step.status==="COMPLETE"),
   observedComplete:recorded.filter(step=>step.status==="COMPLETE").length,
   totalMappedSteps:steps.length,completionVerified:false};
 });
 const assignments=Array.isArray(questData.quest_list)
  ?questData.quest_list.filter((v):v is string=>typeof v==="string"):[];
 const daily=DAILY_CATEGORIES.map(([id,label])=>{
  const raw=questData[id],entry=record(raw);
  return {id,label,available:raw!==undefined,status:string(entry.status),
   progress:numeric(entry.progress),completedAt:numeric(entry.completed_at)};
 });
 const rewards=record(netherQuests.quest_rewards);
 const rewardEntries=Object.entries(rewards).filter(([,value])=>typeof value==="string"||typeof value==="number")
  .map(([id,value])=>({id,reward:String(value)})).sort((a,b)=>a.id.localeCompare(b.id));
 const extraKeys=Object.keys(questData).filter(key=>key!=="quest_list"&&!DAILY_CATEGORIES.some(([id])=>id===key));
 return {
  questApiAvailable:member.objectives!==undefined,
  netherQuestApiAvailable:nether.quests!==undefined,
  storyline,branches,unknownStorylineKeys:additionalObjectiveKeys,
  objectiveSignals:[...tutorial].filter(key=>/elle|faction|kuudra|nether/i.test(key)).sort(),
  storyEvidence:{reportedSteps:reported.length,completedSteps:reported.filter(step=>step.status==="COMPLETE").length,
   activeSteps:reported.filter(step=>step.status==="ACTIVE").length,
   historicallyAccessedKuudra:historicStorylineAccess},
  daily:{available:netherQuests.quest_data!==undefined,assignments,entries:daily,
   extraKeys:extraKeys.sort(),rewardEntries},
 };
}
