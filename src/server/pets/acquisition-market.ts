import { petAcquisitionEnvelopeSchema, type PetAcquisitionEnvelope, type PetMarketQuote } from "../../schemas/pet-market";

export type PetAcquisitionMarketResolver = {
  quotePetAtLevel(canonicalPetId: string, level: number): Promise<PetMarketQuote | null>;
};

export async function resolvePetAcquisitionEnvelope(
  canonicalPetId: string,
  maxLevel: number,
  resolver: PetAcquisitionMarketResolver,
): Promise<PetAcquisitionEnvelope> {
  const minLevel = 1;
  const [lowLevelQuote, maxLevelQuote] = await Promise.all([
    resolver.quotePetAtLevel(canonicalPetId, minLevel),
    resolver.quotePetAtLevel(canonicalPetId, maxLevel),
  ]);
  return petAcquisitionEnvelopeSchema.parse({
    canonicalPetId, minLevel, maxLevel, lowLevelQuote, maxLevelQuote,
  });
}

export function chooseAffordablePetAnchor(
  envelope: PetAcquisitionEnvelope,
  budgetCoins: number,
  heldItemQuote: PetMarketQuote | null = null,
) {
  const itemCoins = heldItemQuote?.coins ?? 0;
  const options = [
    envelope.lowLevelQuote && { level: envelope.minLevel, petCoins: envelope.lowLevelQuote.coins },
    envelope.maxLevelQuote && { level: envelope.maxLevel, petCoins: envelope.maxLevelQuote.coins },
  ].filter((value): value is { level: number; petCoins: number } => Boolean(value))
    .map(value => ({ ...value, heldItemCoins: itemCoins, totalCoins: value.petCoins + itemCoins }))
    .filter(value => value.totalCoins <= budgetCoins)
    .sort((a, b) => b.level - a.level || a.totalCoins - b.totalCoins);
  return options[0] ?? null;
}
