const excluded = new Set(["PET:UNKNOWN", "RUNE", "NEW_YEAR_CAKE"]);

interface PetInfo { type?: unknown; tier?: unknown }
export function resolveMarketKey(itemId: string, extraAttributes: Record<string, unknown>): string | null {
  let key = itemId;
  if (itemId === "PET") {
    const raw = extraAttributes.petInfo;
    try {
      const pet = typeof raw === "string" ? JSON.parse(raw) as PetInfo : null;
      key = pet && typeof pet.type === "string" && typeof pet.tier === "string" ? `PET:${pet.type}:${pet.tier}` : "PET:UNKNOWN";
    } catch { key = "PET:UNKNOWN"; }
  }
  return excluded.has(key) ? null : key;
}
