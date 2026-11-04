// Real-HTTP checks against the built standalone server (`npm run build` first).
// Run: node --test tests/contact-http.test.ts
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { startServer, type TestServer } from "./contact-helpers.ts";

let srv: TestServer;
let base = "";
const storedLeads = () => srv.storedLeads();
const leadFiles = () => srv.leadFiles();

const valid = {
  name: "Camille Synthétique",
  email: "camille@example.invalid",
  company: "Atelier Test",
  projectType: "existing-software",
  description: "Nous voulons reprendre un outil interne de planification.",
  timing: "Début du trimestre prochain",
  budget: "À discuter",
  consent: true,
  website: "",
};

function post(body: unknown, headers: Record<string, string> = { "Content-Type": "application/json" }) {
  return fetch(`${base}/api/contact`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

before(async () => {
  srv = await startServer();
  base = srv.base;
});

after(() => srv?.stop());

beforeEach(() => srv.resetLeads());

describe("contact page", () => {
  test("asks for a project type and no AI-maturity stage", async () => {
    const html = await (await fetch(`${base}/contact/`)).text();
    for (const value of ["new-application", "existing-software", "ai-integration", "other"]) {
      assert.match(html, new RegExp(`name="projectType"[^>]*value="${value}"`), `radio ${value}`);
    }
    assert.doesNotMatch(html, /name="stade"/);
    assert.doesNotMatch(html, /Où en êtes-vous/);
    for (const field of ["name", "email", "company", "description", "timing", "budget"]) {
      assert.match(html, new RegExp(`name="${field}"`), `field ${field}`);
    }
  });
});

describe("accepted enquiry", () => {
  test("is stored in the index and a per-lead file before the 200 returns", async () => {
    const res = await post(valid);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.match(body.id, /^lead_/);

    const [lead] = await storedLeads();
    assert.equal((await storedLeads()).length, 1);
    assert.equal(lead.id, body.id);
    assert.equal(lead.name, valid.name);
    assert.equal(lead.email, valid.email);
    assert.equal(lead.company, valid.company);
    assert.equal(lead.projectType, "existing-software");
    assert.equal(lead.description, valid.description);
    assert.equal(lead.timing, valid.timing);
    assert.equal(lead.budget, valid.budget);
    assert.equal(lead.status, "new");
    assert.deepEqual(await leadFiles(), [`${body.id}.json`]);
  });

  test("optional fields may be omitted", async () => {
    const { company, timing, budget, ...required } = valid;
    const res = await post(required);
    assert.equal(res.status, 200);
    const [lead] = await storedLeads();
    assert.equal(lead.company, null);
    assert.equal(lead.timing, null);
    assert.equal(lead.budget, null);
  });

  test("does not log the visitor's name or email", async () => {
    assert.equal((await post(valid)).status, 200);
    assert.doesNotMatch(srv.log(), /Camille/);
    assert.doesNotMatch(srv.log(), /camille@example\.invalid/);
  });
});

describe("rejected input stores nothing", () => {
  const cases: [string, Record<string, unknown>, string][] = [
    ["missing name", { ...valid, name: "" }, "name"],
    ["name that is not a string", { ...valid, name: ["x"] }, "name"],
    ["malformed email", { ...valid, email: "not-an-email" }, "email"],
    ["email with a line break", { ...valid, email: "a@example.invalid\nBcc: x@example.invalid" }, "email"],
    ["unknown project type", { ...valid, projectType: "crypto" }, "projectType"],
    ["missing project type", { ...valid, projectType: undefined }, "projectType"],
    ["description too short", { ...valid, description: "court" }, "description"],
    ["description too long", { ...valid, description: "x".repeat(4001) }, "description"],
    ["timing too long", { ...valid, timing: "x".repeat(121) }, "timing"],
    ["budget that is not a string", { ...valid, budget: 5000 }, "budget"],
    ["missing consent", { ...valid, consent: false }, "consent"],
  ];
  for (const [label, payload, field] of cases) {
    test(label, async () => {
      const res = await post(payload);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.ok, false);
      assert.ok(body.fields?.[field], `error for ${field}: ${JSON.stringify(body)}`);
      assert.equal((await storedLeads()).length, 0);
      assert.equal((await leadFiles()).length, 0);
    });
  }

  test("non-JSON body is a 400, not a server error", async () => {
    const res = await post("not json");
    assert.equal(res.status, 400);
    assert.equal((await storedLeads()).length, 0);
  });

  test("JSON that is not an object is a 400", async () => {
    for (const body of ["[]", "null", '"text"', "42"]) {
      assert.equal((await post(body)).status, 400, body);
    }
    assert.equal((await storedLeads()).length, 0);
  });

  test("non-JSON content type is a 415", async () => {
    const res = await post(JSON.stringify(valid), { "Content-Type": "application/xml" });
    assert.equal(res.status, 415);
    assert.equal((await storedLeads()).length, 0);
  });

  test("form-style content types never reach storage", async () => {
    // Astro's origin check answers 403 to these before the handler runs; either way nothing is kept.
    for (const type of ["text/plain", "application/x-www-form-urlencoded"]) {
      const res = await post(JSON.stringify(valid), { "Content-Type": type });
      assert.ok([403, 415].includes(res.status), `${type} -> ${res.status}`);
    }
    assert.equal((await storedLeads()).length, 0);
  });

  test("oversized body is a 413", async () => {
    const res = await post({ ...valid, description: "x".repeat(200_000) });
    assert.equal(res.status, 413);
    assert.equal((await storedLeads()).length, 0);
    assert.equal((await leadFiles()).length, 0);
  });
});

describe("honeypot", () => {
  test("looks successful but stores nothing and returns no lead id", async () => {
    const res = await post({ ...valid, website: "https://spam.invalid" });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.id, undefined);
    assert.equal((await storedLeads()).length, 0);
    assert.equal((await leadFiles()).length, 0);
  });
});

describe("stored shape", () => {
  test("ignores fields the form does not define", async () => {
    const res = await post({ ...valid, status: "won", id: "lead_forged", isAdmin: true });
    assert.equal(res.status, 200);
    const [lead] = await storedLeads();
    assert.equal(lead.status, "new");
    assert.notEqual(lead.id, "lead_forged");
    assert.equal("isAdmin" in lead, false);
  });

  test("two quick submissions get distinct ids and files", async () => {
    const [a, b] = await Promise.all([post(valid), post(valid)]);
    const ids = [(await a.json()).id, (await b.json()).id];
    assert.notEqual(ids[0], ids[1]);
    assert.equal((await storedLeads()).length, 2);
    assert.equal((await leadFiles()).length, 2);
  });
});
