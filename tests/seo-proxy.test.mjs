import assert from "node:assert/strict";
import { test } from "node:test";
import { proxyAnalytics } from "../src/lib/seo-proxy.mjs";

test("proxy forwards event bytes and protocol headers without credentials or identity", async () => {
  const request = new Request("http://localhost/ingest/e/?v=2", { method: "POST", headers: {
    "Content-Type": "application/octet-stream", "Content-Encoding": "gzip", Cookie: "session=synthetic-secret",
    Authorization: "Bearer synthetic-secret", "X-Forwarded-For": "192.0.2.1", "X-Internal-Token": "synthetic-secret",
    Referer: "https://example.invalid/?email=synthetic-secret", "User-Agent": "synthetic-private-agent",
    "Accept-Encoding": "gzip, br", Origin: "https://private.invalid",
  }, body: new Uint8Array([0, 1, 128, 255]) });
  const response = await proxyAnalytics(request, "e/", async (url, init) => {
    assert.equal(String(url), "https://eu.i.posthog.com/e/?v=2");
    assert.equal(init.method, "POST");
    assert.deepEqual(new Uint8Array(init.body), new Uint8Array([0, 1, 128, 255]));
    assert.equal(init.headers.get("content-type"), "application/octet-stream");
    assert.equal(init.headers.get("content-encoding"), "gzip");
    assert.equal(init.headers.get("accept-encoding"), "identity");
    assert.equal(init.redirect, "manual");
    assert.ok(!JSON.stringify([...init.headers]).includes("synthetic"));
    for (const name of ["cookie", "authorization", "x-forwarded-for", "x-internal-token", "referer", "user-agent", "origin"]) assert.equal(init.headers.get(name), null, name);
    return new Response("accepted", { status: 202, headers: { "Content-Type": "text/plain", "Set-Cookie": "unwanted=1", "Content-Encoding": "gzip", "Content-Length": "999", "X-Upstream-Secret": "synthetic-secret" } });
  });
  assert.equal(response.status, 202);
  assert.equal(await response.text(), "accepted");
  for (const name of ["set-cookie", "content-encoding", "content-length", "x-upstream-secret"]) assert.equal(response.headers.get(name), null, name);
});

test("SDK assets, HEAD, conditional status and caching survive proxying", async () => {
  for (const method of ["GET", "HEAD"]) {
    const response = await proxyAnalytics(new Request("http://localhost/ingest/static/array.js", { method, headers: { "If-None-Match": '"asset-1"' } }), "static/array.js", async (url, init) => {
      assert.equal(init.method, method);
      assert.equal(init.body, undefined);
      assert.equal(init.headers.get("if-none-match"), '"asset-1"');
      return new Response(method === "HEAD" ? null : "window.syntheticSdk = true;", { headers: { "Content-Type": "text/javascript", "Cache-Control": "public, max-age=300", ETag: '"asset-1"', "Content-Encoding": "br", "Content-Length": "99", "Set-Cookie": "unwanted=1" } });
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/javascript");
    assert.equal(response.headers.get("cache-control"), "public, max-age=300");
    assert.equal(response.headers.get("etag"), '"asset-1"');
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(response.headers.get("content-encoding"), null);
    assert.equal(response.headers.get("content-length"), null);
    assert.equal(await response.text(), method === "HEAD" ? "" : "window.syntheticSdk = true;");
  }
  const notModified = await proxyAnalytics(new Request("http://localhost/ingest/static/array.js"), "static/array.js", async () => new Response(null, { status: 304, headers: { ETag: '"asset-1"' } }));
  assert.equal(notModified.status, 304);
  assert.equal(await notModified.text(), "");
});

test("proxy handles preflight/failure and keeps redirects on the analytics host", async () => {
  const forbidden = () => { throw new Error("network must not be called"); };
  assert.equal((await proxyAnalytics(new Request("http://localhost/ingest/e/", { method: "OPTIONS" }), "e/", forbidden)).status, 204);
  assert.equal((await proxyAnalytics(new Request("http://localhost/ingest/e/", { method: "DELETE" }), "e/", forbidden)).status, 405);
  assert.equal((await proxyAnalytics(new Request("http://localhost/ingest/e/"), "e/", forbidden)).status, 502);
  const safe = await proxyAnalytics(new Request("http://localhost/ingest/static/array.js"), "static/array.js", async () => new Response(null, { status: 307, headers: { Location: "/static/versioned.js?v=1" } }));
  assert.equal(safe.status, 307);
  assert.equal(safe.headers.get("location"), "/ingest/static/versioned.js?v=1");
  const unsafe = await proxyAnalytics(new Request("http://localhost/ingest/e/"), "e/", async () => new Response(null, { status: 307, headers: { Location: "https://other.example.invalid/" } }));
  assert.equal(unsafe.status, 502);
});
