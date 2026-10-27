"use client";

import {useMemo,useState} from "react";
import type {NormalizedSkyBlockProfile} from "@/schemas/normalized-profile";

type Profile=NormalizedSkyBlockProfile;
type RecordEntry={id:string;value:number};
const fmt=(n:number)=>n.toLocaleString("en-US");
const display=(id:string)=>id.replace(/^(kills_|deaths_)/,"").replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
const records=(map:Record<string,number>):RecordEntry[]=>Object.entries(map).filter(([,value])=>Number.isFinite(value)&&value>0).map(([id,value])=>({id,value})).sort((a,b)=>b.value-a.value);
const sum=(arr:RecordEntry[])=>arr.reduce((total,r)=>total+r.value,0);
function Tile({label,value,detail}:{label:string;value:string;detail:string}){
 return <article className="crimson-card misc-tile"><span className="crimson-muted">{label}</span><strong>{value}</strong><p className="crimson-muted">{detail}</p></article>;
}
function Ranked({title,entries,empty}:{title:string;entries:RecordEntry[];empty:string}){
 const [expanded,setExpanded]=useState(false);
 const shown=expanded?entries:entries.slice(0,6);
 return <section className="crimson-card misc-ranked"><div className="crimson-card-top"><h3>{title}</h3><span className="crimson-muted">{entries.length} recorded types</span></div>
 {shown.length?<ol className="misc-ranked-list">{shown.map((entry,i)=><li key={entry.id}><span className="misc-rank">{i+1}</span><span>{display(entry.id)}</span><strong>{fmt(entry.value)}</strong></li>)}</ol>:<p className="crimson-muted">{empty}</p>}
 {entries.length>6?<button className="rift-toggle" type="button" onClick={()=>setExpanded(!expanded)} aria-expanded={expanded}>{expanded?"Show top six":`Show all ${entries.length}`}</button>:null}</section>;
}
export function MiscPanel({profile}:{profile:Profile}){
 const stats=profile.playerStats;
 const kills=useMemo(()=>records(stats.kills),[stats.kills]);
 const deaths=useMemo(()=>records(stats.deaths),[stats.deaths]);
 const fished=useMemo(()=>records(stats.itemsFished),[stats.itemsFished]);
 const totalKills=kills.length?fmt(sum(kills)):"—";
 const totalDeaths=deaths.length?fmt(sum(deaths)):"—";
 const firstSeen=profile.profileCreatedAt===null?"Unavailable":new Date(profile.profileCreatedAt).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
 const valuation=profile.miscValuation;
 const topKill=kills[0],topDeath=deaths[0];
 return <section className="crimson-page misc-page" aria-label="Miscellaneous profile highlights">
 <header className="crimson-hero"><div><p className="section-kicker">Your SkyBlock story</p><h2>Miscellaneous</h2><p>Personal records, surprising statistics, and memorable details from your profile.</p></div></header>
 <div className="crimson-metric-row crimson-top-metrics">
 <Tile label="Recorded mob kills" value={totalKills} detail="Sum of reported kill categories"/>
 <Tile label="Recorded deaths" value={totalDeaths} detail="Sum of reported death categories"/>
 <Tile label="Highest recorded hit" value={stats.highestDamage===null?"—":fmt(stats.highestDamage)} detail="Damage record"/>
 <Tile label="Highest critical hit" value={stats.highestCriticalDamage===null?"—":fmt(stats.highestCriticalDamage)} detail="Critical damage record"/>
 </div>
 <div className="profile-section-heading"><div><p className="section-kicker">Personal records</p><h2>Claim to Fame</h2></div></div>
 <div className="crimson-two-grid">
 <Tile label="Most defeated mob" value={topKill?display(topKill.id):"Unavailable"} detail={topKill?`${fmt(topKill.value)} kills recorded`:"No kill counts reported"}/>
 <Tile label="Most common cause of death" value={topDeath?display(topDeath.id):"Unavailable"} detail={topDeath?`${fmt(topDeath.value)} deaths recorded`:"No death breakdown reported"}/>
 <Tile label="Sea creatures defeated" value={stats.seaCreatureKills===null?"—":fmt(stats.seaCreatureKills)} detail="Recorded fishing encounters"/>
 <Tile label="Profile created" value={firstSeen} detail="Beginning of this SkyBlock profile"/>
 </div>
 <div className="profile-section-heading"><div><p className="section-kicker">The numbers</p><h2>Statistical Oddities</h2></div></div>
 <div className="crimson-two-grid">
 <Ranked title="Most defeated mobs" entries={kills} empty="No mob kill breakdown available."/>
 <Ranked title="What killed you most" entries={deaths} empty="No death breakdown available."/>
 <Ranked title="Fishing discoveries" entries={fished} empty="No item fishing counts available."/>
 <section className="crimson-card"><h3>Highest estimated base-value items</h3>
 <p className="crimson-muted">Ranked by available market prices for each item's base ID, including items in the Ender Chest, backpacks, accessory bag, wardrobe and vault.</p>
 {valuation.items.length?<div className="misc-item-list">{valuation.items.slice(0,10).map((item,i)=><div key={item.source+":"+item.id+":"+i}><strong>{i+1}. {item.name}</strong><span className="crimson-muted">{fmt(item.baseStackValue)} coins{item.quantity>1?` · ×${item.quantity}`:""}{item.modified?" · Upgrades not priced":""}</span></div>)}</div>:<p className="crimson-muted">No usable market quotes for the currently available inventory items.</p>}
 <p className="crimson-muted">Price coverage: {valuation.pricedCount} valued · {valuation.unpricedCount} without a price. {valuation.snapshotAt?"Snapshot: "+new Date(valuation.snapshotAt).toLocaleDateString("en-US"):"No market snapshot available."}</p>
 <p className="crimson-muted">{valuation.limitation}</p></section>
 </div>
 </section>;
}
