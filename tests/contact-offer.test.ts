import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { validateContact } from "../src/lib/contact.ts";
import { handleContact } from "../src/lib/contact-server.ts";
import { submittedEvent } from "../src/lib/contact-analytics.ts";
import { projectTypeForOffer } from "../src/data/project-offers.ts";

const enquiry = {
  name: "Test offre",
  email: "offre@example.invalid",
  projectType: "maintenance",
  currentTool: "  Portail existant <interne>  ",
  description: "Organiser l'hébergement et la maintenance de notre portail.",
  timing: "Après la livraison",
  budget: "À définir ensemble",
  consent: true,
};

test("only known public offer slugs preselect an existing API category", () => {
  for (const [offer, expected] of Object.entries({ creation: "new-application", reprise: "existing-software", suivi: "maintenance", expertise: "ai-integration" })) {
    assert.equal(projectTypeForOffer(offer), expected);
  }
  for (const offer of [null, "", "unknown", "toString", "__proto__", "suivi\" onfocus=alert(1)"]) {
    assert.equal(projectTypeForOffer(offer), null);
  }
});

test("maintenance enquiries preserve the existing tool in canonical storage and the notification", async () => {
  const leadsDir = await mkdtemp(join(tmpdir(), "offer-contact-"));
  const messages: { subject: string; html: string }[] = [];
  try {
    const response = await handleContact(new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enquiry),
    }), { leadsDir, notify: async (message) => { messages.push(message); }, log: { info() {}, warn() {}, error() {} } });
    assert.equal(response.status, 200);
    const { id } = await response.json();
    const lead = JSON.parse(await readFile(join(leadsDir, `${id}.json`), "utf8"));
    assert.equal(lead.projectType, "maintenance");
    assert.match(lead.projectTypeLabel, /[Mm]aintenance/);
    assert.equal(lead.currentTool, "Portail existant <interne>");
    assert.equal(lead.timing, enquiry.timing);
    assert.equal(lead.budget, enquiry.budget);
    assert.deepEqual(JSON.parse((await readFile(join(leadsDir, "leads.jsonl"), "utf8")).trim()), lead);
    assert.equal(messages.length, 1);
    assert.match(messages[0].subject, /[Mm]aintenance/);
    assert.match(messages[0].html, /Portail existant &lt;interne&gt;/);
    assert.doesNotMatch(messages[0].html, /<interne>/);
  } finally {
    await rm(leadsDir, { recursive: true, force: true });
  }
});

test("an optional current tool is bounded and validated without changing older enquiry categories", () => {
  for (const projectType of ["new-application", "existing-software", "ai-integration", "other"]) {
    const result = validateContact({ ...enquiry, projectType, currentTool: "Tableur" });
    assert.ok(result.ok);
    assert.equal(result.value.currentTool, "Tableur");
  }
  for (const currentTool of [{}, 42, "x".repeat(501)]) {
    const result = validateContact({ ...enquiry, projectType: "existing-software", currentTool });
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors.currentTool);
  }
});

test("maintenance analytics carry only the bounded category after server acceptance", () => {
  assert.deepEqual(submittedEvent({ ok: true, id: "lead_test", currentTool: "private" }, "maintenance", {
    hostname: "ligerianlabs.fr",
  }), { name: "contact_form_submitted", properties: { project_type: "maintenance" } });
  assert.equal(submittedEvent({ ok: true }, "maintenance", { hostname: "ligerianlabs.fr" }), null);
  assert.equal(submittedEvent({ ok: true, id: "lead_test" }, "maintenance", { hostname: "localhost" }), null);
});
