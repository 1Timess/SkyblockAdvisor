# SkyBlock Advisor

A SkyBlock profile and reference-data platform. It resolves Minecraft identity, reads Hypixel profiles, decodes inventories once, builds a canonical item catalog, and serves prices from local auction snapshots.

This is a fresh project, separate from HypixelProgressionEngine. The original architecture brief and supplemental data contracts at the repository root are the implementation authority; the supplement wins where it narrows Phase 1.

## Run locally

Tested with Node.js 24 and npm 11. Install the locked dependencies with `npm ci`. Copy `.env.example` to `.env.local` and set HYPIXEL_API_KEY locally. Never commit the key.

```powershell
npm run dev
```

Endpoints:

- `GET /api/skyblock/profiles?username=<username-or-uuid>`
- `GET /api/skyblock/profile?username=<username-or-uuid>&profile=<id-or-cute-name>`

Omit `profile` to prefer the selected profile, then the first available profile. Invalid input returns 400; missing players/profiles/members return 404. Upstream failures return an explicit error. Partial inventories or reference availability produce warnings without discarding unrelated sections.

## Validation

```powershell
npm test
npm run lint
npm run typecheck
npm run build
npm run inspect:profile -- <username> [profile]
npm run inspect:catalog -- [item-id ...]
npm run sync:auctions
npm run inspect:market -- [market-key ...]
npm run inspect:candidates -- <username> [profile] [budget-coins]
npm run inspect:advisor-context -- <username> [profile] [budget-coins] [question]
npm run inspect:advisor -- <username> [profile] [budget-coins] [question]
```

Offline tests need neither credentials nor network access. For the HTTP checkpoint, start the app and run:

```powershell
npm run validate:live -- <username> http://localhost:3000
```

The live scripts output compact summaries. They do not save raw player fixtures. `sync:auctions` writes the ignored local file `data/market/latest.json`; application price lookups only read that snapshot and never fetch one auction per item.

NEU enrichment defaults to `data/neu`. Populate it with `npm run sync:neu`, or set `NEU_DATA_DIRECTORY` to an existing synchronized checkout. The loader reads only item JSON and metadata needed by the catalog.

## Scope

Phases 1 through 4.2 provide the data API, canonical static item catalog, conservative requirement checks, a file-backed auction market snapshot, small deterministic candidate lanes, and a conversational advisor boundary. Deterministic routing loads at most 32 goal-relevant candidates from the active scope while summarizing other available domains. Relevant locked and over-budget possibilities remain visible with structured requirement and budget gaps. Luna owns prioritization, ordering, tradeoffs, and explanation and may return either a clarification or a plan. Profile UI remains deferred. Unknown item text remains readable; displayed stat totals are not a full game simulation.

- [Architecture](docs/architecture.md)
- [Data contracts and source mappings](docs/data-sources.md)
- [Implementation checkpoints](docs/implementation-plan.md)
- [Validation record](docs/validation.md)
