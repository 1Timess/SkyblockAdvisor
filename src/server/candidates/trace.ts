import type { CandidateItem } from "../../schemas/catalog";
import type { ArmorLaneName, WeaponLaneName } from "../../schemas/candidates";
import type { MarketQuote } from "../../schemas/market";
import type { ProfileItem } from "../../schemas/items";
import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import { buildArmorLanes, collectOwnedItemIds } from "./armor";
import { prepareCandidate } from "./common";
import { buildWeaponLanes } from "./weapon";

const armorSlots = ["helmet", "chestplate", "leggings", "boots"] as const;
const armorStats = ["defense", "health", "strength", "critDamage", "intelligence", "speed"] as const satisfies readonly ArmorLaneName[];
const weaponTypes = ["sword", "bow", "wand", "fishing_rod"] as const;
const weaponStats = ["damage", "strength", "critDamage", "intelligence", "attackSpeed"] as const satisfies readonly Exclude<WeaponLaneName, "ability">[];

export type TraceExclusionStage = "NONE" | "CATEGORY_OR_DOMAIN" | "SLOT_OR_TYPE" | "CURRENT_PAIRING" | "PREPARE_CANDIDATE" | "LANE_NOMINATION" | "LANE_CAP" | "RAW_SCOPE";
export type RootCauseClassification = "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | null;

export interface CandidateCoverageTrace {
  catalog: ReturnType<typeof catalogSummary>;
  inferredDomain: "armor" | "weapon" | null;
  slotOrType: string | null;
  pairedCurrentItems: PairTrace[];
  consideredByBuilder: boolean;
  prepareCandidateSucceeded: boolean;
  nominatedLanes: string[];
  rawAdvisorPresence: boolean;
  firstExclusionStage: TraceExclusionStage;
  exclusionReason: string | null;
  rootCauseClassification: RootCauseClassification;
}

export interface PairTrace {
  currentItem: { id: string | null; name: string; categories: string[]; stats: ProfileItem["stats"] };
  compatibility: boolean;
  compatibilityReason: string;
  prepareCandidateResult: "CANDIDATE" | "NULL" | "NOT_REACHED";
  prepareCandidateNullReason: string | null;
  qualifyingLanesBeforeCap: string[];
  nominatedLanesAfterCap: string[];
}

export function traceCandidateCoverage(input: {
  item: CandidateItem;
  profile: NormalizedSkyBlockProfile;
  catalog: readonly CandidateItem[];
  quotes: ReadonlyMap<string, MarketQuote>;
  budgetCoins?: number;
}): CandidateCoverageTrace {
  const armorSlot = slotOf(input.item), weaponType = typeOf(input.item);
  const inferredDomain = input.item.categories.includes("armor") ? "armor" : input.item.categories.includes("weapon") ? "weapon" : null;
  const currentItems = inferredDomain === "armor"
    ? input.profile.gear.armor.items.filter(current => slotOf(current) === armorSlot)
    : inferredDomain === "weapon" ? input.profile.gear.weapons : [];
  const owned = collectOwnedItemIds(input.profile);
  const pairs = currentItems.map(current => tracePair({ ...input, current, inferredDomain, armorSlot, weaponType, owned }));
  const consideredByBuilder = inferredDomain === "armor" ? armorSlot !== null && pairs.length > 0
    : inferredDomain === "weapon" ? pairs.some(pair => pair.compatibility) : false;
  const compatible = pairs.filter(pair => pair.compatibility);
  const prepared = compatible.filter(pair => pair.prepareCandidateResult === "CANDIDATE");
  const nominatedLanes = [...new Set(pairs.flatMap(pair => pair.nominatedLanesAfterCap))];
  const rawAdvisorPresence = nominatedLanes.length > 0;
  const exclusion = exclusionDetails({ item: input.item, inferredDomain, armorSlot, weaponType, pairs, consideredByBuilder, compatible, prepared, rawAdvisorPresence });
  return { catalog: catalogSummary(input.item), inferredDomain, slotOrType: armorSlot ?? weaponType,
    pairedCurrentItems: pairs, consideredByBuilder, prepareCandidateSucceeded: prepared.length > 0,
    nominatedLanes, rawAdvisorPresence, ...exclusion };
}

