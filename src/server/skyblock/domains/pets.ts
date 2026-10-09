import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { neuItemSchema } from "../../../schemas/neu";
import { skyCryptHeadUrl, skyCryptItemUrl } from "../../reference/skycrypt-assets";
import type { RawMember } from "../../hypixel/types";
import type { ProfileWarning } from "../../../schemas/items";
import type { NormalizedPet } from "../../../schemas/pets";
import { effectivePetRarity, getPetLevel } from "../../reference/pet-leveling";
import { neuItemsDirectory, neuPetNumsPath } from "../../reference/neu/paths";

type PetStatLevel = { statNums?: Record<string, number>; otherNums?: number[] };
type PetStatTier = {
  "1"?: PetStatLevel;
  "100"?: PetStatLevel;
  level1?: PetStatLevel;
  level100?: PetStatLevel;
  stats_levelling_curve?: string;
  statsLevelingCurve?: string;
};

type PetNums = Record<string, Record<string, PetStatTier>>;


let petNumsCache: PetNums | null = null;
const petTextureCache = new Map<string, string | null>();

// SkyCrypt's canonical pet-head textures are stable 2D head renders.
// NEU's PET_* entries are 3D model textures, so they are intentionally not
// used for the pet card image itself.
const PET_HEAD_TEXTURES: Record<string, string> = {
  "ARMADILLO": "https://sky.shiiyu.moe/head/c1eb6df4736ae24dd12a3d00f91e6e3aa7ade6bbefb0978afef2f0f92461018f",
  "BAT": "https://sky.shiiyu.moe/head/382fc3f71b41769376a9e92fe3adbaac3772b999b219c9d6b4680ba9983e527",
  "BLAZE": "https://sky.shiiyu.moe/head/b78ef2e4cf2c41a2d14bfde9caff10219f5b1bf5b35a49eb51c6467882cb5f0",
  "CHICKEN": "https://sky.shiiyu.moe/head/7f37d524c3eed171ce149887ea1dee4ed399904727d521865688ece3bac75e",
  "HORSE": "https://sky.shiiyu.moe/head/36fcd3ec3bc84bafb4123ea479471f9d2f42d8fb9c5f11cf5f4e0d93226",
  "JERRY": "https://sky.shiiyu.moe/head/822d8e751c8f2fd4c8942c44bdb2f5ca4d8ae8e575ed3eb34c18a86e93b",
  "OCELOT": "https://sky.shiiyu.moe/head/5657cd5c2989ff97570fec4ddcdc6926a68a3393250c1be1f0b114a1db1",
  "PIGMAN": "https://sky.shiiyu.moe/head/63d9cb6513f2072e5d4e426d70a5557bc398554c880d4e7b7ec8ef4945eb02f2",
  "RABBIT": "https://sky.shiiyu.moe/head/117bffc1972acd7f3b4a8f43b5b6c7534695b8fd62677e0306b2831574b",
  "SHEEP": "https://sky.shiiyu.moe/head/64e22a46047d272e89a1cfa13e9734b7e12827e235c2012c1a95962874da0",
  "SILVERFISH": "https://sky.shiiyu.moe/head/da91dab8391af5fda54acd2c0b18fbd819b865e1a8f1d623813fa761e924540",
  "WITHER_SKELETON": "https://sky.shiiyu.moe/head/f5ec964645a8efac76be2f160d7c9956362f32b6517390c59c3085034f050cff",
  "SKELETON_HORSE": "https://sky.shiiyu.moe/head/47effce35132c86ff72bcae77dfbb1d22587e94df3cbc2570ed17cf8973a",
  "WOLF": "https://sky.shiiyu.moe/head/dc3dd984bb659849bd52994046964c22725f717e986b12d548fd169367d494",
  "ENDERMAN": "https://sky.shiiyu.moe/head/6eab75eaa5c9f2c43a0d23cfdce35f4df632e9815001850377385f7b2f039ce1",
  "PHOENIX": "https://sky.shiiyu.moe/head/23aaf7b1a778949696cb99d4f04ad1aa518ceee256c72e5ed65bfa5c2d88d9e",
  "MAGMA_CUBE": "https://sky.shiiyu.moe/head/38957d5023c937c4c41aa2412d43410bda23cf79a9f6ab36b76fef2d7c429",
  "BLUE_WHALE": "https://sky.shiiyu.moe/head/dab779bbccc849f88273d844e8ca2f3a67a1699cb216c0a11b44326ce2cc20",
  "TIGER": "https://sky.shiiyu.moe/head/fc42638744922b5fcf62cd9bf27eeab91b2e72d6c70e86cc5aa3883993e9d84",
  "LION": "https://sky.shiiyu.moe/head/38ff473bd52b4db2c06f1ac87fe1367bce7574fac330ffac7956229f82efba1",
  "PARROT": "https://sky.shiiyu.moe/head/5df4b3401a4d06ad66ac8b5c4d189618ae617f9c143071c8ac39a563cf4e4208",
  "SNOWMAN": "https://sky.shiiyu.moe/head/11136616d8c4a87a54ce78a97b551610c2b2c8f6d410bc38b858f974b113b208",
  "TURTLE": "https://sky.shiiyu.moe/head/212b58c841b394863dbcc54de1c2ad2648af8f03e648988c1f9cef0bc20ee23c",
  "BEE": "https://sky.shiiyu.moe/head/7e941987e825a24ea7baafab9819344b6c247c75c54a691987cd296bc163c263",
  "ENDER_DRAGON": "https://sky.shiiyu.moe/head/aec3ff563290b13ff3bcc36898af7eaa988b6cc18dc254147f58374afe9b21b9",
  "GUARDIAN": "https://sky.shiiyu.moe/head/221025434045bda7025b3e514b316a4b770c6faa4ba9adb4be3809526db77f9d",
  "SQUID": "https://sky.shiiyu.moe/head/01433be242366af126da434b8735df1eb5b3cb2cede39145974e9c483607bac",
  "GIRAFFE": "https://sky.shiiyu.moe/head/176b4e390f2ecdb8a78dc611789ca0af1e7e09229319c3a7aa8209b63b9",
  "ELEPHANT": "https://sky.shiiyu.moe/head/7071a76f669db5ed6d32b48bb2dba55d5317d7f45225cb3267ec435cfa514",
  "MONKEY": "https://sky.shiiyu.moe/head/13cf8db84807c471d7c6922302261ac1b5a179f96d1191156ecf3e1b1d3ca",
  "SPIDER": "https://sky.shiiyu.moe/head/cd541541daaff50896cd258bdbdd4cf80c3ba816735726078bfe393927e57f1",
  "ENDERMITE": "https://sky.shiiyu.moe/head/5a1a0831aa03afb4212adcbb24e5dfaa7f476a1173fce259ef75a85855",
  "GHOUL": "https://sky.shiiyu.moe/head/87934565bf522f6f4726cdfe127137be11d37c310db34d8c70253392b5ff5b",
  "JELLYFISH": "https://sky.shiiyu.moe/head/913f086ccb56323f238ba3489ff2a1a34c0fdceeafc483acff0e5488cfd6c2f1",
  "PIG": "https://sky.shiiyu.moe/head/621668ef7cb79dd9c22ce3d1f3f4cb6e2559893b6df4a469514e667c16aa4",
  "ROCK": "https://sky.shiiyu.moe/head/cb2b5d48e57577563aca31735519cb622219bc058b1f34648b67b8e71bc0fa",
  "SKELETON": "https://sky.shiiyu.moe/head/fca445749251bdd898fb83f667844e38a1dff79a1529f79a42447a0599310ea4",
  "ZOMBIE": "https://sky.shiiyu.moe/head/56fc854bb84cf4b7697297973e02b79bc10698460b51a639c60e5e417734e11",
  "DOLPHIN": "https://sky.shiiyu.moe/head/cefe7d803a45aa2af1993df2544a28df849a762663719bfefc58bf389ab7f5",
  "BABY_YETI": "https://sky.shiiyu.moe/head/ab126814fc3fa846dad934c349628a7a1de5b415021a03ef4211d62514d5",
  "MEGALODON": "https://sky.shiiyu.moe/head/a94ae433b301c7fb7c68cba625b0bd36b0b14190f20e34a7c8ee0d9de06d53b9",
  "GOLEM": "https://sky.shiiyu.moe/head/89091d79ea0f59ef7ef94d7bba6e5f17f2f7d4572c44f90f76c4819a714",
  "HOUND": "https://sky.shiiyu.moe/head/b7c8bef6beb77e29af8627ecdc38d86aa2fea7ccd163dc73c00f9f258f9a1457",
  "TARANTULA": "https://sky.shiiyu.moe/head/8300986ed0a04ea79904f6ae53f49ed3a0ff5b1df62bba622ecbd3777f156df8",
  "BLACK_CAT": "https://sky.shiiyu.moe/head/e4b45cbaa19fe3d68c856cd3846c03b5f59de81a480eec921ab4fa3cd81317",
  "SPIRIT": "https://sky.shiiyu.moe/head/8d9ccc670677d0cebaad4058d6aaf9acfab09abea5d86379a059902f2fe22655",
  "GRIFFIN": "https://sky.shiiyu.moe/head/4c27e3cb52a64968e60c861ef1ab84e0a0cb5f07be103ac78da67761731f00c8",
  "MITHRIL_GOLEM": "https://sky.shiiyu.moe/head/c1b2dfe8ed5dffc5b1687bc1c249c39de2d8a6c3d90305c95f6d1a1a330a0b1",
  "GRANDMA_WOLF": "https://sky.shiiyu.moe/head/4e794274c1bb197ad306540286a7aa952974f5661bccf2b725424f6ed79c7884",
  "RAT": "https://sky.shiiyu.moe/head/a8abb471db0ab78703011979dc8b40798a941f3a4dec3ec61cbeec2af8cffe8",
  "BAL": "https://sky.shiiyu.moe/head/c469ba2047122e0a2de3c7437ad3dd5d31f1ac2d27abde9f8841e1d92a8c5b75",
  "SCATHA": "https://sky.shiiyu.moe/head/df03ad96092f3f789902436709cdf69de6b727c121b3c2daef9ffa1ccaed186c",
  "GOLDEN_DRAGON": "https://sky.shiiyu.moe/head/2e9f9b1fc014166cb46a093e5349b2bf6edd201b680d62e48dbf3af9b0459116",
  "AMMONITE": "https://sky.shiiyu.moe/head/a074a7bd976fe6aba1624161793be547d54c835cf422243a851ba09d1e650553",
  "BINGO": "https://sky.shiiyu.moe/head/d4cd9c707c7092d4759fe2b2b6a713215b6e39919ec4e7afb1ae2b6f8576674c",
  "MOOSHROOM_COW": "https://sky.shiiyu.moe/head/2b52841f2fd589e0bc84cbabf9e1c27cb70cac98f8d6b3dd065e55a4dcb70d77",
  "SNAIL": "https://sky.shiiyu.moe/head/50a9933a3b10489d38f6950c4e628bfcf9f7a27f8d84666f04f14d5374252972",
  "KUUDRA": "https://sky.shiiyu.moe/head/1f0239fb498e5907ede12ab32629ee95f0064574a9ffdff9fc3a1c8e2ec17587",
  "DROPLET_WISP": "https://sky.shiiyu.moe/head/b412e70375ec99ee38ae94b30e9b10752d459662b54794dfe66fe6a183c672d3",
  "FROST_WISP": "https://sky.shiiyu.moe/head/1d8ad9936d758c5ea30b0b7cc7c67c2bfcea829ecf2425c0b50fc92a26ae23d0",
  "GLACIAL_WISP": "https://sky.shiiyu.moe/head/3e2018feebe1a99177b3cb196d4e44521268b4b3eb56e6419cb0253cdbf0456c",
  "SUBZERO_WISP": "https://sky.shiiyu.moe/head/7a0eb37e58c942eca4d33ab44e26eb1910c783788510b0a53b6f4d18881e237e",
  "REINDEER": "https://sky.shiiyu.moe/head/a2df65c6fd19a58bee38252192ac7ce2cf1dc8632c3547a9228b6b697240d098",
  "RIFT_FERRET": "https://sky.shiiyu.moe/head/b6b11399448260185da1d17e54c984515faab6d8585f00972451ec2b43d46f94",
  "FRACTURED_MONTEZUMA_SOUL": "https://sky.shiiyu.moe/head/df656c06e8a5cb4692564ee21748bddec9d785d1834284aaa1439601bba47d6b",
  "EERIE": "https://sky.shiiyu.moe/head/c3af70c6ff76ba48f24ee8a2063a5b50bbfabf409f4795248a292f8289f47c98",
  "SLUG": "https://sky.shiiyu.moe/head/7a79d0fd677b54530961117ef84adc206e2cc5045c1344d61d776bf8ac2fe1ba",
  "OWL": "https://sky.shiiyu.moe/head/da3216da54e7368fb40b721239ad95e07ef4f97d93f1c42ff319bab9a53882af",
  "TYRANNOSAURUS": "https://sky.shiiyu.moe/head/93f28ec96df59c67e9d2fc2e7e3d055fa31646e4111add9fe26a692801964126",
  "SPINOSAURUS": "https://sky.shiiyu.moe/head/d3c9d479471a2f13f22548315159591720992e70c920fef83a901b7186720e3c",
  "GOBLIN": "https://sky.shiiyu.moe/head/7309d8dc35a638a04b915a3b15a1452ceeae0d7ea42bcdadb21b03046987515c",
  "ANKYLOSAURUS": "https://sky.shiiyu.moe/head/c1aa836b9096c417903299a6c5ab41738c19648ac439fed4bcbe6c32605338dc",
  "PENGUIN": "https://sky.shiiyu.moe/head/37534e97f36e5a8335928e171ec99608bee7fb16e260afb301025b3b17eeefc4",
  "MAMMOTH": "https://sky.shiiyu.moe/head/6b10715732cd1fd49fa1b6187947c307dd4687105cf033840607f9d6234743ad",
  "MOLE": "https://sky.shiiyu.moe/head/727baaafc09978d4bda73e16afdde85ec13b0f95ad989524c5fcaa717cf06b4a",
  "GLACITE_GOLEM": "https://sky.shiiyu.moe/head/af132a6593876d3c377d503fd66eca3fb938743251f7b16a9870c60b7388c8a3",
};

