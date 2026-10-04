import Link from "next/link";
import { buildNormalizedProfile } from "@/server/skyblock/profile/build-normalized-profile";
import { AppError } from "@/server/errors";
import { getProfileIconPath } from "@/lib/profile-icons";
import type { ProfileItem } from "@/schemas/items";

type ProfilePageProps = { searchParams: Promise<{ username?: string; profile?: string; tab?: string; pet?: string }> };
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
const accessoryMpByRarity: Record<string,number> = {common:3,uncommon:5,rare:8,epic:12,legendary:16,mythic:22,special:3,very_special:5};
function accessoryMp(item:{id:string|null;rarity:string|null}){return item.id==="HEGEMONY_ARTIFACT"?(accessoryMpByRarity[item.rarity??""]??0)*2:item.id==="RIFT_PRISM"?11:(accessoryMpByRarity[item.rarity??""]??0);}
function accessoryRarityLabel(rarity:string|null){return rarity?rarity.replace("_"," "):"Unknown";}
function rarityClass(rarity:string|null){return rarity?"rarity-"+rarity:"rarity-unknown";}
function formatPrice(value:number|null){return value===null?"Price unavailable":formatCoins(value);}
function upgradeEfficiency(price:number|null,mp:number){return price!==null&&mp>0?price/mp:null;}\nfunction petRarityLabel(rarity:string|null){return rarity?rarity.replace(/_/g," "):"Unknown";}\nfunction petRarityRank(rarity:string|null){const ranks:Record<string,number>={common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5,special:6,very_special:7};return rarity?(ranks[rarity]??-1):-1;}\nfunction petIconUrl(type:string){return getItemIconUrl("PET_"+type);}\nfunction formatPetHeldItem(value:string|null){if(!value)return null;return value.replace(/^PET_ITEM_/,"").replace(/_/g," ").replace(/\\b\\w/g,char=>char.toUpperCase());}\nfunction petSortRank(pet:{active:boolean;level:number|null;effectiveRarity:string|null}){return (pet.active?1000000:0)+(pet.level??0)*1000+petRarityRank(pet.effectiveRarity);}\n
const armorSlotOrder = ["helmet","chestplate","leggings","boots"];
function sortArmorItems<T extends Pick<ProfileItem, "categories">>(items: readonly T[]): T[] {
 return [...items].sort((a,b)=>{
  const slot=(item:T)=>armorSlotOrder.findIndex(key=>item.categories.includes(key));
  return (slot(a)<0?99:slot(a))-(slot(b)<0?99:slot(b));
 });
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
 const params=await searchParams; const username=params.username?.trim()??""; const profile=params.profile?.trim()||undefined; const activeTab=params.tab?.trim().toLowerCase()||"overview"; const selectedPetParam=params.pet?.trim()||undefined;
 if(!username)return <main className="profile-page"><div className="profile-page__background" aria-hidden="true"/><div className="profile-page__veil" aria-hidden="true"/><section className="search-page__panel"><p className="section-kicker">SkyBlock profile</p><h1>No profile selected.</h1><p>Search for a Minecraft username first.</p><Link className="search-page__button" href="/#search">Search a profile</Link></section></main>;
 try {
  const result=await buildNormalizedProfile({usernameOrUuid:username,requestedProfile:profile,requestedTab:activeTab,includeAccessoryPrices:activeTab==="accessories"});
  const profileIcon=getProfileIconPath(result.profile.cuteName);
  const avatarUrl="https://mc-heads.net/avatar/"+result.identity.uuid+"/160";
  const skyblockLevel=getNumeric(result.otherProgression.leveling,["experience","xp","level"]);
  const skyblockLevelValue=skyblockLevel!==null&&skyblockLevel>100?Math.floor(skyblockLevel/100):skyblockLevel;
  const fairySouls=fairySoulCount(result.otherProgression.fairySoul); const skills=Object.entries(result.progression.skills);
  const averageSkillLevel=skills.length?skills.reduce((sum,[,skill])=>sum+skill.level,0)/skills.length:null;
  const equippedArmor=sortArmorItems(result.gear.armor.items);
  const equippedWeapon=result.gear.equippedWeapon;
  return <main className="profile-page"><div className="profile-page__background" aria-hidden="true"/><div className="profile-page__veil" aria-hidden="true"/>
   <nav className="profile-nav" aria-label="Profile navigation"><Link className="nav__brand" href="/#search" aria-label="Statixel home"><img className="nav__logo" src="/statixel/brand/statixellogowhitetransparent.png" alt=""/><span className="nav__wordmark">Statixel</span></Link><Link className="profile-nav__search" href="/#search">Search another profile</Link></nav>
   <section className="profile-content">
    <header className="profile-identity"><div className="profile-identity__avatar-wrap"><img className="profile-identity__avatar" src={avatarUrl} alt=""/></div><div className="profile-identity__main"><p className="section-kicker">SkyBlock profile</p><div className="profile-identity__name-row"><h1>{result.identity.username}</h1></div><div className="profile-identity__profile">{profileIcon?<img src={profileIcon} alt=""/>:null}<span>{result.profile.cuteName}</span>{result.profile.gameMode?<span className="profile-identity__mode">{result.profile.gameMode}</span>:null}</div><div className="profile-identity__joined">Joined SkyBlock {formatDate(result.profileCreatedAt)}</div></div><div className="profile-identity__actions"><Link className="profile-header__advisor" href="/advisor">Ask Vera</Link></div></header>
    <div className="profile-switcher">{result.profile.availableProfiles.map(item=>{const icon=getProfileIconPath(item.cuteName);return <Link className={item.id===result.profile.id?"profile-switcher__item profile-switcher__item--active":"profile-switcher__item"} href={{pathname:"/profile",query:{username:result.identity.username,profile:item.id}}} key={item.id}>{icon?<img className="profile-switcher__icon" src={icon} alt=""/>:null}{item.cuteName}</Link>})}</div>
    <nav className="profile-tabs" aria-label="Profile sections"><Link className={activeTab==="overview"?"profile-tabs__item profile-tabs__item--active":"profile-tabs__item"} href={{pathname:"/profile",query:{username:result.identity.username,profile:result.profile.id}}}>Overview</Link>{["Gear","Accessories","Pets","Inventory","Skills","Dungeons","Slayer","Minions","Bestiary","Collections","Crimson Isle","Rift","Misc"].map(tab=>{const key=tab.toLowerCase().replace(/\s+/g,"-");return <Link className={activeTab===key?"profile-tabs__item profile-tabs__item--active":"profile-tabs__item"} href={{pathname:"/profile",query:{username:result.identity.username,profile:result.profile.id,tab:key}}} key={tab}>{tab}</Link>})}</nav>

    {activeTab==="pets" ? (<section className="profile-pets-page" aria-label="Pets">
     {(() => {
       const pets=[...result.pets.owned].sort((a,b)=>petSortRank(b)-petSortRank(a));
       const highestLevel=pets.reduce((best,pet)=>Math.max(best,pet.level??0),0);
       const highestRarity=pets.reduce((best,pet)=>petRarityRank(pet.effectiveRarity)>petRarityRank(best)?pet.effectiveRarity:best,null as string|null);
       const totalLevels=pets.reduce((sum,pet)=>sum+(pet.level??0),0);
       const selectedIndex=selectedPetParam?pets.findIndex((pet,index)=>(pet.uuid&&pet.uuid===selectedPetParam)||String(index)===selectedPetParam):-1;
       const selected=selectedIndex>=0?pets[selectedIndex]:(result.pets.activePet??pets[0]??null);
       const selectedKey=selected?.uuid??(selected?String(pets.indexOf(selected)):"");
       const baseQuery={pathname:"/profile",query:{username:result.identity.username,profile:result.profile.id,tab:"pets"}};
       return <>
        <div className="profile-page-heading"><div><p className="section-kicker">Pet collection</p><h2>Pets</h2><p>View the pets this profile owns, their progression, held items, and calculated effects.</p></div></div>
        <section className="profile-pets-summary" aria-label="Pet summary">
         <article className="pet-summary-card pet-summary-card--blue"><span className="profile-stat-card__label">Pets Owned</span><strong>{pets.length}</strong><p>Collected on this profile</p></article>
         <article className="pet-summary-card pet-summary-card--purple"><span className="profile-stat-card__label">Highest Level</span><strong>{highestLevel||"—"}</strong><p>{pets.find(pet=>pet.level===highestLevel)?.name??"No leveled pets"}</p></article>
         <article className="pet-summary-card pet-summary-card--gold"><span className="profile-stat-card__label">Highest Rarity</span><strong className={rarityClass(highestRarity)}>{highestRarity?petRarityLabel(highestRarity):"—"}</strong><p>Highest effective pet rarity</p></article>
         <article className="pet-summary-card pet-summary-card--green"><span className="profile-stat-card__label">Total Pet Levels</span><strong>{totalLevels||"—"}</strong><p>Combined levels across owned pets</p></article>
        </section>
        <section className="profile-pets-workspace" aria-labelledby="owned-pets-title">
         <div className="profile-pets-list">
          <div className="profile-section-heading"><div><p className="section-kicker">Collection</p><h2 id="owned-pets-title">Owned Pets</h2></div><span>{pets.length} total</span></div>
          <div className="pet-card-grid">
           {pets.length ? pets.map((pet,index)=>{
             const icon=petIconUrl(pet.type); const heldIcon=getItemIconUrl(pet.heldItem); const key=pet.uuid??String(index); const active=(selected?.uuid===pet.uuid && pet.uuid!==null)||selectedKey===key;
             const progress=pet.progress===null?0:Math.max(0,Math.min(1,pet.progress));
             return <Link className={active?"pet-card pet-card--selected":"pet-card"} href={{...baseQuery,query:{...baseQuery.query,pet:key}}} key={key}>
              <div className="pet-card__icon-wrap">{icon?<img className="pet-card__icon" src={icon} alt="" aria-hidden="true"/>:<span className="pet-card__icon-fallback">✦</span>}</div>
              <div className="pet-card__body">
               <div className="pet-card__heading"><div><strong>{pet.name}</strong><span className={rarityClass(pet.effectiveRarity)}>{petRarityLabel(pet.effectiveRarity)}</span></div>{pet.active?<span className="pet-card__active">Active</span>:null}</div>
               <div className="pet-card__level"><span>Lv. {pet.level??"—"}{pet.maxLevel?" / "+pet.maxLevel:""}</span><span>{pet.level!==null&&pet.maxLevel&&pet.level>=pet.maxLevel?"MAX":Math.round(progress*100)+"%"}</span></div>
               <div className="pet-card__track"><span style={{width:(pet.level!==null&&pet.maxLevel&&pet.level>=pet.maxLevel?100:progress*100)+"%"}}/></div>
               <div className="pet-card__meta">{heldIcon?<img src={heldIcon} alt="" aria-hidden="true"/>:null}<span>{formatPetHeldItem(pet.heldItem)??"No held item"}</span></div>
              </div>
             </Link>;
           }) : <div className="pet-empty">No pets were returned for this profile.</div>}
          </div>
         </div>
         {selected ? <aside className="pet-detail-panel" aria-label={"Selected pet: "+selected.name}>
          <div className="pet-detail-panel__hero">
           <div className="pet-detail-panel__icon-wrap">{petIconUrl(selected.type)?<img src={petIconUrl(selected.type)!} alt="" aria-hidden="true"/>:<span>✦</span>}</div>
           <div><span className={rarityClass(selected.effectiveRarity)}>{petRarityLabel(selected.effectiveRarity)}</span><h3>{selected.name}</h3><p>{selected.active?"Currently active pet":"Owned pet"}</p></div>
          </div>
          <div className="pet-detail-panel__level"><div><strong>Lvl {selected.level??"—"}</strong><span>{selected.maxLevel&&selected.level!==null&&selected.level>=selected.maxLevel?"MAX LEVEL":selected.maxLevel?selected.maxLevel+" max level":"Level unavailable"}</span></div><b>{selected.level!==null&&selected.maxLevel?Math.round(Math.max(0,Math.min(1,selected.progress??0))*100)+"%":"—"}</b></div>
          <div className="pet-detail-panel__track"><span style={{width:(selected.level!==null&&selected.maxLevel&&selected.level>=selected.maxLevel?100:Math.max(0,Math.min(1,selected.progress??0))*100)+"%"}}/></div>
          <div className="pet-detail-panel__section"><p className="section-kicker">Pet Item</p>
           {selected.heldItem ? <div className="pet-detail-panel__held">{getItemIconUrl(selected.heldItem)?<img src={getItemIconUrl(selected.heldItem)!} alt="" aria-hidden="true"/>:null}<div><strong>{formatPetHeldItem(selected.heldItem)}</strong><span>Held item</span></div></div> : <p className="pet-detail-panel__muted">No pet item equipped.</p>}
          </div>
          <div className="pet-detail-panel__section"><p className="section-kicker">Derived Stats</p>
           {Object.keys(selected.stats).length ? <div className="pet-detail-panel__stats">{Object.entries(selected.stats).map(([key,value])=><div key={key}><span>{itemStatLabels[key]??key}</span><strong>{value>0?"+":""}{Number.isInteger(value)?value:value.toFixed(1)}</strong></div>)}</div> : <p className="pet-detail-panel__muted">No derived pet stats are available from the current profile data.</p>}
          </div>
          <div className="pet-detail-panel__section"><p className="section-kicker">Pet Progression</p>
           <div className="pet-detail-panel__facts"><div><span>Experience</span><strong>{formatCoins(selected.xp)}</strong></div><div><span>XP to next level</span><strong>{selected.xpForNext===null?"—":formatCoins(selected.xpForNext)}</strong></div><div><span>Candy Used</span><strong>{selected.candyUsed}</strong></div><div><span>Skin</span><strong>{selected.skin??"Default"}</strong></div></div>
          </div>
          {selected.abilityLore.length ? <div className="pet-detail-panel__section"><p className="section-kicker">Abilities</p><div className="pet-detail-panel__lore">{selected.abilityLore.map((line,index)=><p key={index}>{line}</p>)}</div></div>:null}
         </aside> : <aside className="pet-detail-panel pet-detail-panel--empty"><p className="section-kicker">Pet collection</p><h3>No pet selected</h3><p>This profile does not currently have any pets to display.</p></aside>}
        </section>
       </>;
     })()}
    </section>) : (activeTab==="accessories" ? (<section className="profile-accessories-page" aria-label="Accessories">
     <div className="profile-page-heading"><div><p className="section-kicker">Accessory bag</p><h2>Accessories</h2><p>Owned accessories are ordered from lowest Magical Power contribution to highest, keeping the pieces most likely to be replaced at the top.</p></div></div>
     <section className="profile-accessories-summary">
      <article className="accessory-summary-card"><span className="profile-stat-card__label">Magical Power</span><strong>{result.accessories.magicalPower.total}</strong><p>{result.accessories.magicalPower.accessories} from accessories{result.accessories.magicalPower.riftPrism ? " · "+result.accessories.magicalPower.riftPrism+" from Rift Prism" : ""}</p></article>
      <article className="accessory-summary-card"><span className="profile-stat-card__label">Owned</span><strong>{result.accessories.owned.filter(item=>item.active).length}</strong><p>Active accessory contributions</p></article>
      <article className="accessory-summary-card"><span className="profile-stat-card__label">Selected Power</span><strong>{result.accessories.selectedPower ?? "—"}</strong><p>Current accessory power</p></article>
      <article className="accessory-summary-card"><span className="profile-stat-card__label">Highest Magical Power</span><strong>{result.accessories.highestMagicalPower ?? "—"}</strong><p>Highest power reached</p></article>
     </section>
     <section className="profile-gear-section" aria-labelledby="owned-accessories-title">
      <div className="profile-section-heading"><div><p className="section-kicker">Collection</p><h2 id="owned-accessories-title">Owned Accessories</h2></div><span>{result.accessories.owned.filter(item=>item.active).length} active</span></div>
      <div className="accessory-grid">
       {[...result.accessories.owned].filter(item=>item.active).sort((a,b)=>{
         const amp=accessoryMp(a), bmp=accessoryMp(b);
         return amp-bmp || (a.rarity?Object.keys(accessoryMpByRarity).indexOf(a.rarity):99)-(b.rarity?Object.keys(accessoryMpByRarity).indexOf(b.rarity):99) || a.name.localeCompare(b.name);
       }).map(item=>{const icon=getItemIconUrl(item.id);const mp=accessoryMp(item);return <article className="accessory-card" key={item.uuid??item.id??item.name}>
        {icon?<img src={icon} alt="" aria-hidden="true"/>:null}<div className="accessory-card__body"><div className="accessory-card__top"><div><strong>{item.name}</strong><small className={rarityClass(item.rarity)}>{accessoryRarityLabel(item.rarity)}</small></div><span className={rarityClass(item.rarity)}>{mp} MP</span></div>{formatItemStats(item.stats).length?<p className="accessory-card__stats">{formatItemStats(item.stats).join("  //  ")}</p>:null}</div>
       </article>})}
      </div>
     </section>
     <section className="profile-gear-section" aria-labelledby="accessory-upgrades-title">
      <div className="profile-section-heading"><div><p className="section-kicker">Progression</p><h2 id="accessory-upgrades-title">Next Upgrades</h2></div><span>{result.accessories.upgrades.length} known</span></div>
      <div className="accessory-upgrade-grid">{[...result.accessories.upgrades].sort((a,b)=>{const amp=accessoryMp(a),bmp=accessoryMp(b),ae=upgradeEfficiency(a.price,amp),be=upgradeEfficiency(b.price,bmp);if(ae===null&&be!==null)return 1;if(ae!==null&&be===null)return -1;return (ae??Number.POSITIVE_INFINITY)-(be??Number.POSITIVE_INFINITY);}).slice(0,24).map(item=>{const icon=getItemIconUrl(item.id);const mp=accessoryMp(item);const efficiency=upgradeEfficiency(item.price,mp);return <article className={`accessory-upgrade ${rarityClass(item.rarity)}`} key={item.id}><div className="accessory-upgrade__main">{icon?<img src={icon} alt="" aria-hidden="true"/>:null}<div><strong>{item.name}</strong><span className={rarityClass(item.rarity)}>{accessoryRarityLabel(item.rarity)}</span></div></div><div className="accessory-upgrade__metrics"><b>{mp} MP</b><span>{formatPrice(item.price)}</span>{efficiency!==null?<small>{formatCoins(efficiency)} coins / MP</small>:<small>Market price unavailable</small>}</div></article>})}</div>
     </section>
    </section>) : (activeTab==="gear" ? (<section className="profile-gear-page" aria-label="Gear">
     <div className="profile-page-heading"><div><p className="section-kicker">Loadouts & gear</p><h2>Gear</h2><p>See the armor, equipment, and weapons this profile has available, organized around how each loadout is used.</p></div></div>
     <section className="profile-gear-section" aria-labelledby="loadouts-title">
      <div className="profile-section-heading"><div><p className="section-kicker">Saved setups</p><h2 id="loadouts-title">Loadouts</h2></div><span>{result.gear.loadouts.ids.length} available</span></div>
      <div className="profile-loadout-grid">
       {result.gear.loadouts.ids.map(setId=>{const armorSet=result.gear.loadouts.armor.sets[setId]??{};const equipmentSet=result.gear.loadouts.equipment.sets[setId]??{};const name=result.gear.loadouts.names[setId]||"Loadout "+setId;const isActive=result.gear.loadouts.armor.equippedSet===Number(setId);const storedArmor=sortArmorItems(Object.values(armorSet));const storedEquipment=Object.values(equipmentSet);const effectiveArmor=isActive&&storedArmor.length===0?equippedArmor:storedArmor;const effectiveEquipment=isActive&&storedEquipment.length===0?result.gear.equipment.items:storedEquipment;const effectiveItems=[...effectiveArmor,...effectiveEquipment];return <article className={isActive?"gear-loadout-card gear-loadout-card--active":"gear-loadout-card"} key={setId}>
        <header className="gear-loadout-card__header"><div><span className="profile-stat-card__label">Loadout {setId}</span><h3>{name}</h3></div>{isActive?<span className="gear-loadout-card__active">Equipped</span>:null}</header>
        <div className="gear-loadout-card__items">{effectiveItems.length?effectiveItems.map(item=>{const icon=getItemIconUrl(item.id);const stats=formatItemStats(item.stats);return <div className="gear-item" key={item.uuid??item.id??item.name}>{icon?<img src={icon} alt="" aria-hidden="true"/>:null}<div><strong>{item.name}</strong><small>{item.categories.includes("armor")?"Armor":"Equipment"}{stats.length?" · "+stats.join(" // "):""}</small></div></div>}):<div className="gear-loadout-card__empty">{isActive?"Uses currently equipped gear":"No armor or equipment assigned"}</div>}</div>
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
    </section>) : (<>
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
    </section> </>))}
   </section></main>;
 } catch(error){ const message=error instanceof AppError?error.message:"Unable to load this SkyBlock profile right now."; return <main className="profile-page"><div className="profile-page__background" aria-hidden="true"/><div className="profile-page__veil" aria-hidden="true"/><section className="search-page__panel search-page__panel--error"><p className="section-kicker">SkyBlock profile</p><h1>We couldn’t load this profile.</h1><p>{message}</p><Link className="search-page__button" href="/#search">Back to search</Link></section></main> }
}