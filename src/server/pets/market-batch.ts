import type { PetMutation } from "../../schemas/pet-mutations";
import type { PricedPetMutation } from "../../schemas/pet-market";
import { pricePetMutation, type PetMarketResolver } from "./market";

export async function pricePetMutations(
  mutations: readonly PetMutation[],
  resolver: PetMarketResolver,
): Promise<PricedPetMutation[]> {
  const cached = cacheResolver(resolver);
  return Promise.all(mutations.map(mutation => pricePetMutation(mutation, cached)));
}

function cacheResolver(resolver: PetMarketResolver): PetMarketResolver {
  const itemQuotes = new Map<string, ReturnType<PetMarketResolver["quoteItem"]>>();
  const petQuotes = new Map<string, ReturnType<PetMarketResolver["quotePet"]>>();
  return {
    quoteItem(itemId) {
      let quote = itemQuotes.get(itemId);
      if (!quote) {
        quote = resolver.quoteItem(itemId);
        itemQuotes.set(itemId, quote);
      }
      return quote;
    },
    quotePet(canonicalPetId) {
      let quote = petQuotes.get(canonicalPetId);
      if (!quote) {
        quote = resolver.quotePet(canonicalPetId);
        petQuotes.set(canonicalPetId, quote);
      }
      return quote;
    },
  };
}