function getNeuPetTexture(itemId: string) {
  if (petTextureCache.has(itemId)) return petTextureCache.get(itemId)!;
  let texture: string | null = null;
  try {
    const file = path.join(neuItemsDirectory(), itemId + ".json");
    const item = neuItemSchema.parse(JSON.parse(readFileSync(file, "utf8")));
    const encoded = item.nbttag?.match(/Value:"([^"]+)"/)?.[1];
    if (encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const match = decoded.match(/"url":"(https?:\/\/textures\.minecraft\.net\/texture\/[a-f0-9]+)"/i);
      if (match) texture = match[1].replace(/^http:/, "https:");
    }
  } catch {
    // Missing or malformed NEU item data; caller may use a fallback.
  }
  petTextureCache.set(itemId, texture);
  return texture;
}

const PET_ITEM_RARITY_INDEX: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 5,
};

function getCanonicalPetItemId(type: string, rarity: string) {
  const index = PET_ITEM_RARITY_INDEX[rarity.toLowerCase()];
  return index === undefined ? null : `${type.toUpperCase()};${index}`;
}

function getPetTexture(type: string, rarity: string, skin: string | null) {
  if (skin) {
    const skinTexture = getNeuPetTexture("PET_SKIN_" + skin);
    const match = skinTexture?.match(/\/texture\/([a-f0-9]+)$/i);
    if (match) {
      const renderedSkin = skyCryptHeadUrl(`/head/${match[1]}`);
      if (renderedSkin) return renderedSkin;
    }
  }

  const base = PET_HEAD_TEXTURES[type.toUpperCase()];
  const renderedBase = base ? skyCryptHeadUrl(base) : null;
  if (renderedBase) return renderedBase;

  // Match current SkyCrypt behavior for pets missing from the canonical table:
  // resolve the NEU pet item, extract its SkullOwner texture, and render that
  // texture through /api/head. If the exact rarity is absent, walk downward
  // through the pet rarities until NEU has a usable texture.
  const rarityIndex = PET_ITEM_RARITY_INDEX[rarity.toLowerCase()];
  if (rarityIndex === undefined) return null;

  for (let index = rarityIndex; index >= 0; index--) {
    const itemId = `${type.toUpperCase()};${index}`;
    const texture = getNeuPetTexture(itemId);
    const match = texture?.match(/\/texture\/([a-f0-9]+)$/i);
    if (!match) continue;

    const rendered = skyCryptHeadUrl(`/head/${match[1]}`);
    if (rendered) return rendered;
  }

  return null;
}
function getHeldItemTexture(itemId: string | null) {
  return itemId ? skyCryptItemUrl(itemId) : null;
}
function loadPetNums(): PetNums {
  if (petNumsCache) return petNumsCache;
  try {
    petNumsCache = JSON.parse(readFileSync(neuPetNumsPath(), "utf8")) as PetNums;
  } catch {
    petNumsCache = {};
  }
  return petNumsCache;
}

