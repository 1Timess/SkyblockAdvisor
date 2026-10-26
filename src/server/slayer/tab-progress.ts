import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { slayerThresholds } from "../skyblock/domains/slayers";
import levelReference from "../reference/slayer-level-rewards.json";
import dropReference from "../reference/slayer-boss-drops.json";
import rngReference from "../reference/slayer-rng-options.json";

export const SLAYER_FAMILIES=[
 {id:"zombie",name:"Zombie",boss:"Revenant Horror",maxBossTier:5},
 {id:"spider",name:"Spider",boss:"Tarantula Broodfather",maxBossTier:5},
 {id:"wolf",name:"Wolf",boss:"Sven Packmaster",maxBossTier:4},
 {id:"enderman",name:"Enderman",boss:"Voidgloom Seraph",maxBossTier:4},
 {id:"blaze",name:"Blaze",boss:"Inferno Demonlord",maxBossTier:4},
 {id:"vampire",name:"Vampire",boss:"Riftstalker Bloodfiend",maxBossTier:5},
] as const;
type ObservedSlayers=NormalizedSkyBlockProfile["progression"]["slayers"];
export function buildSlayerTabProgress(slayers:ObservedSlayers){
 const families=SLAYER_FAMILIES.map(family=>{
  const observed=slayers[family.id];
  const xpKnown=observed?.xpReported!==false&&observed!==undefined;
  const xp=xpKnown?observed.xp:null;
  const level=xp===null?null:slayerThresholds[family.id].filter(n=>xp>=n).length;
  const nextThreshold=level===null?null:slayerThresholds[family.id][level]??null;
  const prevThreshold=level===null?null:level===0?0:slayerThresholds[family.id][level-1];
  const progress=xp===null||nextThreshold===null||prevThreshold===null?null:
   Math.min(1,Math.max(0,(xp-prevThreshold)/(nextThreshold-prevThreshold)));
  const kills=Array.from({length:family.maxBossTier},(_,i)=>({
   tier:i+1,count:observed?.killsByTier[String(i+1)]??null,
  }));
  const rewards=levelReference.families[family.id].levels;
  const levels=Object.entries(rewards).map(([n,v])=>({
   level:Number(n),threshold:v.xp,unlocks:v.unlocks,grants:v.grants,
   status:level===null?"UNKNOWN":Number(n)<=level?"REACHED":"UPCOMING",
  }));
  const drops=dropReference.families[family.id].drops.map(drop=>({
   name:drop.name,
   conditions:drop.conditions.map(condition=>({
    ...condition,
    levelMet:level===null?null:level>=condition.slayerLevel,
   })),
  }));
  const rngScores=rngReference.slayer[family.boss];
  const rng=Object.entries(rngScores).map(([neuId,score])=>({neuId,meterScore:score}));
  return {id:family.id,name:family.name,boss:family.boss,maxBossTier:family.maxBossTier,
   reported:!!observed,xp,level,maxLevel:slayerThresholds[family.id].length,
   nextLevel:nextThreshold===null?null:level!+1,nextThreshold,
   xpRemaining:xp===null||nextThreshold===null?null:Math.max(0,nextThreshold-xp),
   progress,kills,totalKills:observed?observed.totalKills:null,
   claimedRewardKeys:observed?.claimedRewardKeys??[],levels,drops,rng,
  };
 });
 const reported=families.filter(f=>f.xp!==null);
 return {families,summary:{
  xpKnownFamilies:reported.length,reportedFamilies:families.filter(f=>f.reported).length,
  totalXp:reported.length===families.length?reported.reduce((n,f)=>n+f.xp!,0):null,
  combinedLevels:reported.length===families.length?reported.reduce((n,f)=>n+f.level!,0):null,
  totalKills:families.every(f=>f.reported)?families.reduce((n,f)=>n+f.totalKills!,0):null,
  },references:{levelsAsOf:"2026-09-28",bossDropsAsOf:"2026-10-26",rngAsOf:"2026-10-26"}};
}
export type SlayerTabProgress=ReturnType<typeof buildSlayerTabProgress>;
