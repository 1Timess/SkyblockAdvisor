# SkyBlock Advisor

A SkyBlock profile data platform. It resolves Minecraft identity, reads Hypixel profiles, decodes inventories once, and returns readable gear, accessories, pets, economy, and progression data.

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
```

Offline tests need neither credentials nor network access. For the HTTP checkpoint, start the app and run:

```powershell
npm run validate:live -- <username> http://localhost:3000
```

The live scripts output compact summaries. They do not save raw player fixtures.

## Scope

Phase 1 provides the data API and a minimal landing page. Profile UI, market ingestion, candidate lanes, and the advisor are later phases. Pet stat/lore enrichment is optional and currently empty. Unknown item text remains readable; displayed stat totals are not a full game simulation.

- [Architecture](docs/architecture.md)
- [Data contracts and source mappings](docs/data-sources.md)
- [Implementation checkpoints](docs/implementation-plan.md)
- [Validation record](docs/validation.md)
