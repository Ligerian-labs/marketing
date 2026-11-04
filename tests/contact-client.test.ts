// The browser submit flow with a fake fetch and a recording analytics hook.
// Run: node --test tests/contact-client.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { submitEnquiry, type ClientEnv } from "../src/lib/contact-client.ts";

const payload = {
  name: "Camille Synthétique",
  email: "camille@example.invalid",
  company: "",
  projectType: "existing-software",
  description: "Reprendre un outil interne de planification.",
  timing: "",
  budget: "",
  consent: true,
  website: "",
};
const prod = { hostname: "ligerianlabs.fr", automated: false };

function harness(reply: () => Promise<Response>, visit = prod) {
  const calls: { url: string; init: RequestInit }[] = [];
  const events: [string, unknown][] = [];
  const env: ClientEnv = {
    visit,
    fetch: (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return reply();
    }) as typeof fetch,
    capture: (name, properties) => void events.push([name, properties]),
  };
  return { env, calls, events };
}
const json = (status: number, body: unknown) => async () =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("submitEnquiry", () => {
  test("an accepted enquiry is sent once and counted once with only project_type", async () => {
    const { env, calls, events } = harness(json(200, { ok: true, id: "lead_1_ab" }));
    assert.deepEqual(await submitEnquiry(payload, env), { status: "sent" });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/contact");
    assert.deepEqual(events, [["contact_form_submitted", { project_type: "existing-software" }]]);
  });

  test("the event never carries visitor text, whatever the server replies", async () => {
    const { env, events } = harness(json(200, { ok: true, id: "lead_1_ab", name: "Camille", email: "c@example.invalid" }));
    await submitEnquiry({ ...payload, description: "Secret description text." }, env);
    assert.equal(JSON.stringify(events).includes("Camille"), false);
    assert.equal(JSON.stringify(events).includes("example.invalid"), false);
    assert.equal(JSON.stringify(events).includes("Secret"), false);
    assert.deepEqual(Object.keys((events[0][1] as object)), ["project_type"]);
  });

  test("honeypot reply (success without an id) is not counted", async () => {
    const { env, events } = harness(json(200, { ok: true }));
    assert.deepEqual(await submitEnquiry(payload, env), { status: "sent" });
    assert.deepEqual(events, []);
  });

  test("no event on any failure", async () => {
    const failures: [string, () => Promise<Response>, unknown][] = [
      ["network error", async () => Promise.reject(new TypeError("fetch failed")), { status: "failed", reason: "network" }],
      ["server 500", json(500, { ok: false }), { status: "failed", reason: "server" }],
      ["413", json(413, { ok: false }), { status: "failed", reason: "server" }],
      ["non-JSON 502", async () => new Response("<h1>Bad gateway</h1>", { status: 502 }), { status: "failed", reason: "server" }],
      ["400 without fields", json(400, { ok: false }), { status: "failed", reason: "server" }],
      ["server field errors", json(400, { ok: false, fields: { email: "Adresse refusée.", bogus: "x", name: 7 } }), { status: "fields", errors: { email: "Adresse refusée." } }],
    ];
    for (const [label, reply, expected] of failures) {
      const { env, events } = harness(reply);
      assert.deepEqual(await submitEnquiry(payload, env), expected, label);
      assert.deepEqual(events, [], label);
    }
  });

  test("a 2xx that is not a stored lead is not counted even if it looks ok", async () => {
    for (const body of [{ ok: false, id: "lead_1" }, { ok: true, id: "x" }, { id: "lead_1" }, "ok", null]) {
      const { env, events } = harness(json(200, body));
      await submitEnquiry(payload, env);
      assert.deepEqual(events, [], JSON.stringify(body));
    }
  });

  test("client-side validation failure sends nothing and counts nothing", async () => {
    const { env, calls, events } = harness(json(200, { ok: true, id: "lead_1_ab" }));
    const outcome = await submitEnquiry({ ...payload, email: "nope", consent: false }, env);
    assert.equal(outcome.status, "invalid");
    assert.deepEqual(Object.keys((outcome as { errors: object }).errors).sort(), ["consent", "email"]);
    assert.equal(calls.length, 0);
    assert.deepEqual(events, []);
  });

  test("local, automated and IP-literal visits are accepted but not counted", async () => {
    for (const visit of [{ hostname: "localhost" }, { hostname: "[::ffff:7f00:1]" }, { hostname: "ligerianlabs.fr", automated: true }]) {
      const { env, events } = harness(json(200, { ok: true, id: "lead_1_ab" }), visit);
      assert.deepEqual(await submitEnquiry(payload, env), { status: "sent" }, JSON.stringify(visit));
      assert.deepEqual(events, [], JSON.stringify(visit));
    }
  });

  test("missing or throwing analytics never changes the outcome", async () => {
    const reply = json(200, { ok: true, id: "lead_1_ab" });
    const { env } = harness(reply);
    assert.deepEqual(await submitEnquiry(payload, { ...env, capture: undefined }), { status: "sent" });
    const throwing = { ...env, capture: () => { throw new Error("analytics down"); } };
    assert.deepEqual(await submitEnquiry(payload, throwing), { status: "sent" });
  });

  test("the request body is the payload and nothing else", async () => {
    const { env, calls } = harness(json(200, { ok: true, id: "lead_1_ab" }));
    await submitEnquiry(payload, env);
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), payload);
    assert.equal(calls[0].init.method, "POST");
  });
});
