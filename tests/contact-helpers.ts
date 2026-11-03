// Shared by the HTTP and browser checks: runs the built standalone server in a
// throwaway cwd with no RESEND_API_KEY, so nothing is emailed and every lead is
// deleted afterwards. Requires `npm run build`.
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ENTRY = resolve(fileURLToPath(new URL("../dist/server/entry.mjs", import.meta.url)));

export interface TestServer {
  base: string;
  port: number;
  leadsDir: string;
  log(): string;
  storedLeads(): Promise<Record<string, unknown>[]>;
  leadFiles(): Promise<string[]>;
  resetLeads(): Promise<void>;
  stop(): Promise<void>;
}

async function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const probe = createServer();
    probe.once("error", fail);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => done(port));
    });
  });
}

export async function startServer(): Promise<TestServer> {
  assert.ok(existsSync(ENTRY), "dist/server/entry.mjs is missing: run `npm run build` first");
  const workDir = await mkdtemp(join(tmpdir(), "contact-http-"));
  const leadsDir = join(workDir, "leads");
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, HOST: "127.0.0.1", PORT: String(port), CONTACT_LEADS_DIR: leadsDir };
  delete env.RESEND_API_KEY;
  let serverLog = "";
  const server: ChildProcess = spawn(process.execPath, [ENTRY], { cwd: workDir, env, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout?.on("data", (d) => (serverLog += d));
  server.stderr?.on("data", (d) => (serverLog += d));

  let up = false;
  for (let attempt = 0; attempt < 100 && !up; attempt++) {
    try {
      await fetch(`${base}/contact/`);
      up = true;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  if (!up) {
    server.kill();
    throw new Error(`server did not start:\n${serverLog}`);
  }

  return {
    base,
    port,
    leadsDir,
    log: () => serverLog,
    async storedLeads() {
      const index = join(leadsDir, "leads.jsonl");
      if (!existsSync(index)) return [];
      return (await readFile(index, "utf8"))
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    },
    async leadFiles() {
      if (!existsSync(leadsDir)) return [];
      return (await readdir(leadsDir)).filter((f) => f.startsWith("lead_") && f.endsWith(".json"));
    },
    resetLeads: () => rm(leadsDir, { recursive: true, force: true }),
    async stop() {
      server.kill();
      await rm(workDir, { recursive: true, force: true });
    },
  };
}
