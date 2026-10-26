import catalogue from "../reference/rift-progression.json";

export type GateStatus="MET"|"UNMET"|"UNKNOWN";
const normalize=(v:string)=>v.trim().toLowerCase().replace(/^rift_trophy_/,"");
const canonical=(raw:string)=> {
 const id=normalize(raw);
 return catalogue.timecharms.find(entry=>entry.aliases.some(alias=>normalize(alias)===id))?.id??null;
};
export function buildRiftUnlocks(
 securedTrophyTypes:readonly string[]|null,
 foundSoulIds:readonly string[]|null,
 boundaryIds:readonly string[]|null,
){
 const recognized=new Set((securedTrophyTypes??[]).map(canonical).filter((id):id is string=>id!==null));
 const unrecognized=securedTrophyTypes===null?[]:[...new Set(securedTrophyTypes.filter(id=>canonical(id)===null))];
 const galleryReported=securedTrophyTypes!==null;
 const timecharms=catalogue.timecharms.map(charm=>({
  id:charm.id,name:charm.name,region:charm.region,how:charm.how,itemId:charm.itemId,
  status:galleryReported?(recognized.has(charm.id)?"SECURED" as const:"MISSING" as const):"UNKNOWN" as const,
 }));
 const regions=catalogue.regions.map(region=>{
  const charmGates=region.requiredTimecharms.map(id=>({
   id,fulfilled:galleryReported?recognized.has(id):null,
  }));
  const missing=charmGates.filter(g=>g.fulfilled===false).map(g=>g.id);
  const status:GateStatus=missing.length?"UNMET":charmGates.some(g=>g.fulfilled===null)?"UNKNOWN":"MET";
  // Time requirement refers to Rift Time REMAINING at the entrance.
  // Unknown inventory/route gates and current Rift Time cannot be auto-verified.
  return {id:region.id,name:region.name,note:region.note,
   requiredTimecharms:[...region.requiredTimecharms],
   timeRequirementSeconds:region.timeRequirementSeconds,
   additionalRequirements:[...region.additionalRequirements],
   charmGates,status,
   eligibilityConfirmed:status==="MET"&&region.timeRequirementSeconds===null&&region.additionalRequirements.length===0,
   availableNow:null as boolean|null};
 });
 const souls=catalogue.souls.map(soul=>({
  key:soul.key,name:soul.name,region:soul.region,
  // The Wiki contains names/coordinates; its names are not API found_souls IDs.
  status:"UNKNOWN" as const,
 }));
 const soulTotal=catalogue.souls.length;
 const foundCount=foundSoulIds?.length??null;
 const boundaries=boundaryIds===null?null:new Set(boundaryIds);
 return {
  reference:{timecharms:catalogue.timecharms.length,enigmaSouls:soulTotal,
   soulApiIdsMapped:false,sourceChecked:catalogue.source.checked},
  timecharms,recognizedSecuredCount:galleryReported?recognized.size:null,
  unknownGalleryTypes:unrecognized,
  regions,
  enigma:{catalogue:souls,foundCount,remainingCount:foundCount===null||foundCount>soulTotal?null:soulTotal-foundCount,
   collectedApiIds:foundSoulIds===null?null:[...foundSoulIds],
   locationsIndividuallyMatched:false},
  boundaries:{reported:boundaries!==null,reportedIds:boundaries?[...boundaries]:null},
 };
}
