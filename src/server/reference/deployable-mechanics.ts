import type { DeployableMechanics } from "../../schemas/catalog";

function number(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

export function parseDeployableMechanics(lore: readonly string[]): DeployableMechanics | undefined {
  const text = lore.join(" ").replace(/\s+/g, " ");
  const identityLines = lore.map(line => line.trim()).filter(Boolean);
  const deployable = identityLines.some(line => /^Ability:\s*Deploy\b/i.test(line)
    || /^(?:[A-Za-z]+\s+)?Deployable$/i.test(line)
    || /^[A-Z_ ]+\s+DEPLOYABLE$/i.test(line));
  if (!deployable) return undefined;

  const durationMinutes = number(text, /(?:for|lasts? for)\s+(\d+(?:\.\d+)?)m\b/i);
  const durationSeconds = durationMinutes === null ? number(text, /(?:for|lasts? for)\s+(\d+(?:\.\d+)?)s\b/i) : durationMinutes * 60;
  const radiusBlocks = number(text, /within\s+(\d+(?:\.\d+)?)\s+blocks?/i);
  const parsedMaxPlayers = number(text, /(?:buffing|affect(?:ing|s)?)\s+(?:up to\s+)?(\d+)\s+players?/i);
  const maxPlayers = parsedMaxPlayers ?? (/buffing\s+only\s+yourself/i.test(text) ? 1 : null);
  const effects: Record<string, number> = {};
  const effectPatterns: Array<[string, RegExp]> = [
    ["miningSpeed", /Grants?\s+\+(\d+(?:\.\d+)?)\D*Mining Speed/i],
    ["miningFortune", /Grants?\s+\+(\d+(?:\.\d+)?)\D*Mining Fortune/i],
    ["gemstoneSpread", /Grants?\s+\+(\d+(?:\.\d+)?)\D*Gemstone Spread/i],
    ["heatResistance", /Grants?\s+\+(\d+(?:\.\d+)?)\D*Heat Resistance/i],
    ["coldResistance", /Grants?\s+\+(\d+(?:\.\d+)?)\D*Cold Resistance/i],
  ];
  for (const [stat, pattern] of effectPatterns) {
    const value = number(text, pattern);
    if (value !== null) effects[stat] = value;
  }

  return {
    durationSeconds,
    radiusBlocks,
    maxPlayers,
    exclusiveBuff: /Only one deployable (?:buff applies|can be active at a time)/i.test(text),
    mineshaftGlobal: /Glacite Mineshaft/i.test(text) && /regardless of distance/i.test(text),
    effects,
  };
}

export function isMiningRelevantDeployable(mechanics: DeployableMechanics | undefined) {
  if (!mechanics) return false;
  return ["miningSpeed", "miningFortune", "gemstoneSpread", "heatResistance", "coldResistance"]
    .some(stat => mechanics.effects[stat] !== undefined);
}
