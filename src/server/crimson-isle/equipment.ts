import type { ProcessedItem } from "../../schemas/items";

const FAMILIES=["CRIMSON","AURORA","TERROR","FERVOR","HOLLOW"] as const;
const TIERS=[{prefix:"",label:"Basic",combat:22,kuudra:"none",maxStars:10},
 {prefix:"HOT_",label:"Hot",combat:27,kuudra:"hot",maxStars:10},
 {prefix:"BURNING_",label:"Burning",combat:32,kuudra:"burning",maxStars:10},
 {prefix:"FIERY_",label:"Fiery",combat:37,kuudra:"fiery",maxStars:10},
 {prefix:"INFERNAL_",label:"Infernal",combat:42,kuudra:"infernal",maxStars:15}] as const;
const SLOTS=["HELMET","CHESTPLATE","LEGGINGS","BOOTS"] as const;
export type ArmorClearEvidence = Record<string, number|null>;
export function kuudraArmorTierRequirements(tierIndex:number, combatLevel:number|null, clears:ArmorClearEvidence) {
 const target=TIERS[tierIndex];
 if(!target)return null;
 const clearsCount=clears[target.kuudra]??null;
 return {combatLevelRequired:target.combat,kuudraTierRequired:target.kuudra,
  combatMet:combatLevel===null?null:combatLevel>=target.combat,
  kuudraClearMet:clearsCount===null?null:clearsCount>0};
}
export function buildKuudraArmorProgress(items:readonly ProcessedItem[], combatLevel:number|null, clears:ArmorClearEvidence) {
 const pieces=items.flatMap(item=>{
  if(!item.id)return [];
  const id=item.id.toUpperCase();
  for(const [index,tier] of TIERS.entries()) {
   if(!id.startsWith(tier.prefix))continue;
   const rest=id.slice(tier.prefix.length);
   const family=FAMILIES.find(f=>SLOTS.some(slot=>rest===f+"_"+slot));
   if(!family)continue;
   const slot=SLOTS.find(s=>rest===family+"_"+s)!;
   const stars=typeof item.stars==="number"&&Number.isSafeInteger(item.stars)&&item.stars>=0?item.stars:null;
   const validStars=stars!==null&&stars<=tier.maxStars?stars:null;
   const canPrestige=index<TIERS.length-1&&validStars!==null&&validStars>=10;
   const next=TIERS[index+1];
   const sourceRequirements=kuudraArmorTierRequirements(index,combatLevel,clears)!;
   const targetRequirements=next?kuudraArmorTierRequirements(index+1,combatLevel,clears):null;
   return [{
    id:item.id,uuid:item.uuid,name:item.name,source:item.source,slot:slot.toLowerCase(),family:family.toLowerCase(),
    tier:tier.label,stars:validStars,maxStars:tier.maxStars,
    nextAction:validStars===null?"UNKNOWN" as const:validStars<tier.maxStars?"STAR" as const:next?"PRESTIGE" as const:"MAXED" as const,
    starsUntilNext:validStars===null?null:Math.max(0,tier.maxStars-validStars),
    nextTier:next?.label??null,prestigeStarRequirement:next?10:null,prestigeStarMet:canPrestige,
    currentRequirements:sourceRequirements,nextTierRequirements:targetRequirements,
    // No legacy attribute assumptions. Upgrade costs intentionally pending item-specific tables.
    upgradeCostKnown:false,
   }];
  }
  return [];
 });
 return {available:true,pieces,trackedPieces:pieces.length};
}