export function catalogCoverageSummary(catalog: readonly CandidateItem[]) {
  const armor = catalog.filter(item => item.categories.includes("armor"));
  const weapons = catalog.filter(item => item.categories.includes("weapon"));
  return {
    armor: { total: armor.length, missingRecognizedSlot: armor.filter(item => slotOf(item) === null).length,
      bySlot: Object.fromEntries(armorSlots.map(slot => [slot, armor.filter(item => slotOf(item) === slot).length])) },
    weapons: { total: weapons.length, missingRecognizedSubtype: weapons.filter(item => typeOf(item) === null).length,
      bySubtype: Object.fromEntries(weaponTypes.map(type => [type, weapons.filter(item => typeOf(item) === type).length])) },
  };
}

function tracePair(input: {
  item: CandidateItem; current: ProfileItem; profile: NormalizedSkyBlockProfile; catalog: readonly CandidateItem[];
  quotes: ReadonlyMap<string, MarketQuote>; budgetCoins?: number; inferredDomain: "armor" | "weapon" | null;
  armorSlot: string | null; weaponType: string | null; owned: ReadonlySet<string>;
}): PairTrace {
  const current = { id: input.current.id, name: input.current.name, categories: input.current.categories, stats: input.current.stats };
  const compatible = input.inferredDomain === "armor" ? slotOf(input.current) === input.armorSlot
    : input.inferredDomain === "weapon" && input.current.categories.includes("weapon") && (typeOf(input.current) === null || typeOf(input.current) === input.weaponType);
  const compatibilityReason = input.inferredDomain === "armor"
    ? compatible ? `Both items use the ${input.armorSlot} slot.` : "Armor slots do not match."
    : compatible ? `Candidate subtype ${input.weaponType ?? "unrecognized"} matches baseline subtype ${typeOf(input.current) ?? "unrecognized"}.`
      : `Candidate subtype ${input.weaponType ?? "unrecognized"} does not match baseline subtype ${typeOf(input.current) ?? "unrecognized"}.`;
  if (!compatible || !input.inferredDomain) return { currentItem: current, compatibility: false, compatibilityReason,
    prepareCandidateResult: "NOT_REACHED", prepareCandidateNullReason: null, qualifyingLanesBeforeCap: [], nominatedLanesAfterCap: [] };
  const prepared = prepareCandidate(input.inferredDomain, input.item, input.profile, input.quotes,
    { budgetCoins: input.budgetCoins, ownedItemIds: input.owned, eligibilityMode: "ADVISOR_DISCOVERY" });
  const nullReason = prepared ? null : input.owned.has(input.item.id) ? "The exact candidate ID is already owned." : "prepareCandidate returned null for an unclassified reason.";
  if (!prepared) return { currentItem: current, compatibility: true, compatibilityReason,
    prepareCandidateResult: "NULL", prepareCandidateNullReason: nullReason, qualifyingLanesBeforeCap: [], nominatedLanesAfterCap: [] };
  const qualifyingLanesBeforeCap = input.inferredDomain === "armor" ? qualifyingArmorLanes(input.item, input.current) : qualifyingWeaponLanes(input.item, input.current);
  const output = input.inferredDomain === "armor"
    ? buildArmorLanes({ current: input.current, catalog: input.catalog, profile: input.profile, quotes: input.quotes, budgetCoins: input.budgetCoins, eligibilityMode: "ADVISOR_DISCOVERY" }).lanes
    : buildWeaponLanes({ current: input.current, catalog: input.catalog, profile: input.profile, quotes: input.quotes, budgetCoins: input.budgetCoins, eligibilityMode: "ADVISOR_DISCOVERY" }).lanes;
  const nominatedLanesAfterCap = Object.entries(output).filter(([, candidates]) => candidates.some(candidate => candidate.id === input.item.id)).map(([lane]) => lane);
  return { currentItem: current, compatibility: true, compatibilityReason, prepareCandidateResult: "CANDIDATE", prepareCandidateNullReason: null,
    qualifyingLanesBeforeCap, nominatedLanesAfterCap };
}

