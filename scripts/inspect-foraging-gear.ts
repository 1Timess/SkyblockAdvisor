import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { resolvePlayer } from "../src/server/minecraft/resolve-player";
import { hypixelClient } from "../src/server/hypixel/client";
import { selectProfile } from "../src/server/hypixel/profiles";
import { memberSchema } from "../src/server/hypixel/types";
import { collectInventories } from "../src/server/skyblock/profile/inventory-sources";
import { decodeInventory } from "../src/server/skyblock/nbt/decode-inventory";
import { processItem, object, toProfileItem } from "../src/server/skyblock/items/process-item";
import { isForagingItem } from "../src/server/foraging/gear-state";
import type { ProfileWarning } from "../src/schemas/items";

const sensitive = /^(?:uuid|timestamp|uid|originTag)$/i;
function sanitizedExtra(extra: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(extra).filter(([key]) => !sensitive.test(key)).sort(([a], [b]) => a.localeCompare(b)));
}

async function main() {
  const [usernameOrUuid, requestedProfile] = process.argv.slice(2);
  if (!usernameOrUuid) throw new Error("Usage: npm run inspect:foraging-gear -- <username-or-uuid> [profile]");
  const identity = await resolvePlayer(usernameOrUuid);
  const profile = selectProfile(await hypixelClient.getProfiles(identity.uuid), requestedProfile);
  const parsed = memberSchema.safeParse(profile.members[identity.uuid]);
  if (!parsed.success) throw new Error("Selected member failed the Hypixel member contract.");

  const warnings: ProfileWarning[] = [];
  const decoded = await Promise.all(collectInventories(parsed.data, warnings).map(async ({ source, encoded }) => {
    const localWarnings: ProfileWarning[] = [];
    const raw = await decodeInventory(encoded, source, localWarnings);
    const items = raw.map((value, slot) => {
      const processed = processItem(value, source, slot, localWarnings);
      if (!processed || !isForagingItem(toProfileItem(processed))) return null;
      return {
        normalized: toProfileItem(processed),
        extraAttributeKeys: Object.keys(processed.extraAttributes).sort(),
        extraAttributes: sanitizedExtra(processed.extraAttributes),
      };
    }).filter(value => value !== null);
    return { source, items, warnings: localWarnings };
  }));

  const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const output = `docs/foraging-gear-${safe(identity.username)}-${safe(profile.cute_name)}.json`;
  await mkdir("docs", { recursive: true });
  await writeFile(output, `${JSON.stringify({
    generatedAt: new Date().toISOString(), lunaCalls: 0,
    player: { username: identity.username, profile: profile.cute_name, profileId: profile.profile_id },
    items: decoded.flatMap(result => result.items),
    warnings: [...warnings, ...decoded.flatMap(result => result.warnings)],
  }, null, 2)}\n`, "utf8");
  console.log(`Wrote ${output}`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
