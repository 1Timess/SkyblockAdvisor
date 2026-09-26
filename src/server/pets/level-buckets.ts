import type { PetLevelBucketSpec } from "./level-market";

const DEFAULT_INTERMEDIATE_BANDS = 4;

export function buildPetLevelBucketSpecs(
  maxLevel: number,
  intermediateBands = DEFAULT_INTERMEDIATE_BANDS,
): PetLevelBucketSpec[] {
  if (!Number.isInteger(maxLevel) || maxLevel < 1) throw new Error("maxLevel must be a positive integer");
  if (!Number.isInteger(intermediateBands) || intermediateBands < 1) throw new Error("intermediateBands must be a positive integer");
  if (maxLevel === 1) return [{ minLevel: 1, maxLevel: 1 }];
  if (maxLevel === 2) return [{ minLevel: 1, maxLevel: 1 }, { minLevel: 2, maxLevel: 2 }];

  const firstIntermediate = 2;
  const lastIntermediate = maxLevel - 1;
  const intermediateCount = lastIntermediate - firstIntermediate + 1;
  const bandCount = Math.min(intermediateBands, intermediateCount);
  const specs: PetLevelBucketSpec[] = [{ minLevel: 1, maxLevel: 1 }];

  for (let index = 0; index < bandCount; index++) {
    const minLevel = firstIntermediate + Math.floor((index * intermediateCount) / bandCount);
    const maxBandLevel = firstIntermediate + Math.floor(((index + 1) * intermediateCount) / bandCount) - 1;
    specs.push({ minLevel, maxLevel: maxBandLevel });
  }

  specs.push({ minLevel: maxLevel, maxLevel });
  return specs;
}
