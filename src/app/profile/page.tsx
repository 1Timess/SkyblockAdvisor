import Link from "next/link";
import { buildNormalizedProfile } from "@/server/skyblock/profile/build-normalized-profile";
import { AppError } from "@/server/errors";
import { getProfileIconPath } from "@/lib/profile-icons";

type ProfilePageProps = { searchParams: Promise<{ username?: string; profile?: string }> };
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
 const params=await searchParams; const username=params.username?.trim()??""; const profile=params.profile?.trim()||undefined;
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
    <nav className="profile-tabs" aria-label="Profile sections"><span className="profile-tabs__item profile-tabs__item--active">Overview</span>{["Gear","Accessories","Pets","Inventory","Skills","Dungeons","Slayer","Minions","Bestiary","Collections","Crimson Isle","Rift","Misc"].map(tab=><span className="profile-tabs__item" key={tab}>{tab}</span>)}</nav>
    <section className="profile-overview-stats" aria-label="Profile summary">
     <article className="profile-stat-card profile-stat-card--level"><span className="profile-stat-card__label">SkyBlock Level</span><strong>{skyblockLevelValue??"—"}</strong><p>Overall profile progression</p></article>
     <article className="profile-stat-card profile-stat-card--networth"><span className="profile-stat-card__label">Purse</span><strong>{formatCoins(result.economy.purse)}</strong><p>Coins currently held</p></article>
     <article className="profile-stat-card profile-stat-card--bank"><span className="profile-stat-card__label">Bank</span><strong>{formatCoins(result.economy.bank)}</strong><p>Profile bank balance</p></article>
     <article className="profile-stat-card profile-stat-card--souls"><span className="profile-stat-card__label">Fairy Souls</span><strong>{fairySouls!==null ? `${fairySouls}/${FAIRY_SOUL_MAX}` : "—"}</strong><p>Collected on this profile</p></article>
     <article className="profile-stat-card profile-stat-card--mp"><span className="profile-stat-card__label">Magical Power</span><strong>{result.accessories.magicalPower.total}</strong><p>Current profile MP</p></article>
     <article className="profile-stat-card profile-stat-card--average"><span className="profile-stat-card__label">Average Skill Level</span><strong>{averageSkillLevel!==null?averageSkillLevel.toFixed(2):"—"}</strong><p>Across tracked skills</p></article>
    </section>
    <section className="profile-skills-card" aria-labelledby="profile-skills-title"><div className="profile-section-heading"><div><p className="section-kicker">Progression</p><h2 id="profile-skills-title">Skills</h2></div><span>{skills.length} tracked</span></div><div className="profile-skills-grid">{skills.map(([key,skill])=><div className="profile-skill" key={key}><div className="profile-skill__heading"><span className="profile-skill__name"><img src={getSkillIconPath(key)} alt="" aria-hidden="true"/><span>{skillLabels[key]??key}</span></span><strong>{skill.level}</strong></div><div className="profile-skill__track"><span style={{width:(Math.round(skill.progress*100))+"%"}}/></div><div className="profile-skill__meta"><span>{skill.maxed?"Maxed":Math.round(skill.progress*100)+"% to next level"}</span><span>Lv. {skill.level}/{skill.maxLevel}</span></div></div>)}</div></section>
    <section className="profile-loadout" aria-label="Currently equipped gear">
     <div className="profile-loadout__armor"><span className="profile-stat-card__label">Equipped Armor</span><div className="profile-loadout__items">{equippedArmor.map(item=>{const icon=getItemIconUrl(item.id);const stats=formatItemStats(item.stats);return <div className="profile-loadout__item" key={item.uuid??item.id??item.name}>{icon?<img src={icon} alt="" aria-hidden="true"/>:null}<div><span>{item.name}</span>{stats.length?<small>{stats.join("  //  ")}</small>:null}</div></div>})}</div></div>
     <div className="profile-loadout__weapon"><span className="profile-stat-card__label">Held Weapon</span>{equippedWeapon?<div className="profile-loadout__weapon-item"><img src={getItemIconUrl(equippedWeapon.id)??""} alt="" aria-hidden="true"/><div><strong>{equippedWeapon.name}</strong>{formatItemStats(equippedWeapon.stats).length?<small>{formatItemStats(equippedWeapon.stats).join("  //  ")}</small>:null}</div></div>:<strong>—</strong>}</div>
    </section>
   </section></main>;
 } catch(error){ const message=error instanceof AppError?error.message:"Unable to load this SkyBlock profile right now."; return <main className="profile-page"><div className="profile-page__background" aria-hidden="true"/><div className="profile-page__veil" aria-hidden="true"/><section className="search-page__panel search-page__panel--error"><p className="section-kicker">SkyBlock profile</p><h1>We couldn’t load this profile.</h1><p>{message}</p><Link className="search-page__button" href="/#search">Back to search</Link></section></main> }
}