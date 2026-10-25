import type { RawProfile } from "../hypixel/types";
import { parseCollectionDefinitions, type CollectionDefinition } from "./progression";

export type CollectionResource = { collections: Record<string,unknown>; version?:string; lastUpdated?:number };

function asRecord(value:unknown):Record<string,unknown> {
 return value !== null && typeof value==="object" && !Array.isArray(value) ? value as Record<string,unknown> : {};
}
function natural(value:unknown):number|null {
 return typeof value==="number" && Number.isSafeInteger(value) && value>=0 ? value : null;
}
const cleanedIds=(value:unknown):string[]|null=>Array.isArray(value) && value.every(v=>typeof v==="string") ? value : null;

export function buildCollectionsProgress(profile:RawProfile, selectedUuid:string, resource:CollectionResource|null) {
 const definitions:CollectionDefinition[]=resource?parseCollectionDefinitions(resource):[];
 const parsed=Object.entries(profile.members).map(([uuid,raw])=>{
  const member=asRecord(raw),player=asRecord(member.player_data),counts=asRecord(member.collection);
  return {uuid,counts:member.collection && typeof member.collection==="object" && !Array.isArray(member.collection)?counts:null,
   unlocked:cleanedIds(player.unlocked_coll_tiers)};
 });
 const selected=parsed.find(member=>member.uuid===selectedUuid);
 const complete=parsed.length>0 && parsed.every(member=>member.counts!==null);
 const unlockedComplete=parsed.length>0 && parsed.every(member=>member.unlocked!==null);
 const claims=new Set(parsed.flatMap(member=>member.unlocked??[]).map(id=>id.toUpperCase()));
 const collections=definitions.map(def=>{
  const personal=natural(selected?.counts?.[def.id]);
  const contributions=parsed.map(member=>natural(member.counts?.[def.id]));
  const seen=contributions.some(value=>value!==null);
  const observed=seen ? contributions.reduce<number>((sum,value)=>sum+(value??0),0) : null;
  const explicit=def.tiers.filter(tier=>claims.has(`${def.id.toUpperCase()}_${tier.tier}`));
  const confirmedTier=explicit.length?explicit[explicit.length-1].tier:0;
  const inferredTier=observed===null?null:(def.tiers.filter(t=>observed>=t.amount).at(-1)?.tier??0);
  const earnedTier=Math.max(confirmedTier,inferredTier??0);
  const highest=def.tiers.at(-1)?.tier??0;
  const maxed=highest>0 && earnedTier>=highest;
  const next=def.tiers.find(t=>t.tier>earnedTier)??null;
  const previous=def.tiers.filter(t=>t.tier<=earnedTier).at(-1)?.amount??0;
  const progress=next===null?1:observed===null?null:Math.min(1,Math.max(0,(observed-previous)/(next.amount-previous)));
  const tiers=def.tiers.map(tier=>({
   tier:tier.tier,required:tier.amount,unlocks:tier.unlocks,
   confirmed:claims.has(`${def.id.toUpperCase()}_${tier.tier}`),
   thresholdObserved:observed!==null && observed>=tier.amount,
  }));
  return {id:def.id,name:def.name,category:def.category,personal,observed,
   confirmedTier,inferredTier,earnedTier,maxTier:highest,maxed,nextTier:next?.tier??null,nextRequired:next?.amount??null,
   remaining:next && observed!==null?Math.max(0,next.amount-observed):null,progress,tiers};
 });
 const categories=[...new Set(collections.map(c=>c.category))].map(name=>{
  const entries=collections.filter(c=>c.category===name);
  return {name,count:entries.length,discovered:entries.filter(e=>(e.observed??0)>0||e.earnedTier>0).length,
   maxed:entries.filter(e=>e.maxed).length,earnedTiers:entries.reduce((n,e)=>n+e.earnedTier,0),
   maxTiers:entries.reduce((n,e)=>n+e.maxTier,0)};
 }).sort((a,b)=>a.name.localeCompare(b.name));
 return {referenceAvailable:resource!==null,referenceVersion:resource?.version??null,
  contributionsComplete:complete,unlocksComplete:unlockedComplete,observedMembers:parsed.filter(m=>m.counts!==null).length,
  totalMembers:parsed.length,collections,categories,totalCollections:collections.length,
  discovered:collections.filter(c=>(c.observed??0)>0||c.earnedTier>0).length,
  maxed:collections.filter(c=>c.maxed).length,
  earnedTiers:collections.reduce((n,c)=>n+c.earnedTier,0),
  maxTiers:collections.reduce((n,c)=>n+c.maxTier,0),
 };
}
