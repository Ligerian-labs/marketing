import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

let server;
let directory;
let origin;
let output = "";

before(async () => {
  directory = await mkdtemp(join(tmpdir(), "ligerian-contact-test-"));
  const portServer = createServer();
  portServer.listen(0, "127.0.0.1");
  await once(portServer, "listening");
  const { port } = portServer.address();
  await new Promise((resolve) => portServer.close(resolve));
  origin = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [fileURLToPath(new URL("../dist/server/entry.mjs", import.meta.url))], {
    cwd: directory,
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), RESEND_API_KEY: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => { output += chunk; });
  server.stderr.on("data", (chunk) => { output += chunk; });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Server exited: ${output}`);
    try {
      if ((await fetch(`${origin}/contact`)).ok) return;
    } catch { /* server is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not start: ${output}`);
});

after(async () => {
  if (server && server.exitCode === null) {
    const stopped = once(server, "exit");
    server.kill();
    await stopped;
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});

const contact = (fields) => fetch(`${origin}/api/contact`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Test contact", email: "contact@example.test", message: "Demande de test", ...fields }),
});

test("project requests keep their category and qualification details on disk", async () => {
  for (const projectType of ["creation", "reprise", "suivi", "expertise"]) {
    const response = await contact({
      projectType,
      currentTool: " Tableur interne ",
      deadline: " Avant septembre ",
      budget: " 6 000 euros ",
    });
    assert.equal(response.status, 200);
    const { id } = await response.json();
    const lead = JSON.parse(await readFile(join(directory, "leads", `${id}.json`), "utf8"));
    assert.equal(lead.projectType, projectType);
    assert.equal(lead.currentTool, "Tableur interne");
    assert.equal(lead.deadline, "Avant septembre");
    assert.equal(lead.budget, "6 000 euros");
    assert.ok(lead.projectTypeLabel);
    const rows = (await readFile(join(directory, "leads", "leads.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
    assert.deepEqual(rows.find((row) => row.id === id), lead);
  }
});

test("legacy contact requests still save their diagnostic stage", async () => {
  const response = await contact({ stade: "01" });
  assert.equal(response.status, 200);
  const { id } = await response.json();
  const lead = JSON.parse(await readFile(join(directory, "leads", `${id}.json`), "utf8"));
  assert.equal(lead.stade, "01");
  assert.match(lead.stadeLabel, /En prod/);
});

test("invalid qualification fields are rejected without saving a lead", async () => {
  const before = await readdir(join(directory, "leads"));
  for (const fields of [{ projectType: "inconnu" }, { projectType: {} }, { currentTool: {} }, { budget: "x".repeat(201) }, { deadline: 42 }]) {
    assert.equal((await contact(fields)).status, 400);
  }
  assert.deepEqual(await readdir(join(directory, "leads")), before);
});

test("required fields and the honeypot retain their existing behavior", async () => {
  const before = await readdir(join(directory, "leads"));
  assert.equal((await contact({ message: "" })).status, 400);
  assert.equal((await contact({ website: "spam.example.test" })).status, 200);
  assert.deepEqual(await readdir(join(directory, "leads")), before);
});
