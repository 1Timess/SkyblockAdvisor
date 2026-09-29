/** Current Garden greenhouse starter patterns; adjacent means orthogonally adjacent to an empty slot. */
export const starterMutations = [
  { name: "Lonelily", gardenLevel: 7, surface: "Farmland or Dirt", adjacent: [] },
  { name: "Dustgrain", gardenLevel: 7, surface: "Farmland", adjacent: [{ crop: "Wheat", count: 2 }] },
  { name: "Choconut", gardenLevel: 8, surface: "Farmland", adjacent: [{ crop: "Cocoa Beans", count: 2 }] },
  { name: "Gloomgourd", gardenLevel: 6, surface: "Farmland", adjacent: [{ crop: "Pumpkin", count: 1 }, { crop: "Melon Slice", count: 1 }] },
  { name: "Scourroot", gardenLevel: 3, surface: "Farmland", adjacent: [{ crop: "Potato", count: 1 }, { crop: "Carrot", count: 1 }] },
  { name: "Shadevine", gardenLevel: 7, surface: "Farmland", adjacent: [{ crop: "Cactus", count: 1 }, { crop: "Sugar Cane", count: 1 }] },
  { name: "Veilshroom", gardenLevel: 9, surface: "Mycelium", adjacent: [{ crop: "Red Mushroom", count: 1 }, { crop: "Brown Mushroom", count: 1 }] },
  { name: "Ashwreath", gardenLevel: 10, surface: "Soul Sand", adjacent: [{ crop: "Nether Wart", count: 2 }, { crop: "Fire", count: 2 }] },
] as const;

export const pestUnlocks = [
  { name: "Fly", crop: "Wheat", gardenLevel: 5 }, { name: "Cricket", crop: "Carrot", gardenLevel: 5 },
  { name: "Locust", crop: "Potato", gardenLevel: 5 }, { name: "Rat", crop: "Pumpkin", gardenLevel: 5 },
  { name: "Mosquito", crop: "Sugar Cane", gardenLevel: 5 }, { name: "Earthworm", crop: "Melon Slice", gardenLevel: 6 },
  { name: "Mite", crop: "Cactus", gardenLevel: 7 }, { name: "Moth", crop: "Cocoa Beans", gardenLevel: 8 },
  { name: "Slug", crop: "Mushroom", gardenLevel: 9 }, { name: "Beetle", crop: "Nether Wart", gardenLevel: 10 },
  { name: "Dragonfly", crop: "Sunflower", gardenLevel: 11 }, { name: "Firefly", crop: "Moonflower", gardenLevel: 11 },
  { name: "Praying Mantis", crop: "Wild Rose", gardenLevel: 12 },
] as const;

export function possibleGardenMechanics(gardenLevel: number | null) {
  if (gardenLevel === null) return { mutationOptions: [], nextPestUnlocks: [] };
  const nextPestLevel = pestUnlocks.find(pest => pest.gardenLevel > gardenLevel)?.gardenLevel;
  return {
    mutationOptions: gardenLevel >= 7 ? starterMutations.filter(mutation => mutation.gardenLevel <= gardenLevel)
      .map(mutation => ({ ...mutation, adjacent: [...mutation.adjacent] })) : [],
    nextPestUnlocks: nextPestLevel === undefined ? [] : pestUnlocks.filter(pest => pest.gardenLevel === nextPestLevel),
  };
}