const statKeyMap: Record<string, string> = {
  health: "health", defense: "defense", strength: "strength", intelligence: "intelligence",
  speed: "speed", crit_chance: "critChance", crit_damage: "critDamage", attack_speed: "attackSpeed",
  bonus_attack_speed: "attackSpeed", ferocity: "ferocity", magic_find: "magicFind", pet_luck: "petLuck",
  mining_speed: "miningSpeed", mining_fortune: "miningFortune", gemstone_fortune: "gemstoneFortune",
  pristine: "pristine", farming_fortune: "farmingFortune", foraging_fortune: "foragingFortune",
  foraging_wisdom: "foragingWisdom", fishing_speed: "fishingSpeed", sea_creature_chance: "seaCreatureChance",
  ability_damage: "abilityDamage",
};

function normalizePetStatKey(key: string) {
  const normalized = key.trim().toLowerCase().replaceAll(" ", "_");
  return statKeyMap[normalized] ?? normalized.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function getTierData(petNums: PetNums, type: string, rarity: string) {
  const byType = petNums[type.toUpperCase()] ?? petNums[type];
  if (!byType) return null;
  return byType[rarity.toUpperCase()] ?? byType[rarity.toLowerCase()] ?? null;
}

function calculatePetStats(petNums: PetNums, type: string, rarity: string, level: number | null) {
  if (level === null) return {};
  const tier = getTierData(petNums, type, rarity);
  const min = tier?.["1"] ?? tier?.level1;
  const max = tier?.["100"] ?? tier?.level100;
  if (!tier || !min?.statNums || !max?.statNums) return {};

  let minStatsLevel = 0, maxStatsLevel = 100, statsLevelingType = -1, statsLevel = level;
  const curve = tier.stats_levelling_curve ?? tier.statsLevelingCurve;
  if (curve) {
    const parts = curve.split(/[:;]/).map(Number);
    if (parts.length === 3 && parts.every(Number.isFinite)) {
      [minStatsLevel, maxStatsLevel, statsLevelingType] = parts;
      if (statsLevelingType === 0 || statsLevelingType === 1) {
        if (level < minStatsLevel) statsLevel = 1;
        else if (level < maxStatsLevel) statsLevel = level - minStatsLevel + 1;
        else statsLevel = maxStatsLevel - minStatsLevel + 1;
      }
    }
  }

  const minMix = (maxStatsLevel - (minStatsLevel - (statsLevelingType === -1 ? 0 : 1)) - statsLevel) / 99;
  const maxMix = (statsLevel - 1) / 99;
  const output: Record<string, number> = {};

  for (const [rawKey, maxValue] of Object.entries(max.statNums)) {
    if (statsLevelingType === 1 && level < minStatsLevel) continue;
    const minValue = min.statNums[rawKey] ?? 0;
    const value = Math.floor(minValue * minMix + maxValue * maxMix);
    if (Number.isFinite(value) && value !== 0) output[normalizePetStatKey(rawKey)] = value;
  }

  if (max.otherNums?.length) {
    for (let i = 0; i < max.otherNums.length; i++) {
      if (statsLevelingType === 1 && level < minStatsLevel) continue;
      const minValue = min.otherNums?.[i] ?? 0;
      const value = minValue * minMix + max.otherNums[i] * maxMix;
      if (Number.isFinite(value) && value !== 0) output[`otherNum_${i}`] = Math.floor(value * 10) / 10;
    }
  }

  return output;
}

export function buildPets(member: RawMember, warnings: ProfileWarning[], includeReferenceStats = true) {
  const rawPets = member.pets_data?.pets;
  if (!rawPets) warnings.push({ code: "PARTIAL_PROFILE", scope: "pets", message: "Owned pets were not supplied." });
  const petNums = includeReferenceStats ? loadPetNums() : {};
  const owned: NormalizedPet[] = (rawPets ?? []).map(pet => {
    const rarity = pet.tier?.toLowerCase() ?? "unknown", type = pet.type ?? "UNKNOWN";
    const xp = pet.exp ?? 0;
    const level = pet.exp === undefined ? null : getPetLevel(xp, rarity, type);
    if (!level) warnings.push({ code: "REFERENCE_DATA_MISSING", scope: "pets", message: `Pet level unavailable for ${type}: missing XP or unsupported rarity.` });
    const effectiveRarity = effectivePetRarity(rarity, pet.heldItem);
    return {
      uuid: pet.uuid ?? pet.uniqueId ?? null, type, name: type.toLowerCase().split("_").map(word => word[0].toUpperCase() + word.slice(1)).join(" "),
      rarity, effectiveRarity,
      level: level?.level ?? null, maxLevel: level?.maxLevel ?? null, xp, xpCurrent: level?.xpCurrent ?? null,
      xpForNext: level?.xpForNext ?? null, progress: level?.progress ?? null, active: pet.active ?? false,
      heldItem: pet.heldItem ?? null, heldItemTexture: getHeldItemTexture(pet.heldItem ?? null), candyUsed: pet.candyUsed ?? 0, skin: pet.skin ?? null,
      texture: getPetTexture(type, effectiveRarity, pet.skin ?? null),
      stats: calculatePetStats(petNums, type, effectiveRarity, level?.level ?? null), abilityLore: [],
    };
  });
  return { owned, activePet: owned.find(pet => pet.active) ?? null };
}