import { promises as fs } from "node:fs";
import path from "node:path";
import { buildCandidateTraceInspection } from "./inspect-candidate-trace";

async function main() {
  const trace = await buildCandidateTraceInspection({ username: "iTimess", requestedProfile: "Lemon", budgetCoins: 30_000_000, probes: ["NECRON", "MIDAS"] });
  const artifact = {
    ...trace,
    rootCauseSummary: {
      necronArmor: {
        presentInCatalog: true, correctlyCategorized: true, consideredByArmorBuilder: true,
        nominatableBeforeCap: true, firstExclusionStage: "LANE_CAP", rootCauseClassification: "I",
        conclusion: "All four POWER_WITHER Necron armor pieces prepare successfully and qualify before ranking, but none ranks within a top-six armor lane. Set-bonus text cannot nominate armor.",
      },
      midasWeapons: {
        presentInCatalog: true, correctlyCategorized: true, consideredByWeaponBuilder: true,
        nominatableBeforeCap: true, firstExclusionStage: "LANE_CAP", rootCauseClassification: "I",
        conclusion: "Base and starred Midas Staff/Sword entries prepare successfully as swords and qualify through stats and ability text, but none ranks within a top-six weapon lane.",
      },
    },
    recommendedNextImplementation: {
      files: ["src/server/candidates/armor.ts", "src/server/candidates/weapon.ts", "src/server/advisor/build-live-context.ts", "tests/armor-candidates.test.ts", "tests/weapon-candidates.test.ts"],
      behavior: "Expose an advisor-discovery lane/pool containing every prepared item with qualifying deterministic evidence before the Phase 3 top-six presentation cap. Keep existing capped Phase 3 outputs unchanged and pass the broader pool through Phase 4.2 relevance and Phase 4.3 frontier selection.",
      scope: "Armor and weapons; shared preparation behavior does not need to change.",
      tests: [
        "A qualifying armor item below rank six is absent from capped Phase 3 lanes but present in advisor discovery.",
        "Qualifying base and starred weapons below rank six remain visible to advisor discovery.",
        "Wrong slot/type, owned exact IDs, and items with no qualifying facts remain excluded.",
        "The Phase 4.3 final context remains at or below 32 and existing goal-relevance regressions pass.",
      ],
      falsePositiveRisk: "The raw/relevant universes will grow and may include many weak numeric improvements. Existing goal relevance and structural frontier ceilings should control prompt size, but distributions must be revalidated.",
      frontierChangeRequired: false,
    },
    productionCandidateBehaviorChanged: false,
    openAIRequestMade: false,
    unresolvedExternalFact: "The repository does not model like-for-like candidate reforges/stars or semantic set/ability value, so this investigation cannot establish whether Necron or Midas should be recommended. That fact is not needed to identify the raw-scope exclusion stage.",
  };
  const output = path.resolve("docs/phase-4.4-candidate-coverage-investigation.json");
  await fs.writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(JSON.stringify({ output, probeCounts: Object.fromEntries(Object.entries(trace.probes).map(([probe, value]) => [probe, value.matchCount])),
    controls: trace.controls.map(value => ({ id: value.catalog.itemId, rawAdvisorPresence: value.rawAdvisorPresence })) }, null, 2));
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Investigation artifact generation failed."); process.exitCode = 1; });
