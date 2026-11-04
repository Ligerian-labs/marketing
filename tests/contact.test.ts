// Validation, persistence and analytics rules, without a server or a browser.
// Run: node --test tests/contact.test.ts
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import fsp, { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { LIMITS, PROJECT_TYPES, validateContact } from "../src/lib/contact.ts";
import { isInternalVisit, submittedEvent } from "../src/lib/contact-analytics.ts";
import { appendIndexLine, buildNotification, handleContact, type ContactDeps, type Notification } from "../src/lib/contact-server.ts";

const valid = {
  name: "Camille Synthétique",
  email: "camille@example.invalid",
  projectType: "ai-integration",
  description: "Brancher un assistant sur notre base documentaire.",
  consent: true,
};

describe("validateContact", () => {
  test("accepts the minimal enquiry and normalises optional fields to null", () => {
    const v = validateContact(valid);
    assert.ok(v.ok);
    const { consent, ...fields } = valid;
    assert.deepEqual(v.value, { ...fields, company: null, timing: null, budget: null });
  });

  test("accepts every project type and nothing else", () => {
    for (const projectType of PROJECT_TYPES) assert.ok(validateContact({ ...valid, projectType }).ok, projectType);
    for (const projectType of ["", "AI-integration", "new_application", 1, null, ["other"]]) {
      assert.equal(validateContact({ ...valid, projectType }).ok, false, JSON.stringify(projectType));
    }
  });

  test("limits are inclusive at the maximum and rejected one past it", () => {
    const edges: [string, number][] = [
      ["name", LIMITS.name],
      ["company", LIMITS.company],
      ["description", LIMITS.description],
      ["timing", LIMITS.timing],
      ["budget", LIMITS.budget],
    ];
    for (const [field, max] of edges) {
      assert.ok(validateContact({ ...valid, [field]: "x".repeat(max) }).ok, `${field} at ${max}`);
      assert.equal(validateContact({ ...valid, [field]: "x".repeat(max + 1) }).ok, false, `${field} at ${max + 1}`);
    }
    assert.ok(validateContact({ ...valid, description: "x".repeat(LIMITS.descriptionMin) }).ok);
    assert.equal(validateContact({ ...valid, description: "x".repeat(LIMITS.descriptionMin - 1) }).ok, false);
  });

  test("limits count the trimmed value", () => {
    assert.ok(validateContact({ ...valid, name: `  ${"x".repeat(LIMITS.name)}  ` }).ok);
    assert.equal(validateContact({ ...valid, name: "   " }).ok, false);
  });

  test("rejects malformed emails", () => {
    for (const email of ["", "plain", "a@b", "a@@b.fr", "a b@c.fr", "a@c.fr\nBcc: x@y.fr", "<a@c.fr>", "a@c..fr", "@c.fr", `${"a".repeat(250)}@c.fr`]) {
      assert.equal(validateContact({ ...valid, email }).ok, false, JSON.stringify(email));
    }
    for (const email of ["a@c.fr", "prenom.nom+tag@sous.domaine.example"]) {
      assert.ok(validateContact({ ...valid, email }).ok, email);
    }
  });

  test("rejects wrong types instead of coercing them", () => {
    for (const field of ["name", "email", "description", "company", "timing", "budget"]) {
      for (const bad of [5, true, ["x"], { a: 1 }]) {
        assert.equal(validateContact({ ...valid, [field]: bad }).ok, false, `${field}=${JSON.stringify(bad)}`);
      }
    }
    for (const consent of [false, "true", 1, null, undefined]) {
      assert.equal(validateContact({ ...valid, consent }).ok, false, String(consent));
    }
  });

  test("never throws and never passes unknown keys through", () => {
    for (const input of [null, undefined, 1, "x", [], () => {}]) assert.equal(validateContact(input).ok, false);
    const v = validateContact({ ...valid, status: "won", __proto__: { x: 1 }, isAdmin: true });
    assert.ok(v.ok);
    assert.deepEqual(Object.keys(v.value).sort(), ["budget", "company", "description", "email", "name", "projectType", "timing"]);
  });

  test("strips control characters; the description keeps its line breaks", () => {
    const v = validateContact({ ...valid, name: "A\u0000B\nC", description: "ligne un\r\nligne deux\u0007 fin" });
    assert.ok(v.ok);
    assert.equal(v.value.name, "A B C");
    assert.equal(v.value.description, "ligne un\nligne deux fin");
  });
});

describe("handleContact", () => {
  let dir: string;
  let notified: Notification[];
  let logged: string[];
  let deps: ContactDeps;

  const log = {
    warn: (m: string) => logged.push(m),
    error: (m: string) => logged.push(m),
    info: (m: string) => logged.push(m),
  };
  const request = (body: unknown, type = "application/json") =>
    new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "Content-Type": type },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  const stored = async () => (await readdir(dir)).filter((f) => f.startsWith("lead_"));

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "contact-unit-"));
    notified = [];
    logged = [];
    deps = { leadsDir: dir, notify: async (m) => void notified.push(m), log };
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  test("stores the lead in both files and returns its id", async () => {
    const res = await handleContact(request({ ...valid, company: "Atelier" }), deps);
    assert.equal(res.status, 200);
    const { ok, id } = await res.json();
    assert.equal(ok, true);
    const file = JSON.parse(await readFile(join(dir, `${id}.json`), "utf8"));
    const lines = (await readFile(join(dir, "leads.jsonl"), "utf8")).trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(lines, [file]);
    assert.equal(file.projectType, "ai-integration");
    assert.equal(file.projectTypeLabel, "Intégration d'IA");
    assert.equal(file.company, "Atelier");
    assert.equal(file.status, "new");
    assert.equal(file.consent, true);
  });

  test("the lead is already on disk when the notification is sent", async () => {
    let existedAtSend = false;
    deps.notify = async (m) => {
      const id = /Lead ID: (lead_\w+)/.exec(m.html)?.[1] ?? "";
      existedAtSend = existsSync(join(dir, `${id}.json`)) && (await readFile(join(dir, "leads.jsonl"), "utf8")).includes(id);
    };
    assert.equal((await handleContact(request(valid), deps)).status, 200);
    assert.equal(existedAtSend, true);
  });

  test("a failing or hanging notification keeps the lead and still succeeds", async () => {
    deps.notify = async () => {
      throw new Error("resend down");
    };
    assert.equal((await handleContact(request(valid), deps)).status, 200);
    deps.notify = () => new Promise(() => {});
    deps.notifyTimeoutMs = 20;
    assert.equal((await handleContact(request(valid), deps)).status, 200);
    assert.equal((await stored()).length, 2);
    assert.ok(logged.some((m) => m.includes("notification failed: resend down")));
    assert.ok(logged.some((m) => m.includes("timed out")));
  });

  test("works with notifications switched off", async () => {
    deps.notify = null;
    assert.equal((await handleContact(request(valid), deps)).status, 200);
    assert.equal((await stored()).length, 1);
  });

  test("a storage failure is a 500 with no id, no notification and no success", async () => {
    await writeFile(join(dir, "blocker"), "a file where the directory should be");
    deps.leadsDir = join(dir, "blocker");
    const res = await handleContact(request(valid), deps);
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.equal(body.id, undefined);
    assert.equal(notified.length, 0);
  });

  test("an index that cannot be written does not lose or reject the lead", async () => {
    await mkdir(join(dir, "leads.jsonl")); // appending to a directory fails
    const res = await handleContact(request(valid), deps);
    assert.equal(res.status, 200);
    const { id } = await res.json();
    assert.ok(existsSync(join(dir, `${id}.json`)));
    assert.equal(notified.length, 1);
    assert.ok(logged.some((m) => m.includes(id) && m.includes("index row not written")));
  });

  test("rejected input stores and notifies nothing", async () => {
    for (const [body, status] of [
      [{ ...valid, email: "nope" }, 400],
      ["{", 400],
      ["[1]", 400],
      [{ ...valid, description: "x".repeat(LIMITS.bodyBytes) }, 413],
    ] as const) {
      assert.equal((await handleContact(request(body), deps)).status, status, JSON.stringify(body).slice(0, 40));
    }
    assert.equal((await handleContact(request(valid, "text/plain"), deps)).status, 415);
    assert.deepEqual(await readdir(dir), []);
    assert.equal(notified.length, 0);
  });

  test("a declared oversize length is refused before the body is read", async () => {
    const req = new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": String(LIMITS.bodyBytes + 1) },
      body: JSON.stringify(valid),
    });
    assert.equal((await handleContact(req, deps)).status, 413);
  });

  test("validation errors name the failing fields", async () => {
    const res = await handleContact(request({ ...valid, email: "nope", projectType: "x" }), deps);
    const body = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(Object.keys(body.fields).sort(), ["email", "projectType"]);
  });

  test("honeypot: success shape without an id, nothing stored or sent", async () => {
    const res = await handleContact(request({ ...valid, website: "http://spam.invalid" }), deps);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.deepEqual(await readdir(dir), []);
    assert.equal(notified.length, 0);
  });

  test("ids are unique across many simultaneous submissions", async () => {
    const results = await Promise.all(Array.from({ length: 25 }, () => handleContact(request(valid), deps)));
    const ids = new Set((await Promise.all(results.map((r) => r.json()))).map((b) => b.id));
    assert.equal(ids.size, 25);
    assert.equal((await stored()).length, 25);
    assert.equal((await readFile(join(dir, "leads.jsonl"), "utf8")).trim().split("\n").length, 25);
  });

  test("logs carry the lead id and project type, never the visitor's details", async () => {
    deps.notify = async () => {
      throw new Error("boom");
    };
    await handleContact(request(valid), deps);
    const text = logged.join("\n");
    assert.match(text, /lead_/);
    assert.doesNotMatch(text, /Camille|camille@|assistant/);
  });
});

