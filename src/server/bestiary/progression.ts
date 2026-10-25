import type { RawMember } from "../hypixel/types";
import reference from "../reference/bestiary.json";

const count = (value:unknown):number|null => typeof value==="number" && Number.isFinite(value) && value>=0 ? value : null;
const record = (value:unknown):Record<string,unknown> => value && typeof value==="object" && !Array.isArray(value) ? value as Record<string,unknown> : {};

export function buildBestiaryProgress(member:RawMember) {
  const source = member.bestiary;
  const apiAvailable = source?.kills !== undefined;
  const rawKills = record(source?.kills);
  const rawDeaths = record(source?.deaths);
  const claimedData = record(source?.milestone);
  const claimedMilestone = count(claimedData.last_claimed_milestone) ?? (typeof source?.milestone==="number" ? count(source.milestone) : null);
  const brackets:Record<string,number[]> = reference.brackets;
  const sets:Record<string,Record<string,number[]>> = reference.bracketSets;
  const seenKeys=new Set<string>();
  const categories = apiAvailable ? reference.categories.map(category=>{
    const families=category.families.map(family=>{
      for(const key of family.keys)seenKeys.add(key);
      const kills=family.keys.reduce((sum,key)=>sum+(count(rawKills[key])??0),0);
      const deaths=family.keys.reduce((sum,key)=>sum+(count(rawDeaths[key])??0),0);
      const bracketSet = "set" in family ? family.set : undefined;
      const base=bracketSet ? sets[bracketSet]?.[family.bracket] : brackets[family.bracket];
      const thresholds=(base??[]).filter(n=>n<=family.cap);
      // The explicit family cap is authoritative, even if the reference bracket is incomplete.
      if(!thresholds.includes(family.cap))thresholds.push(family.cap);
      const tier=thresholds.filter(n=>kills>=n).length;
      const nextThreshold=thresholds.find(n=>kills<n)??null;
      const previousThreshold=tier===0?0:thresholds[tier-1];
      const progress=nextThreshold===null?1:Math.max(0,Math.min(1,(kills-previousThreshold)/(nextThreshold-previousThreshold)));
      return {name:family.name,keys:family.keys,imageUrl:family.image??null,itemId:("item" in family ? family.item : null)??null,
        kills,deaths,tier,maxTier:thresholds.length,nextThreshold,remaining:nextThreshold===null?0:nextThreshold-kills,progress};
    });
    return {id:category.id,name:category.name,group:category.group,
      discovered:families.filter(f=>f.kills>0).length,maxed:families.filter(f=>f.tier===f.maxTier).length,
      familyTiers:families.reduce((n,f)=>n+f.tier,0),maxFamilyTiers:families.reduce((n,f)=>n+f.maxTier,0),families};
  }):[];
  const families=categories.flatMap(c=>c.families);
  const familyTiers=families.reduce((n,f)=>n+f.tier,0);
  const maxFamilyTiers=families.reduce((n,f)=>n+f.maxTier,0);
  const nextMilestonePoints=Math.floor(familyTiers/10)*10+10;
  const recognized=Object.entries(rawKills).filter(([key,value])=>!seenKeys.has(key)&&count(value)!==null&&key!=="last_killed_mob");
  return {apiAvailable,categories,familyTiers,maxFamilyTiers,
    bestiaryLevel:Math.floor(familyTiers/10),levelProgress:familyTiers%10/10,
    nextMilestonePoints,pointsToNextMilestone:10-familyTiers%10,
    claimedMilestone,discovered:families.filter(f=>f.kills>0).length,
    maxed:families.filter(f=>f.tier===f.maxTier).length,totalFamilies:families.length,
    unmappedKillKeys:recognized.map(([key])=>key).sort(),
  };
}
