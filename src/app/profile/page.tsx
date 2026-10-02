import Link from "next/link";
import { buildNormalizedProfile } from "@/server/skyblock/profile/build-normalized-profile";
import { AppError } from "@/server/errors";
import { getProfileIconPath } from "@/lib/profile-icons";

type ProfilePageProps = { searchParams: Promise<{ username?: string; profile?: string; tab?: string }> };
const skillLabels: Record<string, string> = { combat:"Combat", mining:"Mining", farming:"Farming", foraging:"Foraging", fishing:"Fishing", enchanting:"Enchanting", alchemy:"Alchemy", taming:"Taming", carpentry:"Carpentry", runecrafting:"Runecrafting", social:"Social", hunting:"Hunting" };
function formatCoins(value:number|null){return value===null?"—":new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:2}).format(value)}
function getNumeric(value:unknown,keys:string[]){if(!value||typeof value!=="object"||Array.isArray(value))return null;for(const key of keys){const n=(value as Record<string,unknown>)[key];if(typeof n==="number"&&Number.isFinite(n))return n}return null}
function fairySoulCount(value:unknown){return getNumeric(value,["total_collected","souls_collected","fairy_souls","count","unlocked"])}
function getSkillIconPath(key:string){return `/statixel/icons/skillicons/${key}icon.png`}
const FAIRY_SOUL_MAX = 267;
function formatDate(value:number|null){if(value===null)return "—"; return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(value));}
function getItemIconUrl(id:string|null){return id?"https://sky.shiiyu.moe/api/item/"+encodeURIComponent(id):null;}
const itemStatLabels: Record<string,string> = {damage:"DMG",strength:"STR",critDamage:"CD",critChance:"CC",health:"HP",defense:"DEF",intelligence:"INT",attackSpeed:"AS",ferocity:"Ferocity",speed:"SPD",magicFind:"MF",petLuck:"Pet Luck",abilityDamage:"Ability DMG",farmingFortune:"Farming Fortune",miningFortune:"Mining Fortune",miningSpeed:"Mining Speed",gemstoneFortune:"Gemstone Fortune",foragingFortune:"Foraging Fortune",foragingWisdom:"Foraging Wisdom",huntingFortune:"Hunting Fortune",huntingWisdom:"Hunting Wisdom",fishingSpeed:"Fishing Speed",seaCreatureChance:"Sea Creature Chance",coldResistance:"Cold Resistance",pristine:"Pristine"};
function formatItemStats(stats:Record<string,number>){return Object.entries(stats).filter(([key])=>itemStatLabels[key]).slice(0,5).map(([key,value])=>itemStatLabels[key]+" "+(value>0?"+":"")+(Number.isInteger(value)?value:value.toFixed(1)));}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
 const params=await searchParams; const username=params.username?.trim()??""; const profile=params.profile?.trim()||undefined; const activeTab=params.tab?.trim().toLowerCase()||"overview";
 if(!username)return <main className="profile-page"><div className="profile-page__background" aria-hidden="true"/><div className="profile-page__veil" aria-hidden="true"/><section className="search-page__panel"><p className="section-kicker">SkyBlock profile</p><h1>No profile selected.</h1><p>Search for a Minecraft username first.</p><Link className="search-page__button" href="/#search">Search a profile</Link></section></main>;
 try {
  const result=await buildNormalizedProfile({usernameOrUuid:username,requestedProfile:profile});
  const profileIcon=getProfileIconPath(result.profile.cuteName);
  const avatarUrl="https://mc-heads.net/avatar/"+result.identity.uuid+"/160";
  const skyblockLevel=getNumeric(result.otherProgression.leveling,["experience","xp","level"]);
  const skyblockLevelValue=skyblockLevel!==null&&skyblockLevel>100?Math.floor(skyblockLevel/100):skyblockLevel;
  const fairySouls=fairySoulCount(result.otherProgression.fairySoul); const skills=Object.entries(result.progression.skills);
  const averageSkillLevel=skills.length?skills.reduce((sum,[,skill])=>sum+skill.level,0)/skills.length:null;
  const equippedArmor=result.gear.armor.items;
  const equippedWeapon=result.gear.equippedWeapon;
  return <main className="profile-page"><div className="profile-page__background" aria-hidden="true"/><div className="profile-page__veil" aria-hidden="true"/>
   <nav className="profile-nav" aria-label="Profile navigation"><Link className="nav__brand" href="/#search" aria-label="Statixel home"><img className="nav__logo" src="/statixel/brand/statixellogowhitetransparent.png" alt=""/><span className="nav__wordmark">Statixel</span></Link><Link className="profile-nav__search" href="/#search">Search another profile</Link></nav>
   <section className="profile-content">
    <header className="profile-identity"><div className="profile-identity__avatar-wrap"><img className="profile-identity__avatar" src={avatarUrl} alt=""/></div><div className="profile-identity__main"><p className="section-kicker">SkyBlock profile</p><div className="profile-identity__name-row"><h1>{result.identity.username}</h1></div><div className="profile-identity__profile">{profileIcon?<img src={profileIcon} alt=""/>:null}<span>{result.profile.cuteName}</span>{result.profile.gameMode?<span className="profile-identity__mode">{result.profile.gameMode}</span>:null}</div><div className="profile-identity__joined">Joined SkyBlock {formatDate(result.profileCreatedAt)}</div></div><div className="profile-identity__actions"><Link className="profile-header__advisor" href="/advisor">Ask Vera</Link></div></header>
    <div className="profile-switcher">{result.profile.availableProfiles.map(item=>{const icon=getProfileIconPath(item.cuteName);return <Link className={item.id===result.profile.id?"profile-switcher__item profile-switcher__item--active":"profile-switcher__item"} href={{pathname:"/profile",query:{username:result.identity.username,profile:item.id}}} key={item.id}>{icon?<img className="profile-switcher__icon" src={icon} alt=""/>:null}{item.cuteName}</Link>})}</div>
    <nav className="profile-tabs" aria-label="Profile sections"><Link className={activeTab==="overview"?"profile-tabs__item profile-tabs__item--active":"profile-tabs__item"} href={{pathname:"/profile",query:{username:result.identity.username,profile:result.profile.id}}}>Overview</Link>{["Gear","Accessories","Pets","Inventory","Skills","Dungeons","Slayer","Minions","Bestiary","Collections","Crimson Isle","Rift","Misc"].map(tab=>{const key=tab.toLowerCase().replace(/\s+/g,"-");return <Link className={activeTab===key?"profile-tabs__item profile-tabs__item--active":"profile-tabs__item"} href={{pathname:"/profile",query:{username:result.identity.username,profile:result.profile.id,tab:key}}} key={tab}>{tab}</Link>})}</nav>

    {activeTab==="gear" ? <section className="profile-gear-page" aria-label="Gear">
     <div className="profile-page-heading"><div><p className="section-kicker">Loadouts & gear</p><h2>Gear</h2><p>See the armor, equipment, and weapons this profile has available, organized around how each loadout is used.</p></div></div>
     <section className="profile-gear-section" aria-labelledby="loadouts-title">
      <div className="profile-section-heading"><div><p className="section-kicker">Saved setups</p><h2 id="loadouts-title">Loadouts</h2></div><span>{Object.keys(result.gear.loadouts.names).length || Object.keys(result.gear.loadouts.armor.sets).length} available</span></div>
      <div className="profile-loadout-grid">
       {Object.entries(result.gear.loadouts.armor.sets).map(([setId,armorSet])=>{const name=result.gear.loadouts.names[setId]||"Loadout "+(Number(setId)+1);const equipmentSet=result.gear.loadouts.equipment.sets[setId]??{};const isActive=result.gear.loadouts.armor.equippedSet===Number(setId);const items=[...Object.values(armorSet),...Object.values(equipmentSet)];return <article className={isActive?"gear-loadout-card gear-loadout-card--active":"gear-loadout-card"} key={setId}>
        <header className="gear-loadout-card__header"><div><span className="profile-stat-card__label">Loadout {Number(setId)+1}</span><h3>{name}</h3></div>{isActive?<span className="gear-loadout-card__active">Equipped</span>:null}</header>
        <div className="gear-loadout-card__items">{items.map(item=>{const icon=getItemIconUrl(item.id);return <div className="gear-item" key={item.uuid??item.id??item.name}>{icon?<img src={icon} alt="" aria-hidden="true"/>:null}<div><strong>{item.name}</strong><small>{item.categories.includes("armor")?"Armor":"Equipment"}</small></div></div>})}</div>
       </article>})}
       {!Object.keys(result.gear.loadouts.armor.sets).length?<div className="gear-empty">No saved armor loadouts were returned for this profile.</div>:null}
      </div>
     </section>
     <section className="profile-gear-section" aria-labelledby="weapons-title">
      <div className="profile-section-heading"><div><p className="section-kicker">Arsenal</p><h2 id="weapons-title">Weaponry</h2></div><span>{result.gear.weapons.length} items</span></div>
      <div className="gear-item-grid">{result.gear.weapons.map(item=>{const icon=getItemIconUrl(item.id);const stats=formatItemStats(item.stats);return <article className="gear-item-card" key={item.uuid??item.id??item.name}>{icon?<img src={icon} alt="" aria-hidden="true"/>:null}<div><strong>{item.name}</strong><small>{[item.rarity?.replace("_"," "),item.categories.find(category=>category!=="weapon")].filter(Boolean).join(" · ")}</small>{stats.length?<p>{stats.join("  //  ")}</p>:null}</div></article>})}</div>
     </section>
     <section className="profile-gear-section" aria-labelledby="equipment-title">
      <div className="profile-section-heading"><div><p className="section-kicker">Profile equipment</p><h2 id="equipment-title">Equipment</h2></div><span>{result.gear.equipment.items.length} items</span></div>
      <div className="gear-item-grid">{result.gear.equipment.items.map(item=>{const icon=getItemIconUrl(item.id);const stats=formatItemStats(item.stats);return <article className="gear-item-card" key={item.uuid??item.id??item.name}>{icon?<img src={icon} alt="" aria-hidden="true"/>:null}<div><strong>{item.name}</strong><small>{item.rarity?.replace("_"," ")||"Equipment"}</small>{stats.length?<p>{stats.join("  //  ")}</p>:null}</div></article>})}</div>
     </section>
    </section> : OVERVIEW_PLACEHOLDER
   </section></main>;
 } catch(error){ const message=error instanceof AppError?error.message:"Unable to load this SkyBlock profile right now."; return <main className="profile-page"><div className="profile-page__background" aria-hidden="true"/><div className="profile-page__veil" aria-hidden="true"/><section className="search-page__panel search-page__panel--error"><p className="section-kicker">SkyBlock profile</p><h1>We couldn’t load this profile.</h1><p>{message}</p><Link className="search-page__button" href="/#search">Back to search</Link></section></main> }
}