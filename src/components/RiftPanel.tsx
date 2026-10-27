"use client";

import {useState} from "react";
import type {NormalizedSkyBlockProfile} from "@/schemas/normalized-profile";

type Rift=NormalizedSkyBlockProfile["riftProgress"];
type Section="timecharms"|"souls"|"regions"|"equipment"|"time"|"activities";
const tabs:{id:Section;label:string;subtitle:string}[]=[
 {id:"timecharms",label:"Timecharms",subtitle:"Gallery progress"},
 {id:"souls",label:"Enigma Souls",subtitle:"Collection evidence"},
 {id:"regions",label:"Region Unlocks",subtitle:"Verified requirements"},
 {id:"equipment",label:"Equipment",subtitle:"Items and acquisition"},
 {id:"time",label:"Rift Time",subtitle:"Known contributions"},
 {id:"activities",label:"Activities",subtitle:"API activity records"},
];
const n=(v:number|null)=>v===null?"Unknown":v.toLocaleString("en-US");
const readable=(value:string)=>value.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
const status=(value:string)=>value==="SECURED"||value==="MET"?"crimson-status crimson-status--good":value==="MISSING"||value==="UNMET"?"crimson-status crimson-status--warn":"crimson-status";
function Heading({eyebrow,title,note}:{eyebrow:string;title:string;note:string}){
 return <div className="profile-section-heading"><div><p className="section-kicker">{eyebrow}</p><h2>{title}</h2><p className="crimson-muted">{note}</p></div></div>;
}
const area=(id:string)=>({"wyld_woods":"Wyld Woods","black_lagoon":"Black Lagoon","west_village":"West Village","dreadfarm":"Dreadfarm","village_plaza":"Village Plaza","living_cave":"Living Cave","colosseum":"Colosseum","stillgore_chateau":"Stillgore Château","mountaintop":"Mountaintop"} as Record<string,string>)[id]??readable(id);
const material=(id:string)=>id==="MOTES"?"Motes":readable(id);
function Charms({progress}:{progress:Rift}){
 const secured=progress.unlocks.timecharms.filter(c=>c.status==="SECURED");
 const remaining=progress.unlocks.timecharms.filter(c=>c.status!=="SECURED");
 return <div className="crimson-section"><Heading eyebrow="Gallery" title="Timecharms" note="Track the Timecharms you've secured and find the ones still missing."/>
 {([{title:"Still to collect",items:remaining},{title:"Secured",items:secured}]).map(group=><div key={group.title} className="rift-group"><h3 className="rift-group-title">{group.title} <span>{group.items.length}</span></h3><div className="crimson-two-grid">{group.items.map(charm=><article className="crimson-card" key={charm.id}><div className="crimson-card-top"><h3>{charm.name}</h3><span className={status(charm.status)}>{charm.status==="SECURED"?"Secured":charm.status==="MISSING"?"Not secured":"Unknown"}</span></div><p className="crimson-muted">{area(charm.region)}</p><p>{charm.how}</p></article>)}</div></div>)}
 </div>;
}
function Souls({progress}:{progress:Rift}){
 const e=progress.unlocks.enigma;const [show,setShow]=useState(false);
 const areas=[...new Set(e.catalogue.map(s=>s.region))];
 return <div className="crimson-section"><Heading eyebrow="Exploration" title="Enigma Souls" note="Your collected total is tracked, but individual collected locations cannot be identified yet."/>
 <div className="crimson-metric-row"><article><span>Collected</span><strong>{n(e.foundCount)}</strong></article><article><span>Remaining</span><strong>{n(e.remainingCount)}</strong></article><article><span>Known locations</span><strong>{e.catalogue.length}</strong></article></div>
 <p className="crimson-muted">The location guide is for finding souls, not a checklist of which ones you already collected.</p>
 <button type="button" className="rift-toggle" aria-expanded={show} onClick={()=>setShow(!show)}>{show?"Hide location guide":"Browse soul locations"}</button>
 {show?areas.map(region=><div key={region} className="rift-group"><h3 className="rift-group-title">{area(region)}</h3><div className="crimson-two-grid">{e.catalogue.filter(s=>s.region===region).map(soul=><article key={soul.key} className="crimson-card"><h3>{soul.name}</h3></article>)}</div></div>):null}
 </div>;
}
function Regions({progress}:{progress:Rift}){
 return <div className="crimson-section"><Heading eyebrow="Exploration gates" title="Rift Regions" note="Known requirements for reaching each area. Entrance availability may depend on additional conditions."/>
 <div className="crimson-two-grid">{progress.unlocks.regions.map(region=><article key={region.id} className="crimson-card">
 <div className="crimson-card-top"><h3>{region.name}</h3><span className={status(region.status)}>{region.status==="MET"?"Known gates met":region.status==="UNMET"?"Known gate unmet":"Unknown"}</span></div>
 <p className="crimson-muted">{region.note}</p>
 {region.requiredTimecharms.length?<p><strong>Required Timecharms:</strong> {region.requiredTimecharms.map(readable).join(", ")}</p>:null}
 {region.timeRequirementSeconds!==null?<p><strong>Entrance Rift Time:</strong> {region.timeRequirementSeconds}s remaining</p>:null}
 {region.additionalRequirements.map((req,i)=><p key={i} className="crimson-muted">{req}</p>)}
 
 </article>)}</div></div>;
}
function Equipment({progress}:{progress:Rift}){
 const eq=progress.equipment;const [showStored,setShowStored]=useState(false);
 const items=eq.items.filter(i=>i.equipped||showStored);
 const groups=[{title:"Upgrades to obtain",items:eq.costs.filter(c=>!c.owned)},{title:"Already owned",items:eq.costs.filter(c=>c.owned)}];
 return <div className="crimson-section"><Heading eyebrow="Rift loadout" title="Equipment & Upgrades" note="See your gear and what you need for the next upgrades."/>
 <div className="crimson-card"><div className="crimson-card-top"><h3>Rift gear</h3><button type="button" className="rift-toggle" onClick={()=>setShowStored(!showStored)}>{showStored?"Hide stored gear":"Show stored gear"}</button></div>
 {items.length?<div className="crimson-two-grid">{items.map((item,i)=><article className="crimson-card" key={item.source+":"+item.slotIndex+":"+i}><div className="crimson-card-top"><h3>{item.name}</h3><span className={status(item.equipped?"MET":"UNKNOWN")}>{item.equipped?"Equipped":"Stored"}</span></div><p className="crimson-muted">{item.rarity?readable(item.rarity):"Rarity unknown"}</p></article>)}</div>:<p className="crimson-muted">No equipped gear found in the available Rift inventory data.</p>}</div>
 {groups.map(group=><div key={group.title} className="rift-group"><h3 className="rift-group-title">{group.title} <span>{group.items.length}</span></h3><div className="crimson-two-grid">{group.items.map(cost=><article className="crimson-card" key={cost.id}><div className="crimson-card-top"><h3>{cost.name}</h3><span className={status(cost.owned?"MET":"UNKNOWN")}>{cost.owned?"Owned":"Not observed"}</span></div><p className="crimson-muted">{cost.prerequisite}</p><p>{cost.materials.length?cost.materials.map(m=>m.quantity.toLocaleString("en-US")+" "+material(m.currency)).join(" · "):"Claim or reward — no purchase materials"}</p></article>)}</div></div>)}
 </div>;
}
function Time({progress}:{progress:Rift}){
 const t=progress.equipment.time;
 return <div className="crimson-section"><Heading eyebrow="Duration" title="Rift Time" note="The known equipped subtotal is not the player's full available Rift Time."/>
 <div className="crimson-metric-row"><article><span>Base time</span><strong>{t.baseSeconds}s</strong></article><article><span>Known equipped bonuses</span><strong>{t.knownEquippedSubtotalSeconds===null?"Unknown":t.knownEquippedSubtotalSeconds+"s"}</strong></article><article><span>Complete Rift Time</span><strong>{n(t.totalRiftTimeSeconds)}</strong></article></div>
 <p className="crimson-notice">{t.reason}. Percentage effects and temporary buffs are not added to the subtotal.</p>
 <div className="crimson-two-grid">{t.contributions.filter(c=>c.equipped).map(c=><article className="crimson-card" key={c.id}><div className="crimson-card-top"><h3>{c.name}</h3><strong>{c.seconds===null?"Unknown": "+"+c.seconds+"s"}</strong></div><p className="crimson-muted">{c.rule}</p></article>)}</div>
 </div>;
}
const activityNames:Record<string,string>={
 "wyld_woods.sirius_q_a_chain_done":"Sirius's Questions Finished",
 "wyld_woods.sirius_completed_q_a":"Sirius's Q&A",
 "wyld_woods.sirius_claimed_doubloon":"Sirius's Doubloon",
 "wyld_woods.talked_threebrothers":"Three Brothers",
 "wyld_woods.bughunter_step":"Bughunter Progress",
 "black_lagoon.talked_to_edwin":"Talked to Edwin",
 "black_lagoon.received_science_paper":"Science Paper Received",
 "black_lagoon.delivered_science_paper":"Science Paper Delivered",
 "black_lagoon.completed_step":"Black Lagoon Progress",
 "west_village.crazy_kloon.quest_complete":"Crazy Kloon Quest",
 "west_village.crazy_kloon.hacked_terminals":"Crazy Kloon Terminals",
 "west_village.mirrorverse.visited_rooms":"Mirrorverse Rooms Visited",
 "west_village.mirrorverse.claimed_chest_items":"Mirrorverse Chests",
 "west_village.mirrorverse.claimed_reward":"Mirrorverse Reward"
};
const activityName=(id:string)=>activityNames[id]??readable(id.split(".").at(-1)??id);
function Activities({progress}:{progress:Rift}){
 const [showOther,setShowOther]=useState(false);
 const reported=progress.activities.filter(a=>a.reported),other=progress.activities.filter(a=>!a.reported);
 return <div className="crimson-section"><Heading eyebrow="Exploration" title="Rift Activities" note="Recorded activity and exploration history, grouped by whether information is available."/>
 <div className="crimson-metric-row"><article><span>Activities recorded</span><strong>{reported.length}</strong></article><article><span>Vampire Slayer XP</span><strong>{n(progress.vampireSlayer.xp)}</strong></article><article><span>Purchased boundaries</span><strong>{n(progress.boundaries.count)}</strong></article></div>
 <h3 className="rift-group-title">Recorded activities <span>{reported.length}</span></h3><div className="crimson-two-grid">{reported.map(entry=><article key={entry.id} className="crimson-card"><div className="crimson-card-top"><h3>{activityName(entry.id)}</h3><span className={status("MET")}>Recorded</span></div><p className="crimson-muted">{area(entry.id.split(".")[0])}</p>{entry.count!==null?<p>{entry.count.toLocaleString("en-US")} recorded</p>:null}</article>)}</div>
 {other.length?<><button type="button" className="rift-toggle" aria-expanded={showOther} onClick={()=>setShowOther(!showOther)}>{showOther?"Hide unavailable activity records":`Show ${other.length} activities without records`}</button>{showOther?<div className="crimson-two-grid">{other.map(entry=><article key={entry.id} className="crimson-card"><h3>{activityName(entry.id)}</h3><p className="crimson-muted">{area(entry.id.split(".")[0])} · Progress unavailable</p></article>)}</div>:null}</>:null}
 </div>;
}
export function RiftPanel({progress}:{progress:Rift}){
 const [section,setSection]=useState<Section>("timecharms");
 return <section className="crimson-page" aria-label="Rift progression">
 <header className="crimson-hero"><div><p className="section-kicker">Otherworld progression</p><h2>The Rift</h2><p>Timecharms, Enigma Souls, region gates, equipment, and Rift Time—based on verifiable profile evidence.</p></div></header>
 {!progress.available?<p className="crimson-notice">Rift member data is unavailable. Reference information may still be shown, but completion cannot be confirmed.</p>:null}
 <div className="crimson-metric-row crimson-top-metrics"><article><span>Timecharms secured</span><strong>{n(progress.unlocks.recognizedSecuredCount)} / {progress.unlocks.reference.timecharms}</strong></article><article><span>Enigma Souls found</span><strong>{n(progress.enigma.soulCount)} / {progress.unlocks.reference.enigmaSouls}</strong></article><article><span>Rift inventory</span><strong>{progress.inventory.reported?"Reported":"Unknown"}</strong></article><article><span>Vampire Slayer XP</span><strong>{n(progress.vampireSlayer.xp)}</strong></article></div>
 <div className="crimson-layout"><nav className="crimson-subnav" aria-label="Rift sections">{tabs.map(tab=><button key={tab.id} type="button" className={"crimson-nav-item "+(section===tab.id?"selected":"")} aria-current={section===tab.id?"page":undefined} onClick={()=>setSection(tab.id)}><strong>{tab.label}</strong><span>{tab.subtitle}</span></button>)}</nav>
 <div className="crimson-main" key={section}><p className="crimson-mobile-subtitle">{tabs.find(t=>t.id===section)?.subtitle}</p>
 {section==="timecharms"?<Charms progress={progress}/>:section==="souls"?<Souls progress={progress}/>:section==="regions"?<Regions progress={progress}/>:section==="equipment"?<Equipment progress={progress}/>:section==="time"?<Time progress={progress}/>:<Activities progress={progress}/>}
 </div></div></section>;
}
