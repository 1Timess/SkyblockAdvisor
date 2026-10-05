import assert from "node:assert/strict";
import test from "node:test";
import type { RawMember } from "../src/server/hypixel/types";
import { buildPets } from "../src/server/skyblock/domains/pets";
import { skyCryptHeadUrl, skyCryptItemUrl } from "../src/server/reference/skycrypt-assets";

test("SkyCrypt head renderer URL is built from a texture hash", () => {
  assert.equal(
    skyCryptHeadUrl("/head/38ff473bd52b4db2c06f1ac87fe1367bce7574fac330ffac7956229f82efba1"),
    "https://sky.shiiyu.moe/api/head/38ff473bd52b4db2c06f1ac87fe1367bce7574fac330ffac7956229f82efba1",
  );
  assert.equal(skyCryptHeadUrl("not-a-head-path"), null);
});

test("SkyCrypt item renderer URL preserves the exact item id", () => {
  assert.equal(
    skyCryptItemUrl("PET_ITEM_CROCHET_TIGER_PLUSHIE"),
    "https://sky.shiiyu.moe/api/item/PET_ITEM_CROCHET_TIGER_PLUSHIE",
  );
});

test("normalized pets use SkyCrypt renders for pet heads and held items", () => {
  const member = {
    pets_data: {
      pets: [{
        uuid: "lion-1",
        type: "LION",
        tier: "LEGENDARY",
        exp: 0,
        active: true,
        heldItem: "PET_ITEM_CROCHET_TIGER_PLUSHIE",
        candyUsed: 0,
        skin: null,
      }],
    },
  } as RawMember;

  const result = buildPets(member, [], false);
  assert.equal(result.owned[0]?.texture, "https://sky.shiiyu.moe/api/head/38ff473bd52b4db2c06f1ac87fe1367bce7574fac330ffac7956229f82efba1");
  assert.equal(result.owned[0]?.heldItemTexture, "https://sky.shiiyu.moe/api/item/PET_ITEM_CROCHET_TIGER_PLUSHIE");
});


test("pets without a canonical head resolve their NEU SkullOwner texture through SkyCrypt", () => {
  const member = {
    pets_data: {
      pets: [
        { uuid: "crab-1", type: "HERMIT_CRAB", tier: "LEGENDARY", exp: 0, active: false, heldItem: null, candyUsed: 0, skin: null },
        { uuid: "frog-1", type: "FROG", tier: "EPIC", exp: 0, active: false, heldItem: null, candyUsed: 0, skin: null },
      ],
    },
  } as RawMember;

  const result = buildPets(member, [], false);
  for (const pet of result.owned) {
    assert.match(pet.texture ?? "", /^https:\/\/sky\.shiiyu\.moe\/api\/head\/[a-f0-9]+$/);
    assert.doesNotMatch(pet.texture ?? "", /\/api\/item\//);
  }
});
