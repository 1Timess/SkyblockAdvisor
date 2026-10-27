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
function Charms({progress}:{progress:Rift}){
 return <div className="crimson-section"><Heading eyebrow="Gallery" title="Timecharms" note="Secured means the Gallery API records the trophy, not merely that an item was seen."/>
 <div className="crimson-two-grid">{progress.unlocks.timecharms.map(charm=><article className="crimson-card" key={charm.id}>
 <div className="crimson-card-top"><h3>{charm.name}</h3><span className={status(charm.status)}>{charm.status==="MISSING"?"Not secured":readable(charm.status)}</span></div>
 <p className="crimson-muted">{charm.region}</p><p>{charm.how}</p>
 </article>)}</div>
 {progress.unlocks.unknownGalleryTypes.length>0?<p className="crimson-notice">Unrecognized Gallery trophy identifiers: {progress.unlocks.unknownGalleryTypes.join(", ")}</p>:null}</div>;
}
function Souls({progress}:{progress:Rift}){
 const e=progress.unlocks.enigma;
 return <div className="crimson-section"><Heading eyebrow="Exploration" title="Enigma Souls" note="Total counts come from the API. Individual wiki locations cannot yet be mapped to collected API identifiers."/>
 <div className="crimson-metric-row"><article><span>Collected</span><strong>{n(e.foundCount)}</strong></article><article><span>Remaining in reference</span><strong>{n(e.remainingCount)}</strong></article><article><span>Reference locations</span><strong>{e.catalogue.length}</strong></article></div>
 <p className="crimson-notice">Individual soul completion is not verified; location rows below are reference-only.</p>
 <div className="crimson-two-grid">{e.catalogue.map(soul=><article key={soul.key} className="crimson-card"><div className="crimson-card-top"><h3>{soul.name}</h3><span className={status("UNKNOWN")}>Unknown</span></div><p className="crimson-muted">{soul.region}</p></article>)}</div></div>;
}
function Regions({progress}:{progress:Rift}){
 return <div className="crimson-section"><Heading eyebrow="Exploration gates" title="Rift Regions" note="A satisfied Timecharm gate does not prove access. Other entrance conditions and current Rift Time may be unknown."/>
 <div className="crimson-two-grid">{progress.unlocks.regions.map(region=><article key={region.id} className="crimson-card">
 <div className="crimson-card-top"><h3>{region.name}</h3><span className={status(region.status)}>{region.status==="MET"?"Known gates met":region.status==="UNMET"?"Known gate unmet":"Unknown"}</span></div>
 <p className="crimson-muted">{region.note}</p>
 {region.requiredTimecharms.length?<p><strong>Required Timecharms:</strong> {region.requiredTimecharms.map(readable).join(", ")}</p>:null}
 {region.timeRequirementSeconds!==null?<p><strong>Entrance Rift Time:</strong> {region.timeRequirementSeconds}s remaining</p>:null}
 {region.additionalRequirements.map((req,i)=><p key={i} className="crimson-muted">{req}</p>)}
 <small>Accessible now: {region.availableNow===null?"Not verified":region.availableNow?"Yes":"No"}</small>
 </article>)}</div></div>;
}
function Equipment({progress}:{progress:Rift}){
 const eq=progress.equipment;
 return <div className="crimson-section"><Heading eyebrow="Rift loadout" title="Equipment & Acquisition" note="Observed inventory, not inferred ownership. Recipes preserve Motes and materials rather than substituting coin prices."/>
 <div className="crimson-metric-row"><article><span>Observed items</span><strong>{eq.observedItemCount}</strong></article><article><span>Available inventory sources</span><strong>{eq.sources.filter(s=>s.reported).length} / {eq.sources.length}</strong></article></div>
 <div className="crimson-card"><h3>Equipped and stored Rift items</h3>
 {eq.items.length?<div className="crimson-two-grid">{eq.items.map((item,i)=><div className="crimson-card" key={item.source+":"+item.slotIndex+":"+i}><div className="crimson-card-top"><h3>{item.name}</h3><span className={status(item.equipped?"MET":"UNKNOWN")}>{item.equipped?"Equipped":"Stored"}</span></div><p className="crimson-muted">{readable(item.source.replace("rift:",""))} · {item.rarity??"Rarity unknown"}</p></div>)}</div>:<p className="crimson-muted">No Rift items decoded from the available sources. This does not prove the player owns none.</p>}</div>
 <div className="crimson-two-grid">{eq.costs.map(cost=><article className="crimson-card" key={cost.id}><div className="crimson-card-top"><h3>{cost.name}</h3><span className={status(cost.owned?"MET":"UNKNOWN")}>{cost.owned?"Observed owned":"Not observed"}</span></div><p className="crimson-muted">{cost.prerequisite}</p><p>{cost.materials.length?cost.materials.map(m=>m.quantity.toLocaleString("en-US")+" "+readable(m.currency)).join(" · "):"Reward or claim; no purchase ingredients listed"}</p><small>Cost evidence: {cost.costStatus}</small></article>)}</div>
 {eq.unpricedUpgrades.map(x=><p className="crimson-notice" key={x.id}>{x.name}: {x.reason}</p>)}</div>;
}
function Time({progress}:{progress:Rift}){
 const t=progress.equipment.time;
 return <div className="crimson-section"><Heading eyebrow="Duration" title="Rift Time" note="The known equipped subtotal is not the player's full available Rift Time."/>
 <div className="crimson-metric-row"><article><span>Base time</span><strong>{t.baseSeconds}s</strong></article><article><span>Known equipped bonuses</span><strong>{t.knownEquippedSubtotalSeconds===null?"Unknown":t.knownEquippedSubtotalSeconds+"s"}</strong></article><article><span>Complete Rift Time</span><strong>{n(t.totalRiftTimeSeconds)}</strong></article></div>
 <p className="crimson-notice">{t.reason}. Percentage effects and temporary buffs are not added to the subtotal.</p>
 <div className="crimson-two-grid">{t.contributions.filter(c=>c.equipped).map(c=><article className="crimson-card" key={c.id}><div className="crimson-card-top"><h3>{c.name}</h3><strong>{c.seconds===null?"Unknown": "+"+c.seconds+"s"}</strong></div><p className="crimson-muted">{c.rule}</p></article>)}</div>
 </div>;
}
function Activities({progress}:{progress:Rift}){
 return <div className="crimson-section"><Heading eyebrow="Profile evidence" title="Rift Activities" note="Reported activity data is not by itself proof that a region or quest has been unlocked."/>
 <div className="crimson-metric-row"><article><span>Rift access record</span><strong>{progress.access.reported?"Present":"Unknown"}</strong></article><article><span>Vampire Slayer XP</span><strong>{n(progress.vampireSlayer.xp)}</strong></article><article><span>Purchased boundaries</span><strong>{n(progress.boundaries.count)}</strong></article></div>
 <div className="crimson-two-grid">{progress.activities.map(a=><article className="crimson-card" key={a.id}><div className="crimson-card-top"><h3>{readable(a.id)}</h3><span className={status(a.reported?"MET":"UNKNOWN")}>{a.reported?"Reported":"Unknown"}</span></div>{a.count!==null?<p>{a.count.toLocaleString("en-US")} recorded</p>:null}{a.entries?.length?<p className="crimson-muted">{a.entries.slice(0,6).join(", ")}{a.entries.length>6?" …":""}</p>:null}</article>)}</div>
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
