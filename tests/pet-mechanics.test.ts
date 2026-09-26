import assert from "node:assert/strict";
import test from "node:test";
import type { NeuItem } from "../src/schemas/neu";
import type { NeuPetConstants } from "../src/schemas/neu-pets";
import { buildCanonicalPetDefinitions, buildCanonicalPetItemDefinitions } from "../src/server/reference/pet-mechanics";

const constants: NeuPetConstants = {
  pet_rarity_offset: { COMMON: 0, UNCOMMON: 6, RARE: 11, EPIC: 16, LEGENDARY: 20, MYTHIC: 20 },
  pet_levels: Array.from({ length: 100 }, (_, index) => index + 1),
  custom_pet_leveling: {
    GOLDEN_DRAGON: { type: 1, pet_levels: Array.from({ length: 200 }, (_, index) => index + 100), max_level: 200 },
  },
  pet_types: { SCATHA: "MINING", BAL: "MINING", GOLDEN_DRAGON: "COMBAT", BEE: "FARMING" },
  pet_item_display_name_to_id: { "§6Quick Claw": "PET_ITEM_QUICK_CLAW", "§6Tier Boost": "PET_ITEM_TIER_BOOST" },
};

function item(internalname: string, lore: string[], recipes?: unknown[]): NeuItem {
  return { internalname, displayname: internalname, lore, recipes };
}

test("canonical pets use NEU custom leveling and preserve pet skill type as metadata", () => {
  const [pet] = buildCanonicalPetDefinitions([item("GOLDEN_DRAGON;4", ["§8Combat Pet", "", "§7Strength: §c+{STRENGTH}", "", "§6Treasure", "§7Gain §c{3}% damage for every million coins in your bank.", "", "§6§lLEGENDARY"])], constants);
  assert.equal(pet.maxLevel, 200);
  assert.equal(pet.xpCurve.length, 199);
  assert.equal(pet.petSkillType, "COMBAT");
  assert.equal(pet.source, "NEU");
  assert.equal(pet.baseStatTemplates.STRENGTH, "{STRENGTH}");
  assert.equal(pet.abilities[0].rawLore[0], "Gain {3}% damage for every million coins in your bank.");
});

test("canonical parser captures equipment and location conditions without pretending they are unconditional stats", () => {
  const pets = buildCanonicalPetDefinitions([
    item("SCATHA;4", ["§8Mining Pet", "", "§6Drill Infusion", "§7Grants §6+{1}☘ Gemstone Fortune §7to", "§7Drills.", "", "§6§lLEGENDARY"]),
    item("BAL;4", ["§8Mining Pet", "", "§6Furnace", "§7Grants §5+{0} Pristine §7while in the", "§cMagma Fields§7.", "", "§6§lLEGENDARY"]),
  ], constants);
  const scatha = pets[0].abilities[0], bal = pets[1].abilities[0];
  assert.equal(scatha.effects[0]?.target, "GEMSTONE_FORTUNE");
  assert.equal(scatha.conditions[0]?.kind, "EQUIPMENT_TYPE");
  assert.match(scatha.conditions[0]?.value ?? "", /DRILL/);
  assert.equal(bal.effects[0]?.target, "PRISTINE");
  assert.equal(bal.conditions[0]?.kind, "LOCATION");
  assert.equal(bal.parseStatus, "PARTIAL");
});

test("Kat rarity upgrades come only from structured NEU recipes", () => {
  const [pet] = buildCanonicalPetDefinitions([item("SCATHA;4", ["§8Mining Pet", "§6§lLEGENDARY"], [{
    type: "katgrade", coins: 250000000, time: 1209600, input: "SCATHA;3", output: "SCATHA;4", items: ["ENCHANTED_HARD_STONE:256"],
  }])], constants);
  assert.deepEqual(pet.upgradePaths, [{
    operation: "KAT", inputId: "SCATHA;3", outputId: "SCATHA;4", coins: 250000000, timeSeconds: 1209600,
    itemCosts: [{ itemId: "ENCHANTED_HARD_STONE", count: 256 }],
  }]);
});

test("pet items share the canonical effect model and retain uncertainty", () => {
  const definitions = buildCanonicalPetItemDefinitions([
    item("PET_ITEM_QUICK_CLAW", ["§8Consumed on use", "§7Every 2 pet levels, you gain §6+1 Mining Speed §7and §6+1 Mining Fortune§7."]),
    item("PET_ITEM_TIER_BOOST", ["§8Consumed on use", "§7Boosts the §ararity §7of your pet by 1 tier!"]),
  ], constants);
  const claw = definitions.find(value => value.itemId === "PET_ITEM_QUICK_CLAW")!;
  const boost = definitions.find(value => value.itemId === "PET_ITEM_TIER_BOOST")!;
  assert.deepEqual(claw.effects.map(value => [value.kind, value.target]), [["SCALED_STAT", "MINING_SPEED"], ["SCALED_STAT", "MINING_FORTUNE"]]);
  assert.equal(claw.source, "NEU");
  assert.equal(boost.parseStatus, "UNPARSED");
  assert.equal(boost.rawLore[1], "Boosts the rarity of your pet by 1 tier!");
});

test("unknown pet mechanics fail soft and preserve raw lore", () => {
  const [pet] = buildCanonicalPetDefinitions([item("BEE;4", ["§8Farming Pet", "", "§6Future Mechanic", "§7Do a completely novel thing with flowers.", "", "§6§lLEGENDARY"])], constants);
  assert.equal(pet.abilities[0].parseStatus, "UNPARSED");
  assert.equal(pet.abilities[0].confidence, "LOW");
  assert.deepEqual(pet.abilities[0].effects, []);
  assert.deepEqual(pet.abilities[0].rawLore, ["Do a completely novel thing with flowers."]);
});
