import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
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

  // The NEU repository is intentionally gitignored. Use controlled reference
  // items instead of requiring a developer-specific NEU download.
  const directory = mkdtempSync(path.join(tmpdir(), "statixel-neu-pet-test-"));
  const previousDirectory = process.env.NEU_DATA_DIRECTORY;
  const itemsDirectory = path.join(directory, "repository", "items");
  mkdirSync(itemsDirectory, { recursive: true });
  const textures = [
    { itemId: "HERMIT_CRAB;4", hash: "a".repeat(64) },
    { itemId: "FROG;3", hash: "b".repeat(64) },
  ];

  try {
    for (const { itemId, hash } of textures) {
      const payload = Buffer.from(JSON.stringify({
        textures: { SKIN: { url: `https://textures.minecraft.net/texture/${hash}` } },
      })).toString("base64");
      const nbttag = `SkullOwner:{Properties:{textures:[{Value:"${payload}"}]}}`;
      writeFileSync(path.join(itemsDirectory, `${itemId}.json`), JSON.stringify({ internalname: itemId, nbttag }));
    }
    process.env.NEU_DATA_DIRECTORY = directory;
    const result = buildPets(member, [], false);
    assert.equal(result.owned.length, textures.length);
    for (const [index, pet] of result.owned.entries()) {
      assert.equal(pet.texture, `https://sky.shiiyu.moe/api/head/${textures[index].hash}`);
      assert.doesNotMatch(pet.texture ?? "", /\\/api\\/item\\//);
    }
  } finally {
    if (previousDirectory === undefined) delete process.env.NEU_DATA_DIRECTORY;
    else process.env.NEU_DATA_DIRECTORY = previousDirectory;
    rmSync(directory, { recursive: true, force: true });
  }
});
