import { petLevelBucketSchema, type PetLevelBucket, type PetMarketListing } from "../../schemas/pet-market";

export type PetLevelBucketSpec = { minLevel: number; maxLevel: number };

export function buildPetLevelBuckets(
  canonicalPetId: string,
  listings: readonly PetMarketListing[],
  specs: readonly PetLevelBucketSpec[],
): PetLevelBucket[] {
  return specs.map(spec => {
    const samples = listings
      .filter(listing => listing.canonicalPetId === canonicalPetId && listing.level >= spec.minLevel && listing.level <= spec.maxLevel)
      .sort((a, b) => a.coins - b.coins || b.level - a.level || a.listingId.localeCompare(b.listingId));
    return petLevelBucketSchema.parse({
      canonicalPetId,
      minLevel: spec.minLevel,
      maxLevel: spec.maxLevel,
      sampleCount: samples.length,
      representative: representativeListing(samples),
      confidence: samples.length >= 5 ? "HIGH" : samples.length >= 2 ? "MEDIUM" : "LOW",
    });
  });
}

export function chooseAffordablePetListing(
  buckets: readonly PetLevelBucket[],
  budgetCoins: number,
  heldItemCoins = 0,
) {
  return buckets
    .flatMap(bucket => bucket.representative ? [{ bucket, listing: bucket.representative }] : [])
    .map(value => ({ ...value, heldItemCoins, totalCoins: value.listing.coins + heldItemCoins }))
    .filter(value => value.totalCoins <= budgetCoins)
    .sort((a, b) =>
      b.listing.level - a.listing.level ||
      b.bucket.confidence.localeCompare(a.bucket.confidence) ||
      a.totalCoins - b.totalCoins ||
      a.listing.listingId.localeCompare(b.listing.listingId)
    )[0] ?? null;
}

function representativeListing(samples: readonly PetMarketListing[]) {
  if (samples.length === 0) return null;
  // Use the lower median asking price rather than the single cheapest listing.
  // This resists one anomalously cheap listing while remaining deterministic.
  return samples[Math.floor((samples.length - 1) / 2)] ?? null;
}
