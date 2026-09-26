import type { PetMutation } from "../../schemas/pet-mutations";
import { pricedPetMutationSchema, type PetMarketQuote, type PricedPetMutation } from "../../schemas/pet-market";

export type PetMarketResolver = {
  quoteItem(itemId: string): Promise<PetMarketQuote | null>;
  quotePet(canonicalPetId: string): Promise<PetMarketQuote | null>;
};

export async function pricePetMutation(mutation: PetMutation, resolver: PetMarketResolver): Promise<PricedPetMutation> {
  const fixedCoins = mutation.requirements.coins ?? 0;
  const quotes: PetMarketQuote[] = [];
  const unresolvedKeys: string[] = [];

  if (mutation.kind === "ACQUIRE") {
    const key = `pet:${mutation.after.canonicalPetId}`;
    const quote = await resolver.quotePet(mutation.after.canonicalPetId);
    if (quote) quotes.push(quote); else unresolvedKeys.push(key);
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
  const expectedMarketComponents =
    (mutation.kind === "ACQUIRE" ? 1 : 0) +
    (mutation.kind === "CHANGE_HELD_ITEM" && mutation.after.heldItem ? 1 : 0) +
    mutation.requirements.itemCosts.filter(cost => !(mutation.kind === "CHANGE_HELD_ITEM" && cost.itemId === mutation.after.heldItem && cost.count === 1)).length;

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
