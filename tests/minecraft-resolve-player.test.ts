import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../src/server/errors";
import { resolvePlayer } from "../src/server/minecraft/resolve-player";
import { TtlCache } from "../src/server/cache/ttl-cache";

const UUID = "1234567890abcdef1234567890abcdef";

function response(status: number, body: unknown) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("identity resolution falls through Mowojang transport failure to Mojang", async () => {
  const calls: string[] = [];
  const fetcher = async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("mowojang.matdoes.dev")) {
      const error = new Error("DNS lookup failed");
      Object.assign(error, { cause: { code: "ENOTFOUND" } });
      throw error;
    }
    if (url.includes("api.mojang.com")) {
      return response(200, { id: UUID, name: "FixturePlayer" });
    }
    throw new Error(`Unexpected provider: ${url}`);
  };

  const identity = await resolvePlayer("FixturePlayer", fetcher, new TtlCache());

  assert.deepEqual(identity, { uuid: UUID, username: "FixturePlayer" });
  assert.equal(calls.filter(url => url.includes("mowojang.matdoes.dev")).length, 3);
  assert.equal(calls.filter(url => url.includes("api.mojang.com")).length, 1);
});

test("identity resolution treats Mowojang's player-not-found response as non-authoritative and falls through", async () => {
  const calls: string[] = [];
  const fetcher = async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("mowojang.matdoes.dev")) return response(200, "player not found");
    if (url.includes("api.mojang.com")) return response(200, { id: UUID, name: "FixturePlayer" });
    throw new Error(`Unexpected provider: ${url}`);
  };

  const identity = await resolvePlayer("FixturePlayer", fetcher, new TtlCache());

  assert.deepEqual(identity, { uuid: UUID, username: "FixturePlayer" });
  assert.equal(calls.length, 2);
});

test("identity resolution does not turn an upstream failure into PLAYER_NOT_FOUND", async () => {
  const fetcher = async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("mowojang.matdoes.dev")) return response(404, "");
    if (url.includes("api.mojang.com")) return response(503, "");
    if (url.includes("api.minecraftservices.com")) return response(503, "");
    throw new Error(`Unexpected provider: ${url}`);
  };

  await assert.rejects(
    resolvePlayer("MissingOrUnavailable", fetcher, new TtlCache()),
    (error) => error instanceof AppError && error.code === "IDENTITY_UPSTREAM_ERROR" && error.status === 502,
  );
});

test("successful identity resolution caches both username and UUID for 24 hours", async () => {
  let calls = 0;
  const fetcher = async (input: string | URL | Request) => {
    calls += 1;
    const url = String(input);
    assert.ok(url.includes("mowojang.matdoes.dev"));
    return response(200, { id: UUID, name: "FixturePlayer" });
  };

  const store = new TtlCache();
  const first = await resolvePlayer("FixturePlayer", fetcher, store);
  const second = await resolvePlayer(UUID, fetcher, store);

  assert.deepEqual(second, first);
  assert.equal(calls, 1);
});

test("concurrent identity requests are singleflighted", async () => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });

  const fetcher = async (input: string | URL | Request) => {
    calls += 1;
    const url = String(input);
    assert.ok(url.includes("mowojang.matdoes.dev"));
    await gate;
    return response(200, { id: UUID, name: "FixturePlayer" });
  };

  const store = new TtlCache();
  const first = resolvePlayer("FixturePlayer", fetcher, store);
  const second = resolvePlayer("FixturePlayer", fetcher, store);
  release();

  const [a, b] = await Promise.all([first, second]);
  assert.deepEqual(a, b);
  assert.equal(calls, 1);
});
