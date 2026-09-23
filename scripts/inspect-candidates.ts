import { buildAccessoryLanes } from "../src/server/candidates/accessory";
import { buildArmorLanes } from "../src/server/candidates/armor";
import { buildPetLanes } from "../src/server/candidates/pet";
import { buildWeaponLanes } from "../src/server/candidates/weapon";
import { hypixelClient } from "../src/server/hypixel/client";
import { loadMarketSnapshot } from "../src/server/market/snapshot-store";
import { buildAccessoryCatalog } from "../src/server/reference/accessory-data";
import { buildItemCatalog } from "../src/server/reference/item-catalog";
import { loadNeuRepository } from "../src/server/reference/neu/repository";
import { buildPetCandidateCatalog } from "../src/server/reference/pet-catalog";
import { buildNormalizedProfile } from "../src/server/skyblock/profile/build-normalized-profile";

async function main() {
  const [username = "iTimess", requestedProfile, rawBudget] = process.argv.slice(2);
  const budgetCoins = rawBudget === undefined ? undefined : Number(rawBudget);
  if (budgetCoins !== undefined && (!Number.isFinite(budgetCoins) || budgetCoins < 0)) throw new Error("Budget must be a non-negative number of coins.");
  const [profile, items, neu, snapshot] = await Promise.all([
    buildNormalizedProfile({ usernameOrUuid: username, requestedProfile }),
    hypixelClient.getItems(),
    loadNeuRepository(),
    loadMarketSnapshot(),
  ]);
  const catalog = buildItemCatalog(items, neu).getAll(), petCatalog = buildPetCandidateCatalog(neu);
  const quotes = new Map(Object.entries(snapshot?.quotes ?? {}));
  const armor = profile.gear.armor.items.map(current => buildArmorLanes({ current, catalog, profile, quotes, budgetCoins }));
  const weapons = profile.gear.weapons.map(current => ({ current: current.id ?? current.name, lanes: buildWeaponLanes({ current, catalog, profile, quotes, budgetCoins }) }));
  const accessories = buildAccessoryLanes({ profile, catalog, references: buildAccessoryCatalog(items), quotes, budgetCoins });
  const pets = buildPetLanes({ profile, catalog: petCatalog, quotes, budgetCoins });
  const counts = (lanes: Record<string, readonly unknown[]>) => Object.fromEntries(Object.entries(lanes).map(([key, values]) => [key, values.length]));
  console.log(JSON.stringify({
    identity: profile.identity,
    profile: profile.profile.cuteName,
    budgetCoins: budgetCoins ?? null,
    marketSnapshot: snapshot?.snapshotId ?? null,
    armor: armor.map(result => ({ slot: result.slot, counts: counts(result.lanes), candidates: result.candidates.map(value => value.id) })),
    weapons: weapons.map(result => ({ current: result.current, counts: counts(result.lanes.lanes), candidates: result.lanes.candidates.map(value => value.id) })),
    accessories: { counts: counts(accessories.lanes), candidates: accessories.candidates.map(value => value.id) },
    pets: { counts: counts(pets.lanes), candidates: pets.candidates.map(value => value.id) },
  }, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Candidate inspection failed."); process.exitCode = 1; });