function qualifyingArmorLanes(candidate: CandidateItem, current: ProfileItem) {
  return armorStats.filter(stat => candidate.stats[stat] !== undefined && (current.stats[stat] === undefined || candidate.stats[stat]! > current.stats[stat]!));
}

function qualifyingWeaponLanes(candidate: CandidateItem, current: ProfileItem) {
  const lanes: string[] = weaponStats.filter(stat => candidate.stats[stat] !== undefined && (current.stats[stat] === undefined || candidate.stats[stat]! > current.stats[stat]!));
  if (candidate.abilityText.length > 0) lanes.push("ability");
  return lanes;
}

function exclusionDetails(input: {
  item: CandidateItem; inferredDomain: "armor" | "weapon" | null; armorSlot: string | null; weaponType: string | null;
  pairs: PairTrace[]; consideredByBuilder: boolean; compatible: PairTrace[]; prepared: PairTrace[]; rawAdvisorPresence: boolean;
}): Pick<CandidateCoverageTrace, "firstExclusionStage" | "exclusionReason" | "rootCauseClassification"> {
  if (!input.inferredDomain) return { firstExclusionStage: "CATEGORY_OR_DOMAIN", exclusionReason: "Catalog categories do not identify the item as armor or weapon.", rootCauseClassification: "C" };
  if ((input.inferredDomain === "armor" && !input.armorSlot) || (input.inferredDomain === "weapon" && !input.weaponType)) {
    return { firstExclusionStage: "SLOT_OR_TYPE", exclusionReason: `Catalog categories do not provide a recognized ${input.inferredDomain === "armor" ? "armor slot" : "weapon subtype"}.`, rootCauseClassification: "B" };
  }
  if (!input.pairs.length) return { firstExclusionStage: "CURRENT_PAIRING", exclusionReason: "There is no current item baseline for the required slot or domain.", rootCauseClassification: "D" };
  if (!input.compatible.length) return { firstExclusionStage: "CURRENT_PAIRING", exclusionReason: "No current weapon baseline has a compatible recognized subtype.", rootCauseClassification: "D" };
  if (!input.prepared.length) {
    const owned = input.compatible.some(pair => pair.prepareCandidateNullReason?.includes("already owned"));
    return { firstExclusionStage: "PREPARE_CANDIDATE", exclusionReason: input.compatible.map(pair => pair.prepareCandidateNullReason).find(Boolean) ?? "Preparation returned null.", rootCauseClassification: owned ? "F" : "G" };
  }
  if (input.prepared.every(pair => pair.qualifyingLanesBeforeCap.length === 0)) {
    return { firstExclusionStage: "LANE_NOMINATION", exclusionReason: input.inferredDomain === "armor"
      ? "No supported armor stat is known and greater than the paired current item. Armor set-bonus text does not nominate candidates."
      : "No supported weapon stat improves on a compatible baseline and no ability text is present.", rootCauseClassification: "E" };
  }
  if (input.prepared.some(pair => pair.qualifyingLanesBeforeCap.length > 0) && !input.rawAdvisorPresence) {
    return { firstExclusionStage: "LANE_CAP", exclusionReason: "The item qualifies before ranking but does not enter any capped top-six lane.", rootCauseClassification: "I" };
  }
  if (!input.rawAdvisorPresence) return { firstExclusionStage: "RAW_SCOPE", exclusionReason: "The item was lane-nominated but did not enter the raw advisor scope.", rootCauseClassification: "H" };
  return { firstExclusionStage: "NONE", exclusionReason: null, rootCauseClassification: null };
}

function catalogSummary(item: CandidateItem) {
  return { itemId: item.id, displayName: item.name, rarity: item.rarity, categories: item.categories, stats: item.stats,
    abilityText: item.abilityText, setBonusText: item.setBonusText, requirements: item.requirements,
    unparsedRequirementText: item.unparsedRequirementText, marketKey: item.marketKey, sources: item.sources,
    slotIndicator: slotOf(item), weaponTypeIndicator: typeOf(item) };
}

function slotOf(item: Pick<ProfileItem | CandidateItem, "categories">) { return armorSlots.find(slot => item.categories.includes(slot)) ?? null; }
function typeOf(item: Pick<ProfileItem | CandidateItem, "categories">) { return weaponTypes.find(type => item.categories.includes(type)) ?? null; }
