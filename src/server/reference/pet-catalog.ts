import type { CandidateItem } from "../../schemas/catalog";
import type { ItemRarity } from "../../schemas/items";
import { extractStats } from "../skyblock/items/parse-stats";
import { stripFormatting } from "../skyblock/items/parse-footer";
import { parseItemRequirements } from "./requirements";
import type { NeuRepository } from "./neu/repository";

const petRarities: ItemRarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

export function buildPetCandidateCatalog(neu: NeuRepository): CandidateItem[] {
  return neu.getAll().flatMap(reference => {
    const match = reference.internalname.match(/^(.+);([0-5])$/);
    if (!match) return [];
    const rarity = petRarities[Number(match[2])], type = match[1], lore = (reference.lore ?? []).map(stripFormatting);
    if (!rarity || !reference.displayname || !lore.some(line => line.trim().endsWith(" Pet"))) return [];
    const requirements = parseItemRequirements({ lore: [...lore, ...(reference.crafttext ? [reference.crafttext] : [])], slayerRequirement: reference.slayer_req });
    return [{
      id: reference.internalname,
      name: stripFormatting(reference.displayname).replace(/^\[Lvl \{LVL\}\]\s*/, ""),
      rarity,
      categories: ["pet"],
      stats: extractStats(lore).stats,
      lore,
      abilityText: petAbilityText(reference.lore ?? []),
      setBonusText: [],
      ...requirements,
      wiki: reference.infoType === "WIKI_URL" ? reference.info?.find(value => /^https?:\/\//.test(value)) ?? null : null,
      marketKey: `PET:${type}:${rarity.toUpperCase()}`,
      sources: { hypixel: false, neu: true },
    } satisfies CandidateItem];
  });
}

function petAbilityText(rawLore: readonly string[]) {
  const result: string[] = [];
  let capture = false;
  for (const raw of rawLore) {
    const clean = stripFormatting(raw);
    if (/^§6/.test(raw) && clean && !/^(?:LEGENDARY|MYTHIC)\b/.test(clean)) capture = true;
    else if (!clean.trim()) capture = false;
    if (capture) result.push(clean);
  }
  return result;
}
