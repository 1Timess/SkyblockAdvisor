import assert from "node:assert/strict";
import test from "node:test";
import { TtlCache } from "../src/server/cache/ttl-cache";
import { resolvePlayer } from "../src/server/minecraft/resolve-player";
import { selectProfile } from "../src/server/hypixel/profiles";
import { HypixelClient } from "../src/server/hypixel/client";
import { fixtureProfiles, fixtureUuid } from "./fixtures/profile";

test("identity uses official routes, canonical UUID and successful lookup cache", async () => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async input => { calls.push(String(input)); return Response.json({ id: fixtureUuid, name: "FixturePlayer" }); };
  const cache = new TtlCache();
  assert.equal((await resolvePlayer("FixturePlayer", fetcher, cache)).uuid, fixtureUuid);
  await resolvePlayer("fixtureplayer", fetcher, cache);
  assert.equal(calls.length, 1);
  await resolvePlayer("01234567-89ab-cdef-0123-456789abcdef", fetcher, new TtlCache());
  assert.equal(calls[1], `https://sessionserver.mojang.com/session/minecraft/profile/${fixtureUuid}`);
});
test("identity distinguishes absent players, malformed responses and upstream failures", async () => {
  for (const status of [204, 404]) await assert.rejects(resolvePlayer("Nobody", async () => new Response(null, { status }), new TtlCache()), { code: "PLAYER_NOT_FOUND" });
  await assert.rejects(resolvePlayer("Nobody", async () => new Response(""), new TtlCache()), { code: "PLAYER_NOT_FOUND" });
  await assert.rejects(resolvePlayer("Nobody", async () => Response.json({ nope: true }), new TtlCache()), { code: "INVALID_IDENTITY" });
  await assert.rejects(resolvePlayer("Nobody", async () => new Response(null, { status: 500 }), new TtlCache()), { code: "IDENTITY_UPSTREAM_ERROR" });
});
test("profile selector supports ID, case-insensitive cute name, selected and first fallbacks", () => {
  const first = { ...fixtureProfiles()[0], selected: false }, second = { ...first, profile_id: "second", cute_name: "Pear", selected: true };
  assert.equal(selectProfile([first, second]), second);
  assert.equal(selectProfile([first, second], "PEAR"), second);
  assert.equal(selectProfile([first, second], first.profile_id), first);
  assert.equal(selectProfile([first]), first);
  assert.throws(() => selectProfile([]), { code: "NO_PROFILES" });
  assert.throws(() => selectProfile([first], "missing"), { code: "PROFILE_NOT_FOUND" });
});
test("TTL expires values and bounds cache size", () => {
  let now = 0; const cache = new TtlCache(() => now, 2);
  cache.set("a", 1, 1); assert.equal(cache.get("a"), 1);
  now = 1000; assert.equal(cache.get("a"), null);
  cache.set("a", 1, 10); cache.set("b", 2, 10); cache.set("c", 3, 10);
  assert.equal(cache.get("a"), null); assert.equal(cache.get("c"), 3);
});
test("Hypixel client sends server key, caches profiles, and does not cache failures", async () => {
  let calls = 0;
  const client = new HypixelClient(async (_url, options) => {
    calls++; assert.equal(new Headers(options?.headers).get("API-Key"), "fixture-key");
    return Response.json({ success: true, profiles: fixtureProfiles() });
  }, new TtlCache(), () => "fixture-key");
  await client.getProfiles(fixtureUuid); await client.getProfiles(fixtureUuid); assert.equal(calls, 1);
  const failing = new HypixelClient(async () => new Response(null, { status: 429 }), new TtlCache(), () => "fixture-key");
  await assert.rejects(failing.getProfiles(fixtureUuid), { code: "HYPIXEL_RATE_LIMITED" });
});
