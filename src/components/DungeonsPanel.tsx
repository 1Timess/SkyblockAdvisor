import Link from "next/link";
import type { NormalizedSkyBlockProfile } from "@/schemas/normalized-profile";

type Dungeons = NormalizedSkyBlockProfile["progression"]["dungeons"];
const classes = ["healer","mage","berserk","archer","tank"];
const floors = ["entrance","1","2","3","4","5","6","7"];
const fmt = (n:number|null|undefined) => n == null ? "—" : n.toLocaleString("en-US");
const time = (ms:number|null|undefined) => ms == null ? "—" : `${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,"0")}`;
const grade = (score:number|null|undefined) => score == null ? "—" : score >= 300 ? "S+" : score >= 270 ? "S" : score >= 230 ? "A" : score >= 160 ? "B" : score >= 100 ? "C" : "D";
function Metric({label,value}:{label:string;value:string|number}) {return <article className="dungeon-metric"><span>{label}</span><strong>{value}</strong></article>}
export function DungeonsPanel({dungeons,username,profileId,mode,floor}:{dungeons:Dungeons;username:string;profileId:string;mode?:string;floor?:string}) {
 const selectedMode = mode === "master" ? "master" : "normal";
 const selectedFloor = floor && floors.includes(floor) && !(selectedMode === "master" && floor === "entrance") ? floor : "7";
 const records = dungeons.floorRecords[selectedMode];
 const selected = records[selectedFloor];
 const href = (m:string,f:string) => ({pathname:"/profile",query:{username,profile:profileId,tab:"dungeons",mode:m,floor:f}});
 return <section className="profile-dungeons-page" aria-label="Dungeons">
  <div className="profile-page-heading"><div><p className="section-kicker">Dungeon progression</p><h2>Dungeons</h2><p>Catacombs levels, class experience, floor clears and personal records.</p></div></div>
  <section className="dungeon-summary" aria-label="Catacombs summary">
   <article className="dungeon-summary-main"><span className="profile-stat-card__label">Catacombs Level</span><strong>{fmt(dungeons.catacombs?.level)}</strong><div className="dungeon-progress"><span style={{width:`${(dungeons.catacombs?.progress??0)*100}%`}}/></div><p>{dungeons.catacombs ? `${fmt(dungeons.catacombs.xpCurrent)} / ${fmt(dungeons.catacombs.xpForNext)} XP toward next level` : "Catacombs data unavailable"}</p></article>
   <Metric label="Class Average" value={dungeons.classAverage == null?"—":dungeons.classAverage.toFixed(2)}/>
   <Metric label="Selected Class" value={dungeons.selectedClass ?? "—"}/>
   <Metric label="Secrets Found" value={fmt(dungeons.secretsFound)}/>
  </section>
  <section className="profile-gear-section" aria-label="Dungeon classes">
   <div className="profile-section-heading"><div><p className="section-kicker">Experience</p><h2>Dungeon Classes</h2></div></div>
   <div className="dungeon-classes">{classes.map(name=>{const level=dungeons.classes[name];return <article className={`dungeon-class${dungeons.selectedClass===name?" dungeon-class--active":""}`} key={name}><div className="dungeon-class-title"><strong>{name[0].toUpperCase()+name.slice(1)}</strong>{dungeons.selectedClass===name?<small>Selected</small>:null}</div><b>{level?`Level ${level.level}`:"—"}</b><div className="dungeon-progress"><span style={{width:`${(level?.progress??0)*100}%`}}/></div><p>{level?`${fmt(level.xp)} total XP`:"No class XP reported"}</p></article>})}</div>
  </section>
  <section className="profile-gear-section" aria-label="Dungeon floor records">
   <div className="profile-section-heading"><div><p className="section-kicker">Personal bests</p><h2>Floor Records</h2></div></div>
   <nav className="dungeon-modes" aria-label="Dungeon mode"><Link className={selectedMode==="normal"?"dungeon-mode active":"dungeon-mode"} href={href("normal",selectedFloor)}>Catacombs</Link><Link className={selectedMode==="master"?"dungeon-mode active":"dungeon-mode"} href={href("master",selectedFloor==="entrance"?"1":selectedFloor)}>Master Mode</Link></nav>
   <nav className="dungeon-floors" aria-label="Dungeon floor">{floors.filter(f=>selectedMode==="normal"||f!=="entrance").map(f=><Link key={f} className={selectedFloor===f?"dungeon-floor active":"dungeon-floor"} aria-current={selectedFloor===f?"page":undefined} href={href(selectedMode,f)}><strong>{f==="entrance"?"E":`${selectedMode==="master"?"M":"F"}${f}`}</strong><small>{records[f]?.completions == null?"—":`${fmt(records[f].completions)} clears`}</small></Link>)}</nav>
   <div className="dungeon-records"><div className="dungeon-records-heading"><div><p className="section-kicker">{selectedMode==="master"?"Master Mode":"Catacombs"}</p><h3>{selectedFloor==="entrance"?"Entrance":`Floor ${selectedFloor}`}</h3></div><div><span>Best grade</span><strong>{grade(selected?.bestScore)}</strong></div></div>
    <div className="dungeon-record-grid"><Metric label="Completions" value={fmt(selected?.completions)}/><Metric label="Runs Played" value={fmt(selected?.runsPlayed)}/><Metric label="Best Score" value={fmt(selected?.bestScore)}/><Metric label="Fastest Clear" value={time(selected?.fastestTimeMs)}/><Metric label="Fastest S" value={time(selected?.fastestSTimeMs)}/><Metric label="Fastest S+" value={time(selected?.fastestSPlusTimeMs)}/><Metric label="Mobs Killed" value={fmt(selected?.mobsKilled)}/><Metric label="Most Kills / Run" value={fmt(selected?.mostMobsKilled)}/></div>
    <p className="dungeon-records-note">— indicates no reported record. Times are personal bests, not run averages.</p>
   </div>
  </section>
  <section className="dungeon-pending"><article><p className="section-kicker">Boss collections</p><h3>Collection milestones</h3><p>Reward thresholds and claims are not yet in the verified data contract. Floor clears are shown above, without inventing collection claims.</p></article><article><p className="section-kicker">RNG Meters</p><h3>Selected dungeon drops</h3><p>Selected rewards, stored score and required score are not yet normalized. Meter progress is withheld until these fields are verified.</p></article></section>
 </section>;
}
