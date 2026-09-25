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

const outputPath = "docs/phase-5.2e-mining-item-nbt.json";
const targetIds = new Set([
  "DIVAN_HELMET",
  "DIVAN_CHESTPLATE",
  "DIVAN_LEGGINGS",
  "DIVAN_BOOTS",
  "TITANIUM_DRILL_4",
]);

async function main() {
  const [usernameOrUuid = "ShinyFloa", requestedProfile] = process.argv.slice(2);
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
      if (!item?.id || !targetIds.has(item.id)) continue;
      matches.push({
        id: item.id,
        uuid: item.uuid,
        name: item.name,
        source,
        slotIndex,
        extraAttributes: item.extraAttributes,
        rawLore: item.rawLore,
        cleanLore: item.cleanLore,
      });
    }
  }

  const artifact = {
    generatedAt: new Date().toISOString(),
    player: {
      username: identity.username,
      uuid: identity.uuid,
      profileId: selected.profile_id,
      profileName: selected.cute_name,
    },
    targetIds: [...targetIds],
    matches,
    warnings,
  };

  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath} (${matches.length} matching item instances).`);
}

main().catch(async error => {
  const artifact = {
    generatedAt: new Date().toISOString(),
    fatalError: error instanceof Error ? error.message : "Mining item NBT inspection failed.",
  };
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.error(`Mining item NBT inspection failed. Details were written to ${outputPath}.`);
  process.exitCode = 1;
});