describe("buildNotification", () => {
  const lead = {
    id: "lead_1_ab",
    timestamp: "2026-11-03T10:00:00.000Z",
    name: `<script>alert(1)</script>`,
    email: "a@example.invalid",
    company: `"Acme" & Fils`,
    projectType: "other",
    projectTypeLabel: "Autre",
    description: `<img src=x onerror="y">\nsecond line`,
    timing: `'tomorrow'`,
    budget: null,
    consent: true,
    status: "new",
  } as const;

  test("escapes visitor text and keeps it out of the subject", () => {
    const m = buildNotification(lead as never);
    assert.doesNotMatch(m.html, /<script>|<img/);
    assert.match(m.html, /&lt;script&gt;/);
    assert.match(m.html, /&quot;Acme&quot; &amp; Fils/);
    assert.match(m.html, /&#39;tomorrow&#39;/);
    assert.equal(m.subject, "Nouvelle demande — Autre");
    assert.equal(m.replyTo, "a@example.invalid");
    assert.deepEqual(m.to, ["bonjour@ligerianlabs.fr"]);
    assert.doesNotMatch(m.html, /Budget/);
  });
});

describe("contact_form_submitted decision", () => {
  const prod = { hostname: "ligerianlabs.fr", automated: false };
  const accepted = { ok: true, id: "lead_1_abcd" };

  test("fires for a server-accepted lead on a public host with only project_type", () => {
    assert.deepEqual(submittedEvent(accepted, "new-application", prod), {
      name: "contact_form_submitted",
      properties: { project_type: "new-application" },
    });
  });

  test("never fires for honeypot, failures or malformed replies", () => {
    for (const reply of [{ ok: true }, { ok: false, id: "lead_1" }, { error: "x" }, { ok: true, id: 7 }, { ok: true, id: "other_1" }, null, undefined, "ok", []]) {
      assert.equal(submittedEvent(reply, "other", prod), null, JSON.stringify(reply));
    }
  });

  test("bounds project_type to the known values", () => {
    for (const bad of ["Jean Dupont <jean@example.fr>", "", undefined, null, 5, "crypto"]) {
      assert.equal(submittedEvent(accepted, bad, prod)?.properties.project_type, "other");
    }
  });

  test("carries no visitor data", () => {
    const event = submittedEvent({ ...accepted, name: "Jean", email: "j@example.fr" }, "other", prod);
    assert.deepEqual(Object.keys(event!.properties), ["project_type"]);
    assert.deepEqual(Object.keys(event!), ["name", "properties"]);
  });

  test("local, private-network, IP-literal and automated visits are suppressed", () => {
    const internal = [
      "localhost", "app.localhost", "mac.local", "site.test", "x.invalid", "",
      "127.0.0.1", "10.0.0.5", "192.168.1.20", "172.16.4.1", "172.31.255.1", "172.32.0.1", "8.8.8.8", "0.0.0.0",
      "localhost.", "app.localhost.", "mac.local.", "lab.test.", "127.0.0.1.", "[::1].",
      "lab.internal", "lab.internal.", "internal", "home.arpa", "lab.home.arpa", "a.b.home.arpa.", "LAB.HOME.ARPA",
      "[::1]", "::1", "[::]", "[::ffff:7f00:1]", "[::ffff:c0a8:101]", "[::ffff:808:808]", "[fd00::1]", "[fc00::1234]", "[fe80::1]", "[2001:db8::1]",
    ];
    for (const hostname of internal) {
      assert.equal(isInternalVisit({ hostname }), true, hostname);
      assert.equal(submittedEvent(accepted, "other", { hostname }), null, hostname);
    }
    assert.equal(submittedEvent(accepted, "other", { ...prod, automated: true }), null);
    for (const hostname of ["ligerianlabs.fr", "ligerianlabs.fr.", "www.ligerianlabs.fr", "preview-123.vercel.app", "localhost.example.com", "10.example.org", "internal.example.com", "myhome.arpa.example.org", "xn--caf-dma.example"]) {
      assert.equal(isInternalVisit({ hostname }), false, hostname);
    }
  });
});

describe("index append", () => {
  let dir: string;
  let index: string;
  const row = (n: number) => JSON.stringify({ id: `lead_${n}`, pad: "x".repeat(200) }) + "\n";
  const parse = async () => (await readFile(index, "utf8")).split("\n").filter(Boolean).map((l) => JSON.parse(l).id);
  const realAppend = fsp.appendFile;
  const realTruncateAll = fsp.truncate;
  const realStatAll = fsp.stat;
  const realOpenAll = fsp.open;

  /** Fail the nth append (1-based) after writing half of its bytes, like a disk filling up. */
  function failPartially(nth: number) {
    let calls = 0;
    fsp.appendFile = (async (file: string, data: string, options?: unknown) => {
      if (String(file).endsWith("leads.jsonl") && ++calls === nth) {
        await realAppend(file, String(data).slice(0, Math.floor(String(data).length / 2)), options as never);
        throw Object.assign(new Error("ENOSPC"), { code: "ENOSPC" });
      }
      return realAppend(file, data, options as never);
    }) as typeof fsp.appendFile;
    syncBuiltinESMExports();
  }

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "contact-index-"));
    index = join(dir, "leads.jsonl");
  });
  afterEach(async () => {
    fsp.appendFile = realAppend;
    fsp.truncate = realTruncateAll;
    fsp.stat = realStatAll;
    fsp.open = realOpenAll;
    syncBuiltinESMExports();
    await rm(dir, { recursive: true, force: true });
  });

  test("a part-written failure leaves the index byte-identical and the next row readable", async () => {
    await appendIndexLine(index, row(1));
    const before = await readFile(index);
    failPartially(1);
    await assert.rejects(appendIndexLine(index, row(2)), /ENOSPC/);
    assert.deepEqual(await readFile(index), before);
    await appendIndexLine(index, row(3));
    assert.deepEqual(await parse(), ["lead_1", "lead_3"]);
  });

  test("a part-written failure on a new index leaves no stray bytes", async () => {
    failPartially(1);
    await assert.rejects(appendIndexLine(index, row(1)), /ENOSPC/);
    assert.equal((await readFile(index, "utf8")).length, 0);
    await appendIndexLine(index, row(2));
    assert.deepEqual(await parse(), ["lead_2"]);
  });

  test("a failed rollback is repaired by the next append, never built upon", async () => {
    await appendIndexLine(index, row(1));
    const realTruncate = fsp.truncate;
    failPartially(1);
    fsp.truncate = (async () => {
      throw new Error("rollback failed");
    }) as typeof fsp.truncate;
    syncBuiltinESMExports();
    await assert.rejects(appendIndexLine(index, row(2)), /ENOSPC/);
    assert.notEqual((await readFile(index, "utf8")).at(-1), "\n"); // corrupt tail really is there
    fsp.truncate = realTruncate;
    syncBuiltinESMExports();
    await appendIndexLine(index, row(3));
    assert.deepEqual(await parse(), ["lead_1", "lead_3"]);
  });

  test("when the tail cannot be repaired the append is refused and writes nothing", async () => {
    await appendIndexLine(index, row(1));
    await writeFile(index, (await readFile(index, "utf8")) + '{"id":"lead_half'); // crash tail
    const realTruncate = fsp.truncate;
    fsp.truncate = (async () => {
      throw new Error("read-only");
    }) as typeof fsp.truncate;
    syncBuiltinESMExports();
    const before = await readFile(index);
    await assert.rejects(appendIndexLine(index, row(2)), /read-only/);
    assert.deepEqual(await readFile(index), before);
    fsp.truncate = realTruncate;
    syncBuiltinESMExports();
    await appendIndexLine(index, row(3));
    assert.deepEqual(await parse(), ["lead_1", "lead_3"]);
  });

  test("a crash-truncated row from an earlier run is cut back before the next row", async () => {
    await writeFile(index, row(1) + row(2) + '{"id":"lead_3","pad":"xx');
    await appendIndexLine(index, row(4));
    assert.deepEqual(await parse(), ["lead_1", "lead_2", "lead_4"]);
    await writeFile(index, '{"only":"a part');
    await appendIndexLine(index, row(5));
    assert.deepEqual(await parse(), ["lead_5"]);
  });

  test("concurrent appends keep every successful row whole when one of them fails", async () => {
    failPartially(4);
    const results = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => appendIndexLine(index, row(i))));
    assert.equal(results.filter((r) => r.status === "rejected").length, 1);
    const ids = await parse();
    assert.equal(ids.length, 11);
    assert.equal(new Set(ids).size, 11);
  });

  test("a short read of the tail never makes the repair discard good rows", async () => {
    await appendIndexLine(index, row(1));
    await appendIndexLine(index, row(2));
    const realOpen = fsp.open;
    fsp.open = (async (...args: Parameters<typeof realOpen>) => {
      const handle = await realOpen(...args);
      const read = handle.read.bind(handle) as (...a: unknown[]) => Promise<unknown>;
      (handle as any).read = (buf: Buffer, off: number, len: number, pos: number) => read(buf, off, Math.min(len, 16), pos);
      return handle;
    }) as typeof fsp.open;
    syncBuiltinESMExports();
    try {
      await appendIndexLine(index, row(3));
    } finally {
      fsp.open = realOpen;
      syncBuiltinESMExports();
    }
    assert.deepEqual(await parse(), ["lead_1", "lead_2", "lead_3"]);
  });

  test("a tail read that ends early refuses the append and keeps every prior row", async () => {
    await appendIndexLine(index, row(1));
    await appendIndexLine(index, row(2));
    const before = await readFile(index);
    const realOpen = fsp.open;
    fsp.open = (async (...args: Parameters<typeof realOpen>) => {
      const handle = await realOpen(...args);
      (handle as any).read = async (buf: Buffer) => ({ bytesRead: 0, buffer: buf }); // EOF before the expected tail
      return handle;
    }) as typeof fsp.open;
    syncBuiltinESMExports();
    try {
      await assert.rejects(appendIndexLine(index, row(3)), /ended before its tail could be read/);
    } finally {
      fsp.open = realOpen;
      syncBuiltinESMExports();
    }
    assert.deepEqual(await readFile(index), before);
    await appendIndexLine(index, row(4));
    assert.deepEqual(await parse(), ["lead_1", "lead_2", "lead_4"]);
  });

  test("a failed length look-up refuses the append and leaves every row in place", async () => {
    await appendIndexLine(index, row(1));
    const realStat = fsp.stat;
    let failures = 1;
    fsp.stat = (async (...args: Parameters<typeof realStat>) => {
      if (failures-- > 0) throw Object.assign(new Error("EIO"), { code: "EIO" });
      return realStat(...args);
    }) as typeof fsp.stat;
    syncBuiltinESMExports();
    try {
      await assert.rejects(appendIndexLine(index, row(2)), /EIO/);
    } finally {
      fsp.stat = realStat;
      syncBuiltinESMExports();
    }
    assert.deepEqual(await parse(), ["lead_1"]);
    // Same fault, then a part-written append whose rollback must not use a guessed length.
    failures = 0;
    await appendIndexLine(index, row(3));
    assert.deepEqual(await parse(), ["lead_1", "lead_3"]);
  });

  test("an append that wrote its whole row before reporting an error leaves a whole row", async () => {
    await appendIndexLine(index, row(1));
    const realTruncate = fsp.truncate;
    fsp.appendFile = (async (file: string, data: string, options?: unknown) => {
      await realAppend(file, data, options as never);
      throw Object.assign(new Error("EIO on close"), { code: "EIO" });
    }) as typeof fsp.appendFile;
    fsp.truncate = (async () => {
      throw new Error("rollback failed");
    }) as typeof fsp.truncate;
    syncBuiltinESMExports();
    await assert.rejects(appendIndexLine(index, row(2)), /EIO on close/);
    fsp.appendFile = realAppend;
    fsp.truncate = realTruncate;
    syncBuiltinESMExports();
    await appendIndexLine(index, row(3));
    assert.deepEqual(await parse(), ["lead_1", "lead_2", "lead_3"]);
  });

  test("handler: whatever happens to the index, every accepted lead has its file and every row has a file", async () => {
    const leads = await mkdtemp(join(tmpdir(), "contact-index-h-"));
    const deps: ContactDeps = { leadsDir: leads, notify: null, log: { warn() {}, error() {}, info() {} } };
    const send = async () => {
      const res = await handleContact(
        new Request("http://localhost/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(valid),
        }),
        deps,
      );
      return { status: res.status, id: (await res.json()).id as string | undefined };
    };
    try {
      const accepted: string[] = [];
      const collect = (r: { status: number; id?: string }) => {
        assert.equal(r.status, 200);
        accepted.push(r.id!);
      };
      collect(await send());
      failPartially(1); // part-written index row, rollback succeeds
      collect(await send());
      collect(await send());
      const realTruncate = fsp.truncate;
      failPartially(1); // part-written index row and the rollback fails too
      fsp.truncate = (async () => {
        throw new Error("rollback failed");
      }) as typeof fsp.truncate;
      syncBuiltinESMExports();
      collect(await send());
      fsp.truncate = realTruncate;
      syncBuiltinESMExports();
      collect(await send());

      const rows = (await readFile(join(leads, "leads.jsonl"), "utf8")).split("\n").filter(Boolean).map((l) => JSON.parse(l).id);
      const files = (await readdir(leads)).filter((f) => f.startsWith("lead_")).map((f) => f.replace(/\.json$/, ""));
      assert.deepEqual(files.sort(), [...accepted].sort(), "every accepted lead has its file");
      for (const id of rows) assert.ok(files.includes(id), `row ${id} has a file`);
      assert.equal(new Set(rows).size, rows.length);
      assert.ok(rows.length >= 3 && rows.length <= 5);
    } finally {
      await rm(leads, { recursive: true, force: true });
    }
  });
});
