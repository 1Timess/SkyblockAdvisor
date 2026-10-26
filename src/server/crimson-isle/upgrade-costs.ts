import essence from "../reference/crimson-essence-costs.json";
import type { MarketQuote } from "../../schemas/market";

/** NEU covers stars; the official Crimson Armor wiki supplies separate prestige fees. */
const PRESTIGE=[
 {essence:150,teeth:10,coins:2_000_000},
 {essence:800,teeth:20,coins:5_000_000},
 {essence:4_500,teeth:50,coins:10_000_000},
 {essence:25_500,teeth:80,coins:20_000_000},
] as const;
const PREFIXES=["","HOT_","BURNING_","FIERY_","INFERNAL_"] as const;
const LABELS=["Basic","Hot","Burning","Fiery","Infernal"] as const;
type Ingredient={id:string;quantity:number};
export type MarketQuotes=Record<string,MarketQuote>;
export interface UpgradeStep {
 action:"STAR"|"PRESTIGE";fromTier:string;toTier:string;fromStars:number;toStars:number;
 requirements:Ingredient[];recipeComplete:boolean;source:string;
}
export interface PricedIngredient extends Ingredient {
 unitPrice:number|null;estimatedCoins:number|null;basis:MarketQuote["basis"]|null;observedAt:string|null;
}
export interface UpgradeCostSummary {
 steps:number;recipeComplete:boolean;ingredients:PricedIngredient[];
 directCoins:number;estimatedMaterialCoins:number|null;
 estimatedTotalCoins:number|null;missingPriceIds:string[];
}
function parseIngredient(value:string):Ingredient|null {
 const match=/^(.+):(\d+)$/.exec(value);
 if(!match)return null;
 const quantity=Number(match[2]);
 return Number.isSafeInteger(quantity)&&quantity>0?{id:match[1],quantity}:null;
}
function starStep(id:string,tier:number,fromStars:number):UpgradeStep {
 const reference=essence.items as Record<string,{type:string;stars:Record<string,number>;items:Record<string,string[]>}>;
 const item=reference[id],toStars=fromStars+1;
 const cost=item?.stars?.[String(toStars)];
 const extra=item?.items?.[String(toStars)]??[];
 const parsed=extra.map(parseIngredient);
 const recipeComplete=item?.type==="Crimson"&&typeof cost==="number"&&Number.isSafeInteger(cost)&&cost>0&&parsed.every(v=>v!==null);
 return {action:"STAR",fromTier:LABELS[tier],toTier:LABELS[tier],fromStars,toStars,
  requirements:recipeComplete?[{id:"ESSENCE_CRIMSON",quantity:cost},...(parsed as Ingredient[])]:[],
  recipeComplete:!!recipeComplete,source:"NEU essencecosts.json"};
}
function prestigeStep(tier:number):UpgradeStep {
 const cost=PRESTIGE[tier];
 return {action:"PRESTIGE",fromTier:LABELS[tier],toTier:LABELS[tier+1],
  fromStars:10,toStars:0,
  requirements:cost?[{id:"ESSENCE_CRIMSON",quantity:cost.essence},
   {id:"KUUDRA_TEETH",quantity:cost.teeth},{id:"SKYBLOCK_COIN",quantity:cost.coins}]:[],
  recipeComplete:!!cost,source:"https://hypixelskyblock.minecraft.wiki/w/Crimson_Armor"};
}
export function priceUpgradeSteps(steps:readonly UpgradeStep[],quotes:MarketQuotes):UpgradeCostSummary {
 const grouped=new Map<string,number>();
 for(const step of steps)for(const ingredient of step.requirements)
  grouped.set(ingredient.id,(grouped.get(ingredient.id)??0)+ingredient.quantity);
 const recipeComplete=steps.every(step=>step.recipeComplete);
 const ingredients=[...grouped].map(([id,quantity])=>{
  const quote=id==="SKYBLOCK_COIN"?null:quotes[id];
  const unitPrice=id==="SKYBLOCK_COIN"?1:quote?.coins??null;
  return {id,quantity,unitPrice,estimatedCoins:unitPrice===null?null:unitPrice*quantity,
   basis:quote?.basis??null,observedAt:quote?.observedAt??null};
 });
 const missingPriceIds=ingredients.filter(x=>x.unitPrice===null).map(x=>x.id);
 const directCoins=ingredients.find(x=>x.id==="SKYBLOCK_COIN")?.quantity??0;
 const material=ingredients.filter(x=>x.id!=="SKYBLOCK_COIN");
 const estimatedMaterialCoins=recipeComplete&&missingPriceIds.length===0
  ?material.reduce((n,x)=>n+x.estimatedCoins!,0):null;
 return {steps:steps.length,recipeComplete,ingredients,directCoins,estimatedMaterialCoins,
  estimatedTotalCoins:estimatedMaterialCoins===null?null:directCoins+estimatedMaterialCoins,
  missingPriceIds};
}
/** Build the next action and all remaining actions up to Infernal 15★.
 * This estimates gross replacement cost; already owned materials are not subtracted.
 */
export interface ArmorUpgradePath {
 known:boolean;nextStep:UpgradeStep|null;nextCost:UpgradeCostSummary|null;
 remainingSteps:UpgradeStep[];toMax:UpgradeCostSummary|null;
}
export function armorUpgradePath(id:string,stars:number|null,quotes:MarketQuotes={}):ArmorUpgradePath {
 const index=PREFIXES.findIndex((prefix,i)=>id.startsWith(prefix)&&
  (i!==0||!PREFIXES.slice(1).some(other=>id.startsWith(other))));
 const valid=index>=0&&stars!==null&&Number.isInteger(stars)&&stars>=0&&stars<=(index===4?15:10);
 if(!valid)return {known:false,nextStep:null,nextCost:null,remainingSteps:[],toMax:null};
 const suffix=id.slice(PREFIXES[index].length);
 const steps:UpgradeStep[]=[];
 for(let tier=index;tier<PREFIXES.length;tier++){
  const cap=tier===4?15:10;
  for(let star=tier===index?stars!:0;star<cap;star++)steps.push(starStep(PREFIXES[tier]+suffix,tier,star));
  if(tier<4)steps.push(prestigeStep(tier));
 }
 return {known:true,nextStep:steps[0]??null,nextCost:steps.length?priceUpgradeSteps([steps[0]],quotes):null,
  remainingSteps:steps,toMax:priceUpgradeSteps(steps,quotes)};
}
