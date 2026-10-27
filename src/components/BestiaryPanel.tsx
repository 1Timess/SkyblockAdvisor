"use client";

import Image from "next/image";

import { useMemo, useState } from "react";
import type { NormalizedSkyBlockProfile } from "@/schemas/normalized-profile";

type Progress=NormalizedSkyBlockProfile["bestiary"]["progression"];
type Family=Progress["categories"][number]["families"][number];
const fmt=(n:number)=>n.toLocaleString("en-US");
const pct=(n:number)=>Math.min(100,Math.max(0,n*100));
const familyKey=(category:string,f:Family)=>category+":"+f.keys.join("|");

export function BestiaryPanel({progress}:{progress:Progress}){
 const [category,setCategory]=useState("all");
 const [search,setSearch]=useState("");
 const [filter,setFilter]=useState<"all"|"discovered"|"missing"|"maxed"|"near">("all");
 const [selected,setSelected]=useState<string|null>(null);
 const all=useMemo(()=>progress.categories.flatMap(c=>c.families.map(f=>({...f,categoryId:c.id,categoryName:c.name,group:c.group,key:familyKey(c.id,f)}))),[progress.categories]);
 const visible=useMemo(()=>all.filter(f=>(category==="all"||f.categoryId===category)&&
  (f.name.toLowerCase().includes(search.trim().toLowerCase())||f.categoryName.toLowerCase().includes(search.trim().toLowerCase()))&&
  (filter==="all"||filter==="discovered"&&f.kills>0||filter==="missing"&&f.kills===0||
  filter==="maxed"&&f.tier===f.maxTier||filter==="near"&&f.nextThreshold!==null))
  .sort((a,b)=>filter==="near"?(a.remaining-b.remaining||a.name.localeCompare(b.name)):(a.name.localeCompare(b.name))),[all,category,search,filter]);
 const focused=visible.find(f=>f.key===selected)??visible[0]??null;
 const near=all.filter(f=>f.nextThreshold!==null&&f.kills>0).sort((a,b)=>a.remaining-b.remaining).slice(0,5);
 const groups=useMemo(()=>[...new Set(progress.categories.map(c=>c.group))],[progress.categories]);
 return <section className="profile-bestiary-page" aria-label="Bestiary">
   <header className="profile-page-heading"><div><p className="section-kicker">Combat discoveries</p><h2>Bestiary</h2><p>Explore mob families, earned tiers, and the next milestones across SkyBlock.</p></div></header>
   {!progress.apiAvailable?<div className="bestiary-data-note"><strong>Bestiary kills unavailable</strong><p>This profile did not provide Bestiary kill counters. No family tiers or player progress can be confirmed from this response.</p></div>:<>
   <div className="bestiary-overview">
    <article className="bestiary-overview-main"><span>Bestiary Level</span><strong>{fmt(progress.bestiaryLevel)}</strong><div className="dungeon-progress"><span style={{width:`${pct(progress.levelProgress)}%`}}/></div><p>{progress.familyTiers} family tiers earned · {progress.pointsToNextMilestone} to next level</p></article>
    <article><span>Families discovered</span><strong>{fmt(progress.discovered)}<small> / {fmt(progress.totalFamilies)}</small></strong><p>At least one kill reported</p></article>
    <article><span>Maxed families</span><strong>{fmt(progress.maxed)}</strong><p>All catalogue tiers reached</p></article>
    <article><span>Claimed milestone</span><strong>{progress.claimedMilestone===null?"—":fmt(progress.claimedMilestone)}</strong><p>{progress.claimedMilestone===null?"Not reported by API":"Last claimed reward milestone"}</p></article>
   </div>
   <section className="profile-gear-section" aria-label="Bestiary progression">
    <div className="profile-section-heading"><div><p className="section-kicker">Milestone progression</p><h2>Family Tiers</h2></div><span>{fmt(progress.familyTiers)} / {fmt(progress.maxFamilyTiers)} available tiers</span></div>
    <div className="bestiary-milestone"><div><strong>Next Bestiary Level: {fmt(progress.bestiaryLevel+1)}</strong><span>{progress.familyTiers} / {progress.nextMilestonePoints} tier points</span></div><div className="dungeon-progress"><span style={{width:`${pct(progress.levelProgress)}%`}}/></div><p>Every 10 earned family tiers contributes one Bestiary level. Claimed rewards are tracked separately.</p></div>
    {progress.unmappedKillKeys.length>0?<p className="bestiary-data-note">There are {progress.unmappedKillKeys.length} numeric kill identifiers not matched by this catalogue. Calculated tiers may be incomplete until the reference is updated.</p>:null}
   </section>
   <section className="profile-gear-section" aria-label="Bestiary regions">
    <div className="profile-section-heading"><div><p className="section-kicker">Explore by region</p><h2>Bestiary Categories</h2></div><span>{groups.length} regions</span></div>
    <div className="bestiary-category-grid"><button type="button" className={category==="all"?"bestiary-category selected":"bestiary-category"} onClick={()=>{setCategory("all");setSelected(null)}}><strong>All Regions</strong><span>{progress.discovered} discovered · {progress.totalFamilies} families</span></button>
    {progress.categories.map(c=><button key={c.id} type="button" className={category===c.id?"bestiary-category selected":"bestiary-category"} onClick={()=>{setCategory(c.id);setSelected(null)}}><strong>{c.name}{c.group!==c.name?<small>{c.group}</small>:null}</strong><span>{c.discovered}/{c.families.length} discovered · {c.maxed} maxed</span><div className="dungeon-progress"><span style={{width:`${c.maxFamilyTiers?pct(c.familyTiers/c.maxFamilyTiers):0}%`}}/></div></button>)}</div>
   </section>
   <section className="profile-gear-section" aria-label="Bestiary mob families">
    <div className="profile-section-heading"><div><p className="section-kicker">Family collection</p><h2>Bestiary Families</h2></div><span>{visible.length} shown</span></div>
    <div className="bestiary-filters"><input aria-label="Search Bestiary families" value={search} placeholder="Search mobs or regions…" onChange={e=>setSearch(e.target.value)}/><div role="group" aria-label="Filter Bestiary families">{(["all","discovered","missing","maxed","near"] as const).map(k=><button type="button" key={k} aria-pressed={filter===k} className={filter===k?"bestiary-filter active":"bestiary-filter"} onClick={()=>setFilter(k)}>{k==="near"?"Next tiers":k==="all"?"All":k==="missing"?"Undiscovered":k==="maxed"?"Maxed":"Discovered"}</button>)}</div></div>
    <div className="bestiary-workspace"><div className="bestiary-family-list">{visible.length?visible.map(f=><button type="button" key={f.key} className={focused?.key===f.key?"bestiary-family-card active":"bestiary-family-card"} onClick={()=>setSelected(f.key)}>{f.imageUrl?<Image unoptimized width={64} height={64} src={f.imageUrl} alt="" loading="lazy"/>:<span className="bestiary-image-fallback">✦</span>}<span className="bestiary-family-info"><strong>{f.name}</strong><small>{f.categoryName} · {fmt(f.kills)} kills</small><span className="dungeon-progress"><span style={{width:`${pct(f.progress)}%`}}/></span></span><span className="bestiary-family-tier">{f.tier}/{f.maxTier}</span></button>):<p className="bestiary-muted">No mob families match your filters.</p>}</div>
     <aside className="bestiary-family-detail">{focused?<><div className="bestiary-detail-top">{focused.imageUrl?<Image unoptimized width={64} height={64} src={focused.imageUrl} alt="" loading="lazy"/>:null}<div><p className="section-kicker">{focused.categoryName}</p><h3>{focused.name}</h3></div></div><strong>Tier {focused.tier} / {focused.maxTier}</strong><p>{fmt(focused.kills)} kills · {fmt(focused.deaths)} reported deaths</p><div className="dungeon-progress"><span style={{width:`${pct(focused.progress)}%`}}/></div><div className="bestiary-detail-stat"><span>Next tier</span><strong>{focused.nextThreshold===null?"Maxed":`${fmt(focused.nextThreshold)} kills`}</strong></div><div className="bestiary-detail-stat"><span>Remaining kills</span><strong>{focused.nextThreshold===null?"Complete":fmt(focused.remaining)}</strong></div><small>{focused.keys.length>1?`${focused.keys.length} mob variants contribute to this family.`:"Kills are counted from the matching API mob identifier."}</small></>:<p>Select a mob family to inspect its tiers.</p>}</aside></div>
   </section>
   <section className="profile-gear-section" aria-label="Closest Bestiary tiers"><div className="profile-section-heading"><div><p className="section-kicker">Progression opportunities</p><h2>Closest Family Tiers</h2></div></div><div className="bestiary-nearest">{near.map(f=><button type="button" key={f.key} onClick={()=>{setCategory(f.categoryId);setSearch("");setFilter("all");setSelected(f.key)}}><strong>{f.name}</strong><span>{f.categoryName}</span><b>{fmt(f.remaining)} kills left</b></button>)}</div><p className="bestiary-muted">Sorted only by remaining kills, not farming time or mob accessibility.</p></section>
   </>}
 </section>;
}
