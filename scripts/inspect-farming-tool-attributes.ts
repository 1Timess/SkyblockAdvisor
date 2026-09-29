import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { resolvePlayer } from "../src/server/minecraft/resolve-player";
import { hypixelClient } from "../src/server/hypixel/client";
import { selectProfile } from "../src/server/hypixel/profiles";
import { memberSchema } from "../src/server/hypixel/types";
import { collectInventories } from "../src/server/skyblock/profile/inventory-sources";
import { decodeInventory } from "../src/server/skyblock/nbt/decode-inventory";
import { processItem } from "../src/server/skyblock/items/process-item";
import { inspectFarmingToolAttributes } from "../src/server/farming/tool-attribute-inspection";
import type { ProfileWarning } from "../src/schemas/items";

async function main() {
  const [usernameOrUuid, requestedProfile] = process.argv.slice(2);
  if (!usernameOrUuid) throw new Error("Usage: npm run inspect:farming-tool-attributes -- <username-or-uuid> [profile]");
  const identity = await resolvePlayer(usernameOrUuid);
  const selected = selectProfile(await hypixelClient.getProfiles(identity.uuid), requestedProfile);
  const member = memberSchema.parse(selected.members[identity.uuid]);
  const warnings: ProfileWarning[] = [];
  const sources = collectInventories(member, warnings);
  const items = (await Promise.all(sources.map(async ({ source, encoded }) => {
    const decoded = await decodeInventory(encoded, source, warnings);
    return decoded.flatMap((raw, slot) => {
      const item = processItem(raw, source, slot, warnings);
      return item ? [item] : [];
    });
  }))).flat();
  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const output = `docs/farming-tool-attributes-${safe(identity.username)}-${safe(selected.cute_name)}.json`;
  await mkdir("docs", { recursive: true });
  await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), lunaCalls: 0,
    player: { username: identity.username, profile: selected.cute_name },
    evidence: inspectFarmingToolAttributes(items),
    unavailableSources: warnings.filter(w => w.code === "API_DATA_DISABLED" || w.code === "INVENTORY_DECODE_FAILED")
      .map(w => ({ code: w.code, scope: w.scope ?? null })),
  }, null, 2)}\n`, "utf8");
  console.log(`Wrote ${output}`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
