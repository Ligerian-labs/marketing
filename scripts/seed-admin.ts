/**
 * Seed script: creates the admin account if it doesn't exist.
 * Run with: npx tsx scripts/seed-admin.ts
 * 
 * Credentials are passed via env vars:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
 */
import { createUser, getUserByEmail } from "../src/lib/auth";

const email = process.env.ADMIN_EMAIL || "bonjour@ligerianlabs.fr";
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || "Valentin";

if (!password) {
  console.error("ADMIN_PASSWORD env var required");
  process.exit(1);
}

const existing = getUserByEmail(email);
if (existing) {
  console.log(`Admin account already exists: ${email}`);
  process.exit(0);
}

const user = createUser(email, password, name, "Ligerian Labs");
console.log(`Admin account created: ${email} (id: ${user.id})`);
