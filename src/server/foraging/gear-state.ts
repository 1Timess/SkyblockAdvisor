import type { NormalizedSkyBlockProfile } from "../../schemas/normalized-profile";
import type { ProfileItem } from "../../schemas/items";

const foragingIdPatterns = [
  /^(?:SERIOUSLY_DAMAGED_AXE|FIG_HEW|FIGSTONE_SPLITTER|HELIX_CHOPPER)$/,
  /^(?:FIG|HELIX)_(?:HELMET|CHESTPLATE|LEGGINGS|BOOTS)$/,
  /^(?:DAVID_CLOAK|DAVIDS_CLOAK|HONEYCOMB_NECKLACE|VEILSHROOM_BRACELET|SAFARI_BELT)$/,
] as const;
const foragingText = /\b(?:Foraging Fortune|Foraging Wisdom|Sweep|Galatea|Moonglade|Torrhus|Tree Gift|Axe Ability|Fig Log|Mangrove Log|Helix Log)\b/i;

export function isForagingItem(item: ProfileItem) {
  return !!item.id && (foragingIdPatterns.some(pattern => pattern.test(item.id!))
    || item.categories.some(category => category === "axe" || category === "foraging_tool")
    || [...item.lore, ...item.abilityText, ...item.setBonusText].some(line => foragingText.test(line)));
}

export function indexForagingGear(profile: NormalizedSkyBlockProfile) {
  const visible = uniqueItems(profile.inventoryItems.filter(isForagingItem));
  const armorLoadouts = matchingLoadouts(profile.gear.loadouts.armor.sets);
  const equipmentLoadouts = matchingLoadouts(profile.gear.loadouts.equipment.sets);
  const equippedArmor = equippedLoadout(profile.gear.loadouts.armor.equippedSet, armorLoadouts);
  const equippedEquipment = equippedLoadout(profile.gear.loadouts.equipment.equippedSet, equipmentLoadouts);
  const pets = profile.pets.owned.filter(pet => petRelevant(pet.name, pet.type, pet.stats, pet.abilityLore));
  return {
    visible: visible.map(observedItem),
    loadouts: { armor: armorLoadouts, equipment: equipmentLoadouts },
    equipped: { armor: equippedArmor, equipment: equippedEquipment },
    pets: pets.map(pet => ({ type: pet.type, name: pet.name, rarity: pet.rarity, level: pet.level,
      heldItem: pet.heldItem, stats: pet.stats, abilityLore: pet.abilityLore })),
    note: "Inventory presence does not establish equipped state. Equipped armor/equipment is only reported when the loadout API identifies an equipped set.",
  };
}

function matchingLoadouts(sets: Record<string, Record<string, ProfileItem>>) {
  return Object.fromEntries(Object.entries(sets).flatMap(([set, slots]) => {
    const relevant = Object.fromEntries(Object.entries(slots).filter(([, item]) => isForagingItem(item)).map(([slot, item]) => [slot, observedItem(item)]));
    return Object.keys(relevant).length ? [[set, relevant]] : [];
  }));
}
function equippedLoadout(set: number | null, indexed: ReturnType<typeof matchingLoadouts>) {
  if (set === null) return null;
  return indexed[String(set)] ?? null;
}
function observedItem(item: ProfileItem) {
  return { id: item.id, name: item.name, rarity: item.rarity, categories: item.categories, source: item.source,
    reforge: item.reforge, enchantments: item.enchantments, stars: item.stars, recombobulated: item.recombobulated,
    stats: item.stats, gemstones: item.gemstones ?? null, foragingState: item.foragingState ?? null, abilityText: item.abilityText, setBonusText: item.setBonusText,
    mechanicLore: item.lore.filter(line => foragingText.test(line)).slice(0, 12) };
}
function uniqueItems(items: readonly ProfileItem[]) {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.uuid ?? `${item.source}:${item.id ?? item.name}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
function petRelevant(name: string, type: string, stats: Record<string, number>, lore: readonly string[]) {
  return /(?:frog|sloth|monkey|ocelot|giraffe)/i.test(`${name} ${type}`)
    || Object.keys(stats).some(key => /forag|sweep/i.test(key))
    || lore.some(line => foragingText.test(line));
}
