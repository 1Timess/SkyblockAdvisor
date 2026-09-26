import type { PetMutation } from "../../schemas/pet-mutations";
import { pricedPetMutationSchema, type PetMarketQuote, type PricedPetMutation } from "../../schemas/pet-market";

export type PetMarketResolver = {
  quoteItem(itemId: string): Promise<PetMarketQuote | null>;
};

export async function pricePetMutation(mutation: PetMutation, resolver: PetMarketResolver): Promise<PricedPetMutation> {
  const fixedCoins = mutation.requirements.coins ?? 0;
  const quotes: PetMarketQuote[] = [];
  const unresolvedKeys: string[] = [];

  if (mutation.kind === "ACQUIRE") {
    // Acquisition prices are level-aware and resolved through acquisition-choices.ts.
    // A rarity-only quote would collapse materially different pet market states.
    unresolvedKeys.push(`pet-acquisition:${mutation.after.canonicalPetId}:level-aware`);
  }

  if (mutation.kind === "CHANGE_HELD_ITEM" && mutation.after.heldItem) {
    await addItemQuote(mutation.after.heldItem, 1, resolver, quotes, unresolvedKeys);
  }

  for (const cost of mutation.requirements.itemCosts) {
    // CHANGE_HELD_ITEM already prices its required item through the concrete after-state.
    if (mutation.kind === "CHANGE_HELD_ITEM" && cost.itemId === mutation.after.heldItem && cost.count === 1) continue;
    await addItemQuote(cost.itemId, cost.count, resolver, quotes, unresolvedKeys);
  }

  const marketCoins = quotes.reduce((sum, quote) => sum + quote.coins, 0);
  const resolvedMarketComponents = quotes.length;
  const costStatus = unresolvedKeys.length === 0
    ? "RESOLVED"
    : resolvedMarketComponents > 0 || fixedCoins > 0 ? "PARTIAL" : "UNRESOLVED";

  return pricedPetMutationSchema.parse({
    mutation, costStatus, fixedCoins, marketCoins,
    totalCoins: unresolvedKeys.length === 0 ? fixedCoins + marketCoins : null,
    quotes, unresolvedKeys,
  });
}

async function addItemQuote(
  itemId: string,
  count: number,
  resolver: PetMarketResolver,
  quotes: PetMarketQuote[],
  unresolvedKeys: string[],
) {
  const quote = await resolver.quoteItem(itemId);
  if (!quote) {
    unresolvedKeys.push(`item:${itemId}:${count}`);
    return;
  }
  quotes.push({ ...quote, key: `item:${itemId}:${count}`, coins: quote.coins * count });
}
