import type { AdvisorContext } from "../../schemas/advisor";
import type { MarketQuote } from "../../schemas/market";
import { hypixelClient } from "../hypixel/client";
import { loadMarketSnapshot } from "../market/snapshot-store";
import { buildAccessoryCatalog } from "../reference/accessory-data";
import { buildItemCatalog } from "../reference/item-catalog";
import { loadNeuRepository } from "../reference/neu/repository";
import { buildPetCandidateCatalog } from "../reference/pet-catalog";
import { buildNormalizedProfile } from "../skyblock/profile/build-normalized-profile";
import { buildAccessoryLanes } from "../candidates/accessory";
import { buildArmorLanes } from "../candidates/armor";
import { buildPetLanes } from "../candidates/pet";
import { buildWeaponLanes } from "../candidates/weapon";
import { buildAdvisorContext, type CandidateLaneGroups } from "./context";

export async function buildAdvisorContextForPlayer(input: {
  usernameOrUuid: string;
  requestedProfile?: string;
  question: string;
  budgetCoins?: number;
  rolePetTypes?: readonly string[];
}): Promise<AdvisorContext> {
  const [profile, items, neu, snapshot] = await Promise.all([
    buildNormalizedProfile({ usernameOrUuid: input.usernameOrUuid, requestedProfile: input.requestedProfile }),
    hypixelClient.getItems(), loadNeuRepository(), loadMarketSnapshot(),
  ]);
  const catalog = buildItemCatalog(items, neu).getAll(), petCatalog = buildPetCandidateCatalog(neu);
  const quotes = new Map<string, MarketQuote>(Object.entries(snapshot?.quotes ?? {}));
  const armor = profile.gear.armor.items.map(current => buildArmorLanes({ current, catalog, profile, quotes, budgetCoins: input.budgetCoins }));
  const weapons = profile.gear.weapons.map(current => buildWeaponLanes({ current, catalog, profile, quotes, budgetCoins: input.budgetCoins }));
  const accessories = buildAccessoryLanes({ profile, catalog, references: buildAccessoryCatalog(items), quotes, budgetCoins: input.budgetCoins });
  const pets = buildPetLanes({ profile, catalog: petCatalog, quotes, budgetCoins: input.budgetCoins, rolePetTypes: input.rolePetTypes });
  const groups: CandidateLaneGroups = {
    armor: armor.flatMap(result => Object.values(result.lanes)),
    weapon: weapons.flatMap(result => Object.values(result.lanes)),
    accessory: Object.values(accessories.lanes), pet: Object.values(pets.lanes),
  };
  return buildAdvisorContext({ question: input.question, profile, candidateLanes: groups });
}
