export const prerender = false;
import type { APIRoute } from "astro";
import { createUser, getUserByEmail } from "../../../lib/auth";

const SEED_SECRET = import.meta.env.SEED_SECRET || "ll-seed-2026";

export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${SEED_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await request.json();
  const { email, password, name, company } = body;

  if (!email || !password || !name) {
    return new Response(JSON.stringify({ error: "email, password, name required" }), { status: 400 });
  }

  const existing = getUserByEmail(email);
  if (existing) {
    return new Response(JSON.stringify({ message: "Account already exists", id: existing.id }), { status: 200 });
  }

  const user = createUser(email, password, name, company);
  return new Response(JSON.stringify({ message: "Account created", id: user.id }), { status: 201 });
};
