"use client";

import {useMemo,useState} from "react";
import type {SlayerTabProgress} from "@/server/slayer/tab-progress";
type Family=SlayerTabProgress["families"][number];
const number=(value:number|null)=>value===null?"—":value.toLocaleString("en-US");
const roman=["","I","II","III","IV","V","VI","VII","VIII","IX"];
const human=(id:string)=>id.replaceAll("_"," ").replace(/;\d+$/,"").replace(/\b\w/g,c=>c.toUpperCase());
function Meter({value}:{value:number|null}){
 return <div className="slayer-track" role="progressbar" aria-label="Slayer level progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((value??0)*100)}>
 <span style={{width:Math.round((value??0)*100)+"%"}}/></div>;
}
function FamilyDetail({family}:{family:Family}){
 const [section,setSection]=useState<"levels"|"drops"|"rng">("levels");
 const [filter,setFilter]=useState("");
 const [tier,setTier]=useState(0);
 const [onlyAvailable,setOnlyAvailable]=useState(false);
 const drops=useMemo(()=>family.drops.filter(drop=>{
  const conditions=drop.conditions.filter(c=>(tier===0||c.bossTier===tier)&&(!onlyAvailable||c.levelMet===true));
  return conditions.length>0&&drop.name.toLowerCase().includes(filter.toLowerCase());
 }),[family.drops,filter,tier,onlyAvailable]);
 const scores=useMemo(()=>family.rng.filter(r=>human(r.neuId).toLowerCase().includes(filter.toLowerCase())),[family.rng,filter]);
 return <div className="slayer-detail">
   <div className="slayer-detail-heading"><div><p className="section-kicker">Selected Slayer</p><h3>{family.boss}</h3><p className="slayer-muted">{family.name} Slayer · Level {family.level===null?"unknown":roman[family.level]??family.level} / {roman[family.maxLevel]??family.maxLevel}</p></div></div>
   <div className="slayer-overview-grid"><article className="slayer-surface"><span>Slayer XP</span><strong>{number(family.xp)}</strong><Meter value={family.progress}/><small>{family.xpRemaining===null?(family.level===family.maxLevel?"Maximum level reached":"XP progress unavailable"):number(family.xpRemaining)+" XP to level "+roman[family.nextLevel!]}</small></article>
   <article className="slayer-surface"><span>Bosses defeated</span><strong>{number(family.totalKills)}</strong><small>Recorded total across tiers</small></article>
   <article className="slayer-surface"><span>Level rewards</span><strong>{family.level===null?"—":family.level+" / "+family.maxLevel}</strong><small>Level attained, not proof of claimed rewards</small></article></div>
   <div className="slayer-kill-panel"><h4>Boss kills by tier</h4><div className="slayer-tier-counters">{family.kills.map(entry=><div key={entry.tier}><span>Tier {roman[entry.tier]}</span><strong>{number(entry.count)}</strong></div>)}</div></div>
   <div className="slayer-inner-nav" role="tablist" aria-label="Slayer details">
    {(["levels","drops","rng"] as const).map(key=><button type="button" role="tab" aria-selected={section===key} className={section===key?"selected":""} key={key} onClick={()=>{setSection(key);setFilter("");setTier(0);setOnlyAvailable(false)}}>{key==="levels"?"Level Rewards":key==="drops"?"Boss Drops":"RNG Rewards"}</button>)}
   </div>
   {section==="levels"?<div className="slayer-level-grid">{family.levels.map(entry=><article className={"slayer-level-card "+(entry.status==="REACHED"?"reached":"")} key={entry.level}>
    <div className="slayer-level-head"><h4>Level {roman[entry.level]}</h4><span className={"slayer-pill "+(entry.status==="REACHED"?"good":"")}>{entry.status==="REACHED"?"Reached":entry.status==="UPCOMING"?"Upcoming":"Unknown"}</span></div>
    <p className="slayer-muted">{number(entry.threshold)} cumulative Slayer XP</p>
    {entry.unlocks.length?<div className="slayer-reward-items">{entry.unlocks.map((name,i)=><span key={name+i}>{name}</span>)}</div>:<p className="slayer-muted">No item unlock listed</p>}
    {entry.grants.length?<p className="slayer-muted">Additional rewards: {entry.grants.join(", ")}</p>:null}
   </article>)}</div>:null}
   {section==="drops"?<><div className="slayer-toolbar"><input aria-label="Search boss drops" placeholder="Search drops…" value={filter} onChange={e=>setFilter(e.target.value)}/>
    <select aria-label="Filter boss tier" value={tier} onChange={e=>setTier(Number(e.target.value))}><option value={0}>All boss tiers</option>{family.kills.map(k=><option value={k.tier} key={k.tier}>Tier {roman[k.tier]}</option>)}</select>
    <label><input type="checkbox" checked={onlyAvailable} onChange={e=>setOnlyAvailable(e.target.checked)}/> Level requirement met</label></div>
    <p className="slayer-muted">Eligibility depends on both boss tier and Slayer level. Drops are not proof of ownership, drop chance, or fight readiness.</p>
    <div className="slayer-drop-grid">{drops.map(drop=><article className="slayer-drop-card" key={drop.name}><h4>{drop.name}</h4><div className="slayer-drop-conditions">{drop.conditions.filter(c=>tier===0||c.bossTier===tier).map((c,i)=><span key={i} className={"slayer-pill "+(c.levelMet?"good":"")}>T{roman[c.bossTier]} · Lv {roman[c.slayerLevel]??c.slayerLevel} {c.levelMet===null?"· ?":c.levelMet?"· Eligible":"· Locked"}</span>)}</div></article>)}</div>
    {!drops.length?<p className="slayer-muted">No drops match the selected filters.</p>:null}</>:null}
   {section==="rng"?<><div className="slayer-toolbar"><input aria-label="Search RNG options" placeholder="Search RNG options…" value={filter} onChange={e=>setFilter(e.target.value)}/></div>
    <p className="slayer-muted">NEU reference scores only. Your selected RNG drop, stored meter XP and guarantee progress are not available from the verified profile data.</p>
    <div className="slayer-rng-grid">{scores.map(option=><div className="slayer-rng-card" key={option.neuId}><strong>{human(option.neuId)}</strong><span>{number(option.meterScore)} meter score</span></div>)}</div>
   </>:null}
  </div>;
}
export function SlayerPanel({progress}:{progress:SlayerTabProgress}){
 const [selected,setSelected]=useState<string>("zombie");
 const active=progress.families.find(f=>f.id===selected)??progress.families[0];
 return <section className="profile-slayer-page" aria-label="Slayer">
 <header className="profile-page-heading"><div><p className="section-kicker">Boss progression</p><h2>Slayer</h2><p>Explore Slayer levels, kill records, boss drops and RNG reward options.</p></div></header>
 <div className="slayer-summary">
  <article><span>Combined Slayer levels</span><strong>{number(progress.summary.combinedLevels)}</strong><small>{progress.summary.xpKnownFamilies} of 6 XP records available</small></article>
  <article><span>Total Slayer XP</span><strong>{number(progress.summary.totalXp)}</strong><small>Only totaled when all families report XP</small></article>
  <article><span>Bosses defeated</span><strong>{number(progress.summary.totalKills)}</strong><small>Recorded kill counts</small></article>
 </div>
 <div className="slayer-family-grid">{progress.families.map(f=><button key={f.id} type="button" className={"slayer-family-card "+(f.id===active.id?"selected":"")} onClick={()=>setSelected(f.id)}>
  <span>{f.name} Slayer</span><strong>{f.level===null?"Unknown":roman[f.level]??f.level}</strong><small>{f.boss}</small><div className="slayer-family-bottom"><span>{number(f.xp)} XP</span><span>{number(f.totalKills)} kills</span></div>
 </button>)}</div>
 <FamilyDetail key={active.id} family={active}/>
 <p className="slayer-reference-note">Level unlock reference: September 2026 · Boss drop conditions and NEU RNG option references checked October 2026. Slayer quests and personal RNG Meter status are not inferred.</p>
 </section>;
}
