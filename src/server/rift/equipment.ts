import type {RawMember,EncodedItems} from "../hypixel/types";
import type {ProcessedItem,ProfileWarning} from "../../schemas/items";
import {decodeInventory} from "../skyblock/nbt/decode-inventory";
import {processItem} from "../skyblock/items/process-item";
import costs from "../reference/rift-costs.json";

const SOURCES=[
 ["inv_armor","rift:armor"],["equipment_contents","rift:equipment"],
 ["inv_contents","rift:inventory"],["ender_chest_contents","rift:enderchest"],
] as const;
const NECKLACE_BY_CHARMS=[0,60,110,155,200,245,270,335,380] as const;
const EQUIPPED_SOURCES=new Set(["rift:equipment","rift:armor"]);
const WIKI="https://hypixelskyblock.minecraft.wiki/w/Rift_Time";
export async function decodeRiftItems(member:RawMember,warnings:ProfileWarning[]) {
 const inventory=member.rift?.inventory;
 if(!inventory)return [];
 const results=await Promise.all(SOURCES.map(async ([key,source])=>{
  const raw=inventory[key] as EncodedItems|undefined;
  if(!raw?.data)return [];
  const decoded=await decodeInventory(raw,source,warnings);
  return decoded.map((item,slot)=>processItem(item,source,slot,warnings))
   .filter((item):item is ProcessedItem=>item!==null);
 }));
 return results.flat();
}
export function buildRiftEquipment(items:readonly ProcessedItem[],known:{
 soulCount:number|null;charmCount:number|null;cloakPurchased:boolean|null;
},availableSourceIds:readonly string[]=[]){
 const observed=items.map(item=>({
  id:item.id,name:item.name,count:item.count,source:item.source,slotIndex:item.slotIndex,
  equipped:EQUIPPED_SOURCES.has(item.source),rarity:item.rarity,
  // Preserve displayed lore for unknown Rift-only stats without misreading them as real-time Rift Time.
  lore:item.lore,
 }));
 const equipped=items.filter(item=>EQUIPPED_SOURCES.has(item.source));
 const cloak=equipped.some(item=>item.id==="ENIGMA_CLOAK");
 const necklace=equipped.some(item=>item.id==="RIFT_NECKLACE_INSIDE");
 const contributions=[
  {id:"enigma_cloak",name:"Enigma Cloak",equipped:cloak,
   seconds:cloak&&known.soulCount!==null&&known.soulCount<=52?20*known.soulCount:null,
   rule:"20s per collected Enigma Soul",source:WIKI},
  {id:"rift_necklace",name:"Rift Necklace",equipped:necklace,
   seconds:necklace&&known.charmCount!==null&&known.charmCount<=8?NECKLACE_BY_CHARMS[known.charmCount]:null,
   rule:"Gallery Timecharm count (1–8)",source:"https://hypixelskyblock.minecraft.wiki/w/Rift_Necklace"},
 ];
 const active=contributions.filter(c=>c.equipped);
 const subtotal=active.every(c=>c.seconds!==null)
  ?active.reduce((sum,c)=>sum+c.seconds!,0):null;
 const price=costs.costs.map(c=>{
  const owned=items.some(item=>item.id===c.requires.item)||c.id==="enigma_cloak"&&known.cloakPurchased===true;
  return {id:c.id,name:c.name,itemId:c.requires.item,owned,prerequisite:c.prerequisite,
   tradeable:c.tradeable,costStatus:c.requires.status,
   materials:c.requires.cost.map(m=>({currency:m.currency,quantity:m.quantity}))};
 });
 return {sources:SOURCES.map(([id,source])=>({id,source,reported:availableSourceIds.includes(id)})),
  items:observed,observedItemCount:observed.length,
  time:{baseSeconds:480,contributions,knownEquippedSubtotalSeconds:subtotal,
   totalRiftTimeSeconds:null as number|null,
   complete:false,reason:"Other equipped items, passives, buffs and temporary Rift Time are not fully represented"},
  costs:price,unpricedUpgrades:costs.unpricedUpgrades};
}
