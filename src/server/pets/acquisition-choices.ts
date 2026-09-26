import type { CanonicalPetDefinition } from "../../schemas/pet-mechanics";
import type { PetLevelBucket, PetMarketListing } from "../../schemas/pet-market";
import { buildPetLevelBucketSpecs } from "./level-buckets";
import { buildPetLevelBuckets } from "./level-market";

export type PetAcquisitionChoice = {
  canonicalPetId: string;
  level: number;
  petCoins: number;
  heldItemCoins: number;
  totalCoins: number;
  confidence: PetLevelBucket["confidence"];
  sampleCount: number;
  bucket: { minLevel: number; maxLevel: number };
  listingId: string;
};

export function buildPetAcquisitionChoices(input: {
  definition: CanonicalPetDefinition;
  listings: readonly PetMarketListing[];
  heldItemCoins?: number;
}): PetAcquisitionChoice[] {
  const heldItemCoins = input.heldItemCoins ?? 0;
  const buckets = buildPetLevelBuckets(
    input.definition.id,
    input.listings,
    buildPetLevelBucketSpecs(input.definition.maxLevel),
  );

  return buckets.flatMap(bucket => {
    const listing = bucket.representative;
    if (!listing) return [];
    return [{
      canonicalPetId: input.definition.id,
      level: listing.level,
      petCoins: listing.coins,
      heldItemCoins,
      totalCoins: listing.coins + heldItemCoins,
      confidence: bucket.confidence,
      sampleCount: bucket.sampleCount,
      bucket: { minLevel: bucket.minLevel, maxLevel: bucket.maxLevel },
      listingId: listing.listingId,
    }];
  });
}
