import "server-only";
import { writeFile } from "node:fs/promises";
import { resolvePlayer } from "../src/server/minecraft/resolve-player";
import { hypixelClient } from "../src/server/hypixel/client";
import { memberSchema } from "../src/server/hypixel/types";
import { selectProfile } from "../src/server/hypixel/profiles";
import { collectInventories } from "../src/server/skyblock/profile/inventory-sources";
import { decodeInventory } from "../src/server/skyblock/nbt/decode-inventory";
import { processItem } from "../src/server/skyblock/items/process-item";
import type { ProfileWarning } from "../src/schemas/items";

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  const usernameOrUuid = process.argv[2]?.trim();
  const requestedProfile = process.argv[3]?.trim() || undefined;
  if (!usernameOrUuid) {
    throw new Error(
      "Provide a Minecraft username or UUID. Example: npm run inspect:mining-drill-components -- ShinyFloa Cucumber",
    );
  }

  const warnings: ProfileWarning[] = [];
  const identity = await resolvePlayer(usernameOrUuid);
  const profiles = await hypixelClient.getProfiles(identity.uuid);
  const selected = selectProfile(profiles, requestedProfile);
  const rawMember = selected.members[identity.uuid];
  if (!rawMember) throw new Error("The selected profile does not contain this player.");

  const member = memberSchema.parse(rawMember);
  const matches = [];

  for (const { source, encoded } of collectInventories(member, warnings)) {
    const sourceWarnings: ProfileWarning[] = [];
    const rawItems = await decodeInventory(encoded, source, sourceWarnings);
    warnings.push(...sourceWarnings);

    for (let slotIndex = 0; slotIndex < rawItems.length; slotIndex += 1) {
      const item = processItem(rawItems[slotIndex], source, slotIndex, warnings);
      if (!item || !item.categories.includes("drill")) continue;
      matches.push({
        id: item.id,
        uuid: item.uuid,
        name: item.name,
        source,
        slotIndex,
        categories: item.categories,
        stats: item.stats,
        reforge: item.reforge,
        extraAttributes: item.extraAttributes,
        rawLore: item.rawLore,
        cleanLore: item.cleanLore,
      });
    }
  }

  const profileName = selected.cute_name;
  const outputPath = `docs/phase-5.2eh-mining-drill-components-${slug(identity.username)}-${slug(profileName)}.json`;
  const artifact = {
    generatedAt: new Date().toISOString(),
    player: {
      username: identity.username,
      uuid: identity.uuid,
      profileId: selected.profile_id,
      profileName,
    },
    matches,
    warnings,
  };

  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath} (${matches.length} drill instances).`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Mining drill component inspection failed.");
  process.exitCode = 1;
});
