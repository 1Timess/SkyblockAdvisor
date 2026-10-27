import type {ProcessedItem} from "../../../schemas/items";
import type {MarketSnapshot} from "../../../schemas/market";

export function buildMiscValuation(items:readonly ProcessedItem[],snapshot:MarketSnapshot|null){
 const seen=new Set<string>();
 const candidates=items.filter(item=>{
  if(!item.id||item.count<1)return false;
  // Equipped and saved loadout snapshots can reference the same physical item.
  if(item.uuid){if(seen.has(item.uuid))return false;seen.add(item.uuid);}
  return true;
 });
 const valued=candidates.flatMap(item=>{
  const quote=snapshot?.quotes[item.id!];
  if(!quote||!Number.isFinite(quote.coins)||quote.coins<=0)return [];
  return [{id:item.id!,name:item.name,source:item.source,quantity:item.count,
   baseUnitPrice:quote.coins,baseStackValue:quote.coins*item.count,
   basis:quote.basis,confidence:quote.confidence,observedAt:quote.observedAt,
   modified: Boolean(item.reforge||item.recombobulated||(item.stars??0)>0||
    Object.keys(item.enchantments).length>0)}];
 }).sort((a,b)=>b.baseStackValue-a.baseStackValue);
 return {items:valued,pricedCount:valued.length,unpricedCount:candidates.length-valued.length,
  snapshotAt:snapshot?.observedAt??null,
  limitation:"Values are item-ID base market estimates; enchantments, gemstones, upgrades, skins, attributes and other premiums are not valued. Rankings may differ from actual item values."};
}
