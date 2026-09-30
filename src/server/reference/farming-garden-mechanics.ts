/** Common Greenhouse patterns; count-only Witherbloom has no verified full grid. */
export const starterMutations = [
  { name: "Lonelily", gardenLevel: 7, surface: "Farmland or Dirt", adjacent: [] },
  { name: "Dustgrain", gardenLevel: 7, surface: "Farmland", adjacent: [{ crop: "Wheat", count: 2 }] },
  { name: "Choconut", gardenLevel: 8, surface: "Farmland", adjacent: [{ crop: "Cocoa Beans", count: 2 }] },
  { name: "Gloomgourd", gardenLevel: 6, surface: "Farmland", adjacent: [{ crop: "Pumpkin", count: 1 }, { crop: "Melon Slice", count: 1 }] },
  { name: "Scourroot", gardenLevel: 3, surface: "Farmland", adjacent: [{ crop: "Potato", count: 1 }, { crop: "Carrot", count: 1 }] },
  { name: "Shadevine", gardenLevel: 7, surface: "Farmland", adjacent: [{ crop: "Cactus", count: 1 }, { crop: "Sugar Cane", count: 1 }] },
  { name: "Veilshroom", gardenLevel: 9, surface: "Mycelium", adjacent: [{ crop: "Red Mushroom", count: 1 }, { crop: "Brown Mushroom", count: 1 }] },
  { name: "Ashwreath", gardenLevel: 10, surface: "Soul Sand", adjacent: [{ crop: "Nether Wart", count: 2 }, { crop: "Fire", count: 2 }] },
  { name: "Witherbloom", gardenLevel: 7, surface: "Soul Sand", adjacent: [{ crop: "Dead Plant", count: 4 }] },
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

/** Potential pest drops and attraction materials, separate from active pests and owned supplies. */
const pestDetails: Record<string, { spray: string; specialDrop: string }> = {
  Fly: { spray: "Dung", specialDrop: "Beady Eyes" }, Cricket: { spray: "Honey Jar", specialDrop: "Chirping Stereo" },
  Locust: { spray: "Plant Matter", specialDrop: "Locust Larva" }, Rat: { spray: "Tasty Cheese", specialDrop: "Rat Pet" },
  Mosquito: { spray: "Compost", specialDrop: "Clipped Wings" }, Earthworm: { spray: "Compost", specialDrop: "Bookworm's Favorite Book" },
  Mite: { spray: "Tasty Cheese", specialDrop: "Atmospheric Filter" }, Moth: { spray: "Honey Jar", specialDrop: "Wriggling Larva" },
  Slug: { spray: "Plant Matter", specialDrop: "Slug Pet" }, Beetle: { spray: "Dung", specialDrop: "Pesterminator I" },
  Dragonfly: { spray: "Jelly", specialDrop: "Vermin Vaporizer Chip" }, Firefly: { spray: "Jelly", specialDrop: "Fire in a Bottle" },
  "Praying Mantis": { spray: "Jelly", specialDrop: "Mantid Claw" },
};

export function cropPestOptions(gardenLevel: number | null, cropMilestones: { crop: string }[]) {
  if (gardenLevel === null) return [];
  return cropMilestones.slice(0, 4).flatMap(milestone => {
    const pest = pestUnlocks.find(entry => entry.crop.toUpperCase().replaceAll(" ", "_") === milestone.crop && entry.gardenLevel <= gardenLevel);
    if (!pest) return [];
    return [{ name: pest.name, crop: pest.crop, gardenLevel: pest.gardenLevel, ...pestDetails[pest.name] }];
  });
}

export function possibleGardenMechanics(gardenLevel: number | null) {
  if (gardenLevel === null) return { mutationOptions: [], nextPestUnlocks: [] };
  const nextPestLevel = pestUnlocks.find(pest => pest.gardenLevel > gardenLevel)?.gardenLevel;
  return {
    mutationOptions: gardenLevel >= 7 ? starterMutations.filter(mutation => mutation.gardenLevel <= gardenLevel)
      .map(mutation => ({ ...mutation, adjacent: [...mutation.adjacent],
        layoutStatus: mutation.name === "Witherbloom" ? "COUNT_ONLY" as const : "REFERENCE_GRID" as const,
        inputAccess: mutation.name === "Witherbloom" || mutation.name === "Ashwreath"
          ? "UNDETERMINED" as const : "LEVEL_ELIGIBLE" as const,
        cultivationStatus: "UNVERIFIED" as const })) : [],
    nextPestUnlocks: nextPestLevel === undefined ? [] : pestUnlocks.filter(pest => pest.gardenLevel === nextPestLevel),
  };
}
