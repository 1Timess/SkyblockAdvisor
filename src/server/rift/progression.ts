import type { RawMember } from "../hypixel/types";

type AnyRecord = Record<string,unknown>;
const obj=(value:unknown):AnyRecord => value!==null&&typeof value==="object"&&!Array.isArray(value)?value as AnyRecord:{};
const count=(value:unknown):number|null => typeof value==="number"&&Number.isSafeInteger(value)&&value>=0?value:null;
const flag=(value:unknown):boolean|null => typeof value==="boolean"?value:null;
const keys=(value:unknown):string[]|null => Array.isArray(value)&&value.every(x=>typeof x==="string")?[...new Set(value)]:null;
const get=(source:AnyRecord,path:readonly string[]):unknown=>path.reduce<unknown>((v,k)=>obj(v)[k],source);
const reading=(source:AnyRecord,path:string[])=>{const v=get(source,path);return {reported:v!==undefined&&v!==null,value:v}};
const progress=(source:AnyRecord,path:string[],kind:"boolean"|"count"|"list")=>{
 const v=reading(source,path),raw=v.value;
 return {id:path.join("."),reported:v.reported,
  boolean:kind==="boolean"?flag(raw):null,
  count:kind==="count"?count(raw):kind==="list"?keys(raw)?.length??null:null,
  entries:kind==="list"?keys(raw):null};
};
// Source fields only: no assumed reset cadence, quest sequence, or availability.
// In particular Rift Gallery trophy.type values are retained verbatim until
// a current canonical Timecharm-ID catalogue is validated.
const ACTIVITIES=[
 ["wyld_woods.sirius_q_a_chain_done","boolean"],["wyld_woods.sirius_completed_q_a","boolean"],
 ["wyld_woods.sirius_claimed_doubloon","boolean"],["wyld_woods.talked_threebrothers","list"],
 ["wyld_woods.bughunter_step","count"],["black_lagoon.talked_to_edwin","boolean"],
 ["black_lagoon.received_science_paper","boolean"],["black_lagoon.delivered_science_paper","boolean"],
 ["black_lagoon.completed_step","count"],["west_village.crazy_kloon.quest_complete","boolean"],
 ["west_village.crazy_kloon.hacked_terminals","list"],
 ["west_village.mirrorverse.visited_rooms","list"],["west_village.mirrorverse.claimed_chest_items","list"],
 ["west_village.mirrorverse.claimed_reward","boolean"],["west_village.glyphs.completed","boolean"],
 ["west_village.glyphs.claimed_wand","boolean"],["west_village.glyphs.claimed_bracelet","boolean"],
 ["village_plaza.barry_center.received_reward","boolean"],
 ["village_plaza.barry_center.convinced","list"],["village_plaza.murder.step_index","count"],
 ["village_plaza.seraphine.step_index","count"],["wither_cage.killed_eyes","list"],
 ["dead_cats.talked_to_jacquelle","boolean"],["dead_cats.picked_up_detector","boolean"],
 ["dead_cats.found_cats","list"],["dead_cats.unlocked_pet","boolean"],
 ["wizard_tower.wizard_quest_step","count"],["wizard_tower.crumbs_laid_out","count"],
 ["castle.unlocked_pathway_skip","boolean"],["castle.fairy_step","count"],
 ["dreadfarm.shania_stage","count"],["village_plaza.got_scammed","boolean"],
] as const;
const REGIONS=[
 {id:"wyld_woods",label:"Wyld Woods",paths:["wyld_woods"]},
 {id:"black_lagoon",label:"Black Lagoon",paths:["black_lagoon"]},
 {id:"west_village",label:"West Village",paths:["west_village"]},
 {id:"dreadfarm",label:"Dreadfarm",paths:["dreadfarm"]},
 {id:"village_plaza",label:"Village Plaza",paths:["village_plaza"]},
 {id:"wither_cage",label:"Wither Cage",paths:["wither_cage"]},
 {id:"castle",label:"Castle",paths:["castle"]},
 {id:"wizard_tower",label:"Wizard Tower",paths:["wizard_tower"]},
 {id:"gallery",label:"Rift Gallery",paths:["gallery"]},
 {id:"mountaintop",label:"Mountaintop",paths:["mountaintop"]},
] as const;
export function buildRiftProgress(member:RawMember){
 const rift=member.rift;
 const root=obj(rift);
 const gallery=obj(root.gallery),enigma=obj(root.enigma),access=obj(root.access);
 const rawTrophies=gallery.secured_trophies;
 const trophies=Array.isArray(rawTrophies)?rawTrophies.flatMap(value=>{
  const o=obj(value);
  return typeof o.type==="string"&&o.type.length>0
   ?[{type:o.type,timestamp:count(o.timestamp),visits:count(o.visits)}]:[];
 }):null;
 const uniqueTrophyTypes=trophies===null?null:[...new Set(trophies.map(x=>x.type))];
 const souls=keys(enigma.found_souls);
 const purchased=keys(root.lifetime_purchased_boundaries);
 const regionSignals=REGIONS.map(region=>({
  id:region.id,label:region.label,
  dataReported:region.paths.some(p=>Object.prototype.hasOwnProperty.call(root,p)),
  // Presence of a region-specific record is not proof of access or completion.
  accessConfirmed:false,
 }));
 const activities=ACTIVITIES.map(([path,kind])=>progress(root,path.split("."),kind));
 const riftInventory=obj(root.inventory);
 return {
  available:rift!==undefined&&rift!==null,
  gallery:{reported:root.gallery!==undefined,eliseStep:count(gallery.elise_step),
   securedTrophies:trophies,uniqueSecuredTypes:uniqueTrophyTypes,
   securedCount:uniqueTrophyTypes?.length??null,
   sentTrophyDialogues:keys(gallery.sent_trophy_dialogues)},
  enigma:{reported:root.enigma!==undefined,boughtCloak:flag(enigma.bought_cloak),
   soulsFound:souls,soulCount:souls?.length??null,
   claimedBonusIndex:count(enigma.claimed_bonus_index)},
  access:{reported:root.access!==undefined,consumedPrism:flag(access.consumed_prism),
   lastFree:count(access.last_free),chargeTrackTimestamp:count(access.charge_track_timestamp)},
  boundaries:{reported:root.lifetime_purchased_boundaries!==undefined,ids:purchased,count:purchased?.length??null},
  regions:regionSignals,activities,
  inventory:{reported:root.inventory!==undefined,
   availableSources:["inv_contents","inv_armor","equipment_contents","ender_chest_contents"]
    .filter(name=>typeof obj(riftInventory[name]).data==="string")},
  vampireSlayer:{reported:member.slayer?.slayer_bosses?.vampire!==undefined,
   xp:count(member.slayer?.slayer_bosses?.vampire?.xp)},
  // Audit which payload sections exist without assigning game meaning to unknown keys.
  unmodeledKeys:Object.keys(root).filter(k=>!new Set([
   "gallery","enigma","access","lifetime_purchased_boundaries","inventory",
   "slayer_quest",...REGIONS.map(region=>region.id),"dead_cats"
  ]).has(k)).sort(),
 };
}
