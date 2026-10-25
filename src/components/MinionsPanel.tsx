"use client";

import { useMemo, useState } from "react";
import type { NormalizedSkyBlockProfile } from "@/schemas/normalized-profile";

type Minions = NormalizedSkyBlockProfile["minions"];
const fmt = (n:number | null) => n===null ? "—" : n.toLocaleString("en-US");

export function MinionsPanel({minions}:{minions:Minions}) {
  const [query,setQuery] = useState("");
  const [filter,setFilter] = useState<"all"|"crafted"|"missing"|"upgrade">("all");
  const [selected,setSelected] = useState<string | null>(null);
  const visible = useMemo(()=>minions.families.filter(f=>{
    const matches = f.name.toLowerCase().includes(query.toLowerCase()) || f.id.toLowerCase().includes(query.toLowerCase());
    return matches && (filter==="all" || filter==="crafted"&&f.craftedTiers.length>0 ||
      filter==="missing"&&f.craftedTiers.length===0 || filter==="upgrade"&&f.nextTier!==null);
  }),[minions.families,query,filter]);
  const selectedFamily = minions.families.find(f=>f.id===selected) ?? visible[0] ?? null;
  const maxed = minions.families.filter(f=>f.maxCatalogTier!==null && f.maxCraftedTier>=f.maxCatalogTier).length;
  const craftedFamilies = minions.families.filter(f=>f.craftedTiers.length).length;
  return <section className="profile-minions-page" aria-label="Minions">
    <div className="profile-page-heading"><div><p className="section-kicker">Minion progression</p><h2>Minions</h2><p>Track unique crafts, shared co-op progress, slot unlocks, and missing minion tiers.</p></div></div>
    <div className="minion-summary">
      <article className="minion-summary-primary"><span className="profile-stat-card__label">Unlocked minion slots</span><strong>{fmt(minions.totalSlots)}</strong><p>{minions.craftedSlots===null?"Craft-based slots unknown":`${minions.craftedSlots} crafted slots`} · {minions.bonusSlots===null?"Community upgrades unknown":`+${minions.bonusSlots} Community Shop`}</p></article>
      <div className="minion-summary-card"><span>Unique tiers crafted</span><strong>{minions.available?fmt(minions.uniqueCrafts):"—"}</strong><small>{minions.historyComplete?"Co-op-wide history":"Reported history may be incomplete"}</small></div>
      <div className="minion-summary-card"><span>Families crafted</span><strong>{craftedFamilies}</strong><small>{minions.families.length} catalogued / observed</small></div>
      <div className="minion-summary-card"><span>Maxed families</span><strong>{maxed}</strong><small>By catalogued maximum tier</small></div>
    </div>
    <section className="profile-gear-section">
      <div className="profile-section-heading"><div><p className="section-kicker">Slot progression</p><h2>Next Minion Slot</h2></div></div>
      <div className="minion-next-slot"><div><strong>{minions.craftsToNextSlot===null ? "No next threshold available" : `${minions.craftsToNextSlot} unique crafts remaining`}</strong><p>{minions.nextSlotAt===null ? "Max tier reached or crafting history incomplete" : `${fmt(minions.uniqueCrafts)} / ${minions.nextSlotAt} unique crafts`}</p></div>{minions.nextSlotAt!==null?<div className="dungeon-progress"><span style={{width:`${Math.min(100,minions.uniqueCrafts/minions.nextSlotAt*100)}%`}}/></div>:null}</div>
      {!minions.historyComplete ? <p className="minion-hint">Some co-op members did not supply crafting history. Slot calculations are withheld rather than assuming missing tiers were never crafted.</p> : null}
    </section>
    <section className="profile-gear-section">
      <div className="profile-section-heading"><div><p className="section-kicker">Crafting history</p><h2>Minion Collection</h2></div><span>{visible.length} families</span></div>
      <div className="minion-filters"><input aria-label="Search minions" placeholder="Search minions…" value={query} onChange={event=>setQuery(event.target.value)}/><div role="group" aria-label="Filter minions">{(["all","crafted","missing","upgrade"] as const).map(key=><button type="button" aria-pressed={filter===key} className={filter===key?"minion-filter active":"minion-filter"} onClick={()=>setFilter(key)} key={key}>{key==="all"?"All":key==="upgrade"?"Upgradeable":key==="crafted"?"Crafted":"Not crafted"}</button>)}</div></div>
      <div className="minion-workspace"><div className="minion-grid" aria-label="Minion families">{visible.length?visible.map(f=><button type="button" onClick={()=>setSelected(f.id)} className={selectedFamily?.id===f.id?"minion-family active":"minion-family"} key={f.id}><span className="minion-family-icon" aria-hidden="true">▦</span><span className="minion-family-copy"><strong>{f.name}</strong><small>{f.maxCraftedTier>0?`Crafted to Tier ${f.maxCraftedTier}`:"Not crafted"}</small></span><span className="minion-family-tier">{f.maxCatalogTier===null?`${f.maxCraftedTier}/?`:`${f.maxCraftedTier}/${f.maxCatalogTier}`}</span></button>):<p className="minion-empty">No minions match the current filter.</p>}</div>
      <aside className="minion-detail">{selectedFamily?<><p className="section-kicker">Crafted progression</p><h3>{selectedFamily.name} Minion</h3><strong>Tier {selectedFamily.maxCraftedTier}{selectedFamily.maxCatalogTier!==null?` / ${selectedFamily.maxCatalogTier}`:""}</strong><p>{selectedFamily.craftedTiers.length? `Observed crafted tiers: ${selectedFamily.craftedTiers.join(", ")}`:"No confirmed crafts in the co-op history."}</p><div className="minion-tier-list">{Array.from({length:selectedFamily.maxCatalogTier??selectedFamily.maxCraftedTier},(_,i)=>i+1).map(tier=><span key={tier} className={selectedFamily.craftedTiers.includes(tier)?"minion-tier observed":"minion-tier"} title={selectedFamily.craftedTiers.includes(tier)?"Recorded craft":"Craft not reported"}>{tier}</span>)}</div><div className="minion-next-upgrade"><span>Next catalogue tier</span><strong>{selectedFamily.nextTier===null?"None known":`Tier ${selectedFamily.nextTier}`}</strong></div><small>Recorded tiers confirm crafting history, not currently placed minions. Unmarked tiers are not assumed uncrafted.</small></>:<p>Select a minion to view its progress.</p>}</aside></div>
      {!minions.catalogAvailable?<p className="minion-hint">The item catalogue was not loaded on this request. Additional uncatalogued minion families or tiers may be missing.</p>:null}
    </section>
    <p className="minion-hint">The public profile API does not reveal live island minions, installed fuel, stored output, or real-time production. This page tracks crafting unlocks rather than active minion setups.</p>
  </section>;
}
