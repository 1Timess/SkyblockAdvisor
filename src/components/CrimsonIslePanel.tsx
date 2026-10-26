"use client";

import { useMemo, useState } from "react";
import type { NormalizedSkyBlockProfile } from "@/schemas/normalized-profile";

type Progress = NormalizedSkyBlockProfile["crimsonIsle"];
type Armor = Progress["equipment"]["pieces"][number];
type Section = "factions" | "kuudra" | "dojo" | "trophies" | "equipment" | "activities";
const sections: { id: Section; label: string; subtitle: string }[] = [
 {id:"factions",label:"Factions & Quests",subtitle:"Reputation and story"},
 {id:"kuudra",label:"Kuudra",subtitle:"Tiers and gates"},
 {id:"dojo",label:"Dojo",subtitle:"Scores and belts"},
 {id:"trophies",label:"Trophy Fishing",subtitle:"Odger collection"},
 {id:"equipment",label:"Equipment",subtitle:"Armor and upgrades"},
 {id:"activities",label:"Island Activities",subtitle:"Matriarch and dailies"},
];
const number = (n: number|null) => n===null?"—":n.toLocaleString("en-US");
const coins = (n: number|null) => n===null?"Price unavailable":n.toLocaleString("en-US")+" coins";
const title = (value: string) => value.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
const percent = (value:number,max:number) => max>0?Math.max(0,Math.min(100,Math.round(100*value/max))):0;
const evidenceLabel=(s:string)=>s==="MET"?"Met":s==="NOT_MET"?"Unmet":s==="NOT_APPLICABLE"?"N/A":"Unknown";
function ProgressTrack({value,max}:{value:number;max:number}) {
 return <div className="crimson-track" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.max(0,Math.min(value,max))}>
   <span style={{width:percent(value,max)+"%"}}/>
 </div>;
}
function SectionHeader({kicker,heading,description}:{kicker:string;heading:string;description?:string}) {
 return <div className="profile-section-heading"><div><p className="section-kicker">{kicker}</p><h2>{heading}</h2>{description?<p className="crimson-muted">{description}</p>:null}</div></div>;
}
function Status({label}:{label:string}) {
 const good=["MET","COMPLETE","HISTORICALLY_CLEARED"].includes(label);
 const caution=["NOT_MET","KNOWN_GATE_UNMET"].includes(label);
 return <span className={"crimson-status "+(good?"crimson-status--good":caution?"crimson-status--warn":"")}>{label==="HISTORICALLY_CLEARED"?"Cleared":label==="KNOWN_GATE_UNMET"?"Gate unmet":label==="NOT_VERIFIED"?"Unverified":evidenceLabel(label)==="Unknown"&&label!=="UNKNOWN"?title(label):evidenceLabel(label)}</span>;
}
function Factions({progress}:{progress:Progress}){
 const q=progress.quests;
 return <div className="crimson-section">
 <SectionHeader kicker="Political standing" heading="Factions" description="Reputation gates are measurable; a reputation rank does not certify storyline completion."/>
 <div className="crimson-two-grid">{progress.faction.factions.map(f=>{
  const thresholds=progress.unlocks.factionRanks.find(x=>x.faction===f.id)?.thresholds??[];
  const next=[...thresholds].sort((a,b)=>a.required-b.required).find(t=>t.status!=="MET");
  return <article className="crimson-card" key={f.id}>
   <div className="crimson-card-top"><h3>{f.id==="mages"?"Mage Faction":"Barbarian Faction"}</h3>{progress.faction.selected?.toLowerCase().includes(f.id==="mages"?"mage":"barbarian")?<span className="crimson-pill">Selected</span>:null}</div>
   <strong className="crimson-big-stat">{number(f.reputation)}</strong><p className="crimson-muted">Reputation · {f.rank??"Rank unavailable"}</p>
   <ProgressTrack value={f.reputation??0} max={12000}/>
   <div className="crimson-gates">{thresholds.map(t=><div key={t.name}><span>{t.name} · {number(t.required)}</span><Status label={t.status}/></div>)}</div>
   <p className="crimson-muted">{next&&f.reputation!==null?number(Math.max(0,next.required-f.reputation))+" reputation to "+next.name: f.reputation===null?"Reputation not reported": "Highest known reputation threshold reached"}</p>
  </article>;
 })}</div>
 <div className="crimson-card">
 <SectionHeader kicker="Explicit quest evidence" heading="Faction Storyline" description="Only reported quest flags are shown as completed. Mapped steps are not the full storyline."/>
 {!q.questApiAvailable?<p className="crimson-notice">The profile API did not report top-level quest states. Storyline progress cannot be determined.</p>:null}
 <div className="crimson-quest-grid">{q.branches.map(branch=><div key={branch.id} className="crimson-quest-group">
  <div className="crimson-card-top"><h3>{branch.id==="opening"?"Introduction":title(branch.id)}</h3><span className="crimson-subtle">{branch.observedComplete}/{branch.totalMappedSteps} mapped steps</span></div>
  {q.storyline.filter(step=>step.branch===branch.id).map(step=><div className="crimson-quest-step" key={step.id}><div><strong>{step.label}</strong><small>{step.available?"Quest state reported":"No quest flag reported"}</small></div><Status label={step.status}/></div>)}
  <p className="crimson-muted">{branch.completionVerified?"Branch completion verified":"Full storyline completion not verified"}</p>
 </div>)}</div>
 {q.unknownStorylineKeys.length?<details className="crimson-details"><summary>{q.unknownStorylineKeys.length} additional relevant quest IDs</summary><p className="crimson-muted">{q.unknownStorylineKeys.join(", ")}</p></details>:null}
 </div>
 </div>;
}
function Kuudra({progress}:{progress:Progress}){
 return <div className="crimson-section">
  <SectionHeader kicker="Boss progression" heading="Kuudra" description="Completions and reputation are reported separately from storyline, access, and combat readiness."/>
  <div className="crimson-metric-row"><article><span>Recorded completions</span><strong>{number(progress.kuudra.totalCompletions)}</strong></article><article><span>Calculated collection points</span><strong>{number(progress.kuudra.collectionPoints)}</strong></article><article><span>Cleared difficulties</span><strong>{progress.kuudra.tiers.filter(t=>t.completions!==null&&t.completions>0).length}/5</strong></article></div>
  {!progress.kuudra.available?<p className="crimson-notice">Kuudra completion data is unavailable. Blank totals do not mean zero clears.</p>:null}
  <div className="crimson-tier-grid">{progress.kuudra.tiers.map(t=>{
   const gate=progress.unlocks.kuudraTiers.find(g=>g.id===t.id);
   return <article className="crimson-card crimson-tier" key={t.id}>
    <div className="crimson-card-top"><h3>{t.name}</h3>{gate?<Status label={gate.overall}/>:null}</div>
    <strong className="crimson-big-stat">{number(t.completions)}</strong><p className="crimson-muted">Completed runs · {t.points} collection {t.points===1?"point":"points"} each</p>
    <div className="crimson-gates"><div><span>Reputation · {number(t.reputation)}</span><Status label={gate?.reputation??"UNKNOWN"}/></div>
      <div><span>Previous difficulty</span><Status label={gate?.previousTier??"UNKNOWN"}/></div>
      <div><span>Storyline access</span><Status label={gate?.storyline??"UNKNOWN"}/></div></div>
    <p className="crimson-muted">Highest wave: {number(t.highestWave)}</p>
   </article>;
  })}</div>
  <p className="crimson-notice">A recorded clear verifies historical access, not current combat readiness. Missing storyline evidence remains unverified.</p>
 </div>;
}
function Dojo({progress}:{progress:Progress}){
 const dojo=progress.dojo;
 return <div className="crimson-section">
  <SectionHeader kicker="Seven challenges" heading="Dojo" description="Ranks and belt eligibility are calculated from API scores, not claimed belt ownership."/>
  <div className="crimson-two-grid"><article className="crimson-card"><p className="crimson-subtle">Total points</p><strong className="crimson-big-stat">{number(dojo.totalPoints)} <small>/ 7,000</small></strong><ProgressTrack value={dojo.totalPoints??0} max={7000}/><p className="crimson-muted">Eligible belt: <strong>{dojo.eligibleBelt??"Unknown"}</strong></p></article>
  <article className="crimson-card"><p className="crimson-subtle">Next belt milestone</p><strong className="crimson-big-stat crimson-smaller">{dojo.nextBelt??(dojo.totalPoints===null?"Unknown":"Black belt reached")}</strong><p className="crimson-muted">{dojo.pointsToNext===null?"Missing scores prevent calculating the next belt":dojo.nextBelt?number(dojo.pointsToNext)+" additional points":"Maximum eligibility reached"} · Claim status not established</p></article></div>
  <div className="crimson-test-grid">{dojo.tests.map(t=><article className="crimson-card" key={t.id}><div className="crimson-card-top"><h3>{title(t.name)}</h3><span className="crimson-pill">{t.rank??"Unknown rank"}</span></div><strong>{number(t.points)} <small className="crimson-subtle">/ 1,000</small></strong><ProgressTrack value={t.points??0} max={1000}/><p className="crimson-muted">Reported time: {number(t.time)}</p></article>)}</div>
 </div>;
}
function Trophies({progress}:{progress:Progress}){
 const t=progress.trophyFishing;
 const [quality,setQuality]=useState("bronze");
 const [search,setSearch]=useState("");
 const [selected,setSelected]=useState<string|null>(null);
 const fish=useMemo(()=>t.fish.filter(f=>f.name.toLowerCase().includes(search.toLowerCase())),[t.fish,search]);
 const active=fish.find(f=>f.id===selected)??fish[0]??null;
 const missing=t.missingByQuality.find(g=>g.quality===quality);
 return <div className="crimson-section">
 <SectionHeader kicker="Odger's collection" heading="Trophy Fishing" description="Each quality counts toward its own collection tier. Claimed Odger rewards are distinct from fish caught."/>
 <div className="crimson-metric-row"><article><span>Recorded trophy catches</span><strong>{number(t.totalCaught)}</strong></article><article><span>Claimed Odger rank</span><strong>{t.claimedOdgerRank??"Unknown"}</strong></article><article><span>Highest-quality types</span><strong>{t.grades.find(g=>g.quality==="diamond")?.unique??0}/{t.fishTypes}</strong></article></div>
 {!t.available?<p className="crimson-notice">Trophy Fish API data unavailable. Counts of zero shown for missing fish must not be treated as confirmed uncaught fish.</p>:null}
 <div className="crimson-quality-grid">{t.grades.map(g=><button key={g.quality} type="button" aria-pressed={quality===g.quality} onClick={()=>setQuality(g.quality)} className={"crimson-quality "+(quality===g.quality?"selected":"")}><strong>{title(g.quality)}</strong><span>{g.unique} / {t.fishTypes} types</span><ProgressTrack value={g.unique} max={t.fishTypes}/></button>)}</div>
 <p className="crimson-muted">{t.available?number(missing?.missing.length??null)+" types missing "+title(quality)+"-or-better evidence":"Fish completeness cannot be established without API data."}</p>
 <div className="crimson-filter"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find trophy fish…" aria-label="Search trophy fish"/></div>
 <div className="crimson-workspace"><div className="crimson-collection-list">{fish.map(f=><button type="button" key={f.id} className={"crimson-collection-card "+(active?.id===f.id?"selected":"")} onClick={()=>setSelected(f.id)}><div><strong>{f.name}</strong><small>{f.highestQuality?title(f.highestQuality)+" recorded":"No quality recorded"}</small></div><span className="crimson-subtle">{number(f.total)}</span></button>)}{!fish.length?<p className="crimson-muted">No fish match the search.</p>:null}</div>
 <aside className="crimson-card crimson-detail">{active?<><p className="section-kicker">Trophy Fish</p><h3>{active.name}</h3><p className="crimson-muted">{active.catchRequirement??"Catching condition not documented"}</p><div className="crimson-gates">{(["bronze","silver","gold","diamond"] as const).map(q=><div key={q}><span>{title(q)}</span><strong>{number(active[q])}</strong></div>)}</div><p className="crimson-muted">Counts are API-recorded catches, not unclaimed rewards. Personal pity counters are unavailable.</p></>:<p className="crimson-muted">Select a fish to inspect.</p>}</aside></div>
 </div>;
}
function CostBreakdown({piece}:{piece:Armor}){
 const cost=piece.toNextUpgrade;const full=piece.toInfernal15;
 return <div className="crimson-costs">
  <div className="crimson-card-top"><h4>Next upgrade</h4><span className="crimson-pill">{piece.nextUpgrade?piece.nextUpgrade.action==="STAR"?"Star "+piece.nextUpgrade.toStars:"Prestige to "+piece.nextUpgrade.toTier:"No next action"}</span></div>
  {cost?<><div className="crimson-price"><span>Estimated total</span><strong>{coins(cost.estimatedTotalCoins)}</strong></div><div className="crimson-gates">{cost.ingredients.map(i=><div key={i.id}><span>{title(i.id)} × {number(i.quantity)}</span><strong>{i.estimatedCoins===null?"No quote":coins(i.estimatedCoins)}</strong></div>)}</div>
  {cost.missingPriceIds.length?<p className="crimson-notice">Unpriced: {cost.missingPriceIds.map(title).join(", ")}. The full coin estimate is intentionally unavailable.</p>:null}
  {!cost.recipeComplete?<p className="crimson-notice">The recipe is incomplete in the available reference.</p>:null}
  <p className="crimson-muted">Prices reflect the existing Bazaar/AH market snapshot and are gross costs, before owned materials.</p></>:<p className="crimson-muted">No priced next upgrade available.</p>}
  {full?<div className="crimson-total"><div><span>Remaining path to Infernal 15★</span><strong>{coins(full.estimatedTotalCoins)}</strong></div><small>{full.steps} upgrade steps · {full.recipeComplete?"Recipes available":"Some recipes missing"} · {full.missingPriceIds.length?full.missingPriceIds.length+" unpriced materials":"All material prices found"}</small></div>:null}
 </div>;
}
function Equipment({progress}:{progress:Progress}){
 const pieces=progress.equipment.pieces;
 const [family,setFamily]=useState("all");
 const [selected,setSelected]=useState<string|null>(null);
 const families=[...new Set(pieces.map(piece=>piece.family))];
 const shown=pieces.filter(p=>family==="all"||p.family===family);
 const focused=shown.find(p=>(p.uuid??p.id+"-"+p.source)===selected)??shown[0]??null;
 return <div className="crimson-section">
  <SectionHeader kicker="Kuudra armor" heading="Equipment Upgrades" description="Detected owned pieces, current stars, exact material recipes, and market estimates."/>
  <div className="crimson-metric-row"><article><span>Detected armor pieces</span><strong>{progress.equipment.trackedPieces}</strong></article><article><span>Upgrade-ready prestige</span><strong>{pieces.filter(p=>p.nextAction==="PRESTIGE").length}</strong></article><article><span>Fully starred Infernal</span><strong>{pieces.filter(p=>p.nextAction==="MAXED").length}</strong></article></div>
  <div className="crimson-filter"><div className="crimson-chip-row">{["all",...families].map(id=><button type="button" key={id} aria-pressed={family===id} className={"crimson-chip "+(family===id?"selected":"")} onClick={()=>{setFamily(id);setSelected(null)}}>{title(id==="all"?"All Sets":id)}</button>)}</div></div>
  <div className="crimson-workspace"><div className="crimson-collection-list">{shown.map(p=><button type="button" key={p.uuid??p.id+"-"+p.source} className={"crimson-collection-card "+(focused===p?"selected":"")} onClick={()=>setSelected(p.uuid??p.id+"-"+p.source)}><div><strong>{p.name}</strong><small>{p.tier} · {p.stars===null?"Stars unknown":p.stars+"★ / "+p.maxStars+"★"}</small></div><span className="crimson-subtle">{title(p.nextAction.toLowerCase())}</span></button>)}{!shown.length?<p className="crimson-muted">No matching Kuudra armor detected in the loaded inventories.</p>:null}</div>
  <aside className="crimson-card crimson-detail">{focused?<><p className="section-kicker">{title(focused.family)} · {title(focused.slot)}</p><h3>{focused.name}</h3><p className="crimson-muted">{focused.tier} · {focused.stars===null?"Stars not reported":focused.stars+" of "+focused.maxStars+" stars"}</p><ProgressTrack value={focused.stars??0} max={focused.maxStars}/>
   <div className="crimson-gates"><div><span>Combat {focused.currentRequirements.combatLevelRequired} required</span><Status label={focused.currentRequirements.combatMet===null?"UNKNOWN":focused.currentRequirements.combatMet?"MET":"NOT_MET"}/></div><div><span>{title(focused.currentRequirements.kuudraTierRequired==="none"?"Basic":focused.currentRequirements.kuudraTierRequired)} Kuudra clear</span><Status label={focused.currentRequirements.kuudraClearMet===null?"UNKNOWN":focused.currentRequirements.kuudraClearMet?"MET":"NOT_MET"}/></div></div>
   <CostBreakdown piece={focused}/></>:<p className="crimson-muted">Choose an owned Kuudra armor piece to view its upgrade path.</p>}</aside></div>
  <p className="crimson-muted">Armor is detected only in inventory sources available to Statixel. Missing pieces do not prove you do not own them.</p>
 </div>;
}
function Activities({progress}:{progress:Progress}){
 const q=progress.quests.daily,m=progress.matriarch;
 return <div className="crimson-section">
  <SectionHeader kicker="Repeatable island content" heading="Matriarch & Daily Quests" description="History and assignments are reported separately from today's availability."/>
  <div className="crimson-two-grid"><article className="crimson-card"><div className="crimson-card-top"><h3>Matriarch</h3><span className="crimson-pill">Heavy Pearls</span></div><strong className="crimson-big-stat">{number(m.pearlsCollected)}</strong><p className="crimson-muted">Historical pearls collected</p><div className="crimson-gates"><div><span>Last attempt (API timestamp)</span><strong>{number(m.lastAttempt)}</strong></div><div><span>Refresh entries</span><strong>{m.recentRefreshes?.length??"Unknown"}</strong></div></div><p className="crimson-muted">Today&apos;s availability cannot be confirmed from these fields alone.</p></article>
  <article className="crimson-card"><div className="crimson-card-top"><h3>Daily Faction Quests</h3><span className="crimson-pill">{q.available?"Reported":"Unavailable"}</span></div><strong className="crimson-big-stat">{q.assignments.length}</strong><p className="crimson-muted">Quest assignment IDs in API</p><p className="crimson-muted">{q.assignments.length?q.assignments.map(title).join(" · "):"No assignments reported. This does not prove no quests are available."}</p></article></div>
  <div className="crimson-card"><SectionHeader kicker="Reported task data" heading="Faction Dailies"/><div className="crimson-daily-grid">{q.entries.map(e=><div className="crimson-quest-step" key={e.id}><div><strong>{e.label}</strong><small>{e.available?"Reported progress: "+number(e.progress):"No quest record"}</small></div><span className="crimson-pill">{e.status??"Unknown"}</span></div>)}</div>{q.questRewardsClaimed.length?<p className="crimson-muted">Explicit claimed reward keys: {q.questRewardsClaimed.join(", ")}</p>:null}{q.extraKeys.length?<details className="crimson-details"><summary>Other reported quest keys ({q.extraKeys.length})</summary><p className="crimson-muted">{q.extraKeys.join(", ")}</p></details>:null}</div>
 </div>;
}
export function CrimsonIslePanel({progress}:{progress:Progress}){
 const [section,setSection]=useState<Section>("factions");
 const current=sections.find(s=>s.id===section)!;
 return <section className="profile-crimson-page" aria-label="Crimson Isle">
  <header className="profile-page-heading"><div><p className="section-kicker">Nether progression</p><h2>Crimson Isle</h2><p>Factions, Kuudra, Dojo, Trophy Fishing, and upgrade paths—based on the progression your profile reports.</p></div></header>
  {!progress.available?<p className="crimson-notice">Crimson Isle member data is not available. Some independent information, such as Trophy Fish records or owned equipment, may still be present.</p>:null}
  <div className="crimson-metric-row crimson-top-metrics"><article><span>Selected faction</span><strong>{progress.faction.selected?title(progress.faction.selected):"Unknown"}</strong></article><article><span>Kuudra completions</span><strong>{number(progress.kuudra.totalCompletions)}</strong></article><article><span>Dojo belt eligibility</span><strong>{progress.dojo.eligibleBelt??"Unknown"}</strong></article><article><span>Trophy Fish types observed</span><strong>{progress.trophyFishing.grades.find(x=>x.quality==="bronze")?.unique??0}/{progress.trophyFishing.fishTypes}</strong></article></div>
  <div className="crimson-layout"><nav className="crimson-subnav" aria-label="Crimson Isle sections">{sections.map(s=><button type="button" key={s.id} aria-current={section===s.id?"page":undefined} className={"crimson-nav-item "+(section===s.id?"selected":"")} onClick={()=>setSection(s.id)}><strong>{s.label}</strong><span>{s.subtitle}</span></button>)}</nav>
  <div className="crimson-main" key={section}><p className="crimson-mobile-subtitle">{current.subtitle}</p>
    {section==="factions"?<Factions progress={progress}/>:section==="kuudra"?<Kuudra progress={progress}/>:section==="dojo"?<Dojo progress={progress}/>:section==="trophies"?<Trophies progress={progress}/>:section==="equipment"?<Equipment progress={progress}/>:<Activities progress={progress}/>}
  </div></div>
 </section>;
}
