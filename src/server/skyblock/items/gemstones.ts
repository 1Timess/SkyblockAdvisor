import type { GemstoneQuality, GemstoneSlot, GemstoneState } from "../../../schemas/items";
import { object } from "./process-item";

const qualities = new Set<GemstoneQuality>(["ROUGH", "FLAWED", "FINE", "FLAWLESS", "PERFECT"]);
const divanSlots = ["AMBER_0", "JADE_0", "AMBER_1", "JADE_1", "TOPAZ_0"] as const;

export function extractGemstoneState(itemId: string | null, extraAttributes: Record<string, unknown>): GemstoneState | undefined {
  const raw = object(extraAttributes.gems);
  if (!Object.keys(raw).length) return undefined;
  const unlocked = new Set(Array.isArray(raw.unlocked_slots) ? raw.unlocked_slots.filter((value): value is string => typeof value === "string") : []);
  const expected = itemId?.startsWith("DIVAN_") ? [...divanSlots] : [];
  const observed = new Set<string>([
    ...expected,
    ...unlocked,
    ...Object.keys(raw).filter(key => key !== "unlocked_slots" && !key.endsWith("_gem") && /^[A-Z]+_\d+$/.test(key)),
  ]);
  const slots = [...observed].sort(slotOrder).map(id => buildSlot(id, raw, unlocked, expected.includes(id as typeof divanSlots[number])));
  return { slots, source: "NBT" };
}

function buildSlot(id: string, raw: Record<string, unknown>, unlocked: ReadonlySet<string>, chamberSlot: boolean): GemstoneSlot {
  const value = raw[id];
  const quality = qualityOf(value);
  const fixedType = id.slice(0, id.lastIndexOf("_"));
  const explicitGem = typeof raw[`${id}_gem`] === "string" ? String(raw[`${id}_gem`]) : null;
  const gemstoneType = quality ? (explicitGem ?? (genericSlot(fixedType) ? null : fixedType)) : null;
  const filled = quality !== null;
  const isUnlocked = unlocked.has(id);
  return {
    id,
    slotType: fixedType,
    status: filled ? "FILLED" : isUnlocked ? "UNLOCKED_EMPTY" : chamberSlot ? "LOCKED" : "OBSERVED",
    gemstoneType,
    quality,
    unlockMethod: chamberSlot ? "GEMSTONE_CHAMBER" : isUnlocked ? "ITEM_DEFAULT" : "UNKNOWN",
  };
}

function qualityOf(value: unknown): GemstoneQuality | null {
  if (typeof value === "string" && qualities.has(value as GemstoneQuality)) return value as GemstoneQuality;
  const quality = object(value).quality;
  return typeof quality === "string" && qualities.has(quality as GemstoneQuality) ? quality as GemstoneQuality : null;
}

function genericSlot(type: string) {
  return ["MINING", "UNIVERSAL", "COMBAT", "OFFENSIVE", "DEFENSIVE"].includes(type);
}

function slotOrder(left: string, right: string) {
  const li = divanSlots.indexOf(left as typeof divanSlots[number]), ri = divanSlots.indexOf(right as typeof divanSlots[number]);
  if (li >= 0 || ri >= 0) return (li < 0 ? Number.MAX_SAFE_INTEGER : li) - (ri < 0 ? Number.MAX_SAFE_INTEGER : ri);
  return left.localeCompare(right);
}
