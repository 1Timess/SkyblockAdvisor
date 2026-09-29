import assert from "node:assert/strict";
import test from "node:test";
import { fetchUpstream } from "../src/server/http";

test("transport errors identify the failed service without revealing request credentials or UUID", async () => {
  const credential = "sensitive-test-key", uuid = "0123456789abcdef0123456789abcdef";
  const fail: typeof fetch = async () => { throw Object.assign(new Error("fetch failed"), { cause: { code: "ENOTFOUND" } }); };
  await assert.rejects(fetchUpstream(`https://api.hypixel.net/v2/skyblock/garden?profile=${uuid}`, fail,
    { "API-Key": credential }), error => {
    assert.equal((error as { code: string }).code, "UPSTREAM_UNAVAILABLE");
    assert.match((error as Error).message, /Hypixel Garden lookup failed to connect \(ENOTFOUND\)/);
    assert.ok(!(error as Error).message.includes(credential));
    assert.ok(!(error as Error).message.includes(uuid));
    return true;
  });
  await assert.rejects(fetchUpstream("https://api.mojang.com/users/profiles/minecraft/example",
    async () => { throw new DOMException("The operation was aborted", "TimeoutError"); }),
  { message: "Minecraft identity lookup timed out. Try again shortly." });
});
