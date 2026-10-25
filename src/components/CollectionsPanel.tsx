"use client";
import { useMemo,useState } from "react";
import type { NormalizedSkyBlockProfile } from "@/schemas/normalized-profile";

type Progress=NormalizedSkyBlockProfile["collectionsProgress"];
type Entry=Progress["collections"][number];
const fmt=(value:number|null)=>value===null?"—":value.toLocaleString("en-US");
const percentage=(value:number|null)=>Math.max(0,Math.min(100,Math.round((value??0)*100)));
export function CollectionsPanel({progress}:{progress:Progress}){
 const [category,setCategory]=useState("all");
 const [search,setSearch]=useState("");
 const [filter,setFilter]=useState<"all"|"discovered"|"unfinished"|"maxed">("all");
 const [selected,setSelected]=useState<string|null>(null);
 const visible=useMemo(()=>progress.collections.filter(c=>
  (category==="all"||c.category===category)&&
  (c.name.toLowerCase().includes(search.toLowerCase())||c.id.toLowerCase().includes(search.toLowerCase()))&&
  (filter==="all"||filter==="discovered"&&((c.observed??0)>0||c.earnedTier>0)||
   filter==="unfinished"&&!c.maxed||filter==="maxed"&&c.maxed)
 ),[progress.collections,category,search,filter]);
 const active=visible.find(c=>c.id===selected)??visible[0]??null;
 const closest=progress.collections.filter(c=>!c.maxed&&c.remaining!==null)
  .sort((a,b)=>a.remaining!-b.remaining!||a.name.localeCompare(b.name)).slice(0,5);
 const select=(entry:Entry)=>{setCategory(entry.category);setFilter("all");setSearch("");setSelected(entry.id)};
 return <section className="profile-collections-page" aria-label="Collections">
  <header className="profile-page-heading"><div><p className="section-kicker">Resource progression</p><h2>Collections</h2><p>Track collection tiers, shared co-op contributions, and their unlock rewards.</p></div></header>
  {!progress.referenceAvailable?<div className="collection-notice">The Hypixel collection reference is unavailable. Progression thresholds and category information could not be loaded.</div>:<>
   <div className="collections-summary">
    <article><span>Collections discovered</span><strong>{fmt(progress.discovered)} <small>/ {fmt(progress.totalCollections)}</small></strong><p>Reported collection counts or unlocked tiers</p></article>
    <article><span>Maxed collections</span><strong>{fmt(progress.maxed)}</strong><p>Highest catalogue tier reached</p></article>
    <article><span>Total earned tiers</span><strong>{fmt(progress.earnedTiers)}</strong><p>Of {fmt(progress.maxTiers)} possible tiers</p></article>
    <article><span>Co-op history coverage</span><strong>{progress.observedMembers} <small>/ {progress.totalMembers}</small></strong><p>Members with collection data</p></article>
   </div>
   {!progress.contributionsComplete?<div className="collection-notice">Some co-op members did not supply collection counts. Figures use the reported data and may be incomplete; shared totals and tier progression could be higher.</div>:null}
   {!progress.unlocksComplete?<div className="collection-notice">Some co-op members did not supply collection unlock history. Confirmed unlock markers may be incomplete.</div>:null}
   <section className="profile-gear-section">
    <div className="profile-section-heading"><div><p className="section-kicker">Category progression</p><h2>Collection Categories</h2></div><span>{progress.categories.length} categories</span></div>
    <div className="collections-categories"><button type="button" className={category==="all"?"collections-category selected":"collections-category"} onClick={()=>{setCategory("all");setSelected(null)}}><strong>All Collections</strong><span>{progress.earnedTiers} / {progress.maxTiers} tiers</span></button>
    {progress.categories.map(c=><button type="button" key={c.name} className={category===c.name?"collections-category selected":"collections-category"} onClick={()=>{setCategory(c.name);setSelected(null)}}><strong>{c.name}</strong><span>{c.maxed}/{c.count} maxed · {c.earnedTiers}/{c.maxTiers} tiers</span><div className="dungeon-progress"><span style={{width:`${c.maxTiers?percentage(c.earnedTiers/c.maxTiers):0}%`}}/></div></button>)}</div>
   </section>
   <section className="profile-gear-section">
    <div className="profile-section-heading"><div><p className="section-kicker">Resource collections</p><h2>Collection Explorer</h2></div><span>{visible.length} shown</span></div>
    <div className="collections-filters"><input aria-label="Search collections" placeholder="Search collections…" value={search} onChange={e=>setSearch(e.target.value)}/><div role="group" aria-label="Filter collections">{(["all","discovered","unfinished","maxed"] as const).map(option=><button type="button" key={option} className={option===filter?"active":""} aria-pressed={option===filter} onClick={()=>setFilter(option)}>{option==="all"?"All":option==="discovered"?"Discovered":option==="unfinished"?"In progress":"Maxed"}</button>)}</div></div>
    <div className="collections-workspace"><div className="collections-list">{visible.length?visible.map(c=><button type="button" key={c.id} className={active?.id===c.id?"collections-list-item selected":"collections-list-item"} onClick={()=>setSelected(c.id)}><div><strong>{c.name}</strong><small>{c.category} · {fmt(c.observed)} observed</small><span className="dungeon-progress"><span style={{width:`${percentage(c.progress)}%`}}/></span></div><b>{c.earnedTier}/{c.maxTier}</b></button>):<p className="collections-muted">No collections match your filters.</p>}</div>
    <aside className="collections-detail">{active?<><p className="section-kicker">{active.category}</p><h3>{active.name}</h3><div className="collections-detail-stats"><div><span>Observed co-op contribution</span><strong>{fmt(active.observed)}</strong></div><div><span>Your reported contribution</span><strong>{fmt(active.personal)}</strong></div><div><span>Collection tier</span><strong>{active.earnedTier} / {active.maxTier}</strong></div></div>
     <div className="collections-timeline">{active.tiers.map(t=><div className="collections-tier" key={t.tier}><div className={t.confirmed?"collections-tier-marker confirmed":t.thresholdObserved?"collections-tier-marker reached":"collections-tier-marker"}>{t.confirmed?"✓":t.tier}</div><div><strong>Tier {t.tier} <span>· {fmt(t.required)} resources</span></strong><small>{t.confirmed?"Explicit unlock reported":t.thresholdObserved?"Count threshold reached":"Not yet confirmed"}</small>{t.unlocks.length?<ul>{t.unlocks.map((reward,i)=><li key={i}>{reward}</li>)}</ul>:<p>No unlock description in reference</p>}</div></div>)}</div>
     {active.maxed?<p className="collections-muted">Highest catalogued tier reached.</p>:<p className="collections-muted">{active.remaining===null?"Resources remaining unavailable":`${fmt(active.remaining)} additional observed resources to Tier ${active.nextTier}`}</p>}
     </>:<p className="collections-muted">Select a collection to inspect its rewards.</p>}</aside></div>
   </section>
   <section className="profile-gear-section"><div className="profile-section-heading"><div><p className="section-kicker">Near-term milestones</p><h2>Closest Collection Upgrades</h2></div></div><div className="collections-closest">{closest.map(c=><button key={c.id} type="button" onClick={()=>select(c)}><strong>{c.name}</strong><span>{c.category} · Tier {c.nextTier}</span><b>{fmt(c.remaining)} resources left</b></button>)}</div><p className="collections-muted">Sorted by additional reported resource count, not gathering time. Incomplete co-op history can affect these estimates.</p></section>
   </>}
 </section>;
}
