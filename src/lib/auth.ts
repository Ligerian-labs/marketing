import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import db from "./db";
import type { AstroCookies } from "astro";

const SESSION_COOKIE = "ll_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export interface User {
  id: string;
  email: string;
  name: string;
  company: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
}

// --- User Management ---

export function createUser(email: string, password: string, name: string, company?: string): User {
  const id = randomUUID();
  const password_hash = bcrypt.hashSync(password, 12);

  db.prepare(
    "INSERT INTO users (id, email, password_hash, name, company) VALUES (?, ?, ?, ?, ?)"
  ).run(id, email.toLowerCase().trim(), password_hash, name, company || null);

  return { id, email: email.toLowerCase().trim(), name, company: company || null, created_at: new Date().toISOString() };
}

export function getUserByEmail(email: string): (User & { password_hash: string }) | undefined {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim()) as any;
}

export function getUserById(id: string): User | undefined {
  return db.prepare("SELECT id, email, name, company, created_at FROM users WHERE id = ?").get(id) as any;
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// --- Session Management ---

export function createSession(userId: string): string {
  const id = randomUUID();
  const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(id, userId, expires);
  return id;
}

export function getSession(sessionId: string): Session | undefined {
  const session = db.prepare(
    "SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')"
  ).get(sessionId) as Session | undefined;
  return session;
}

export function deleteSession(sessionId: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export function cleanExpiredSessions(): void {
  db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
}

// --- Cookie Helpers ---

export function setSessionCookie(cookies: AstroCookies, sessionId: string): void {
  cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function getSessionFromCookies(cookies: AstroCookies): Session | undefined {
  const sessionId = cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) return undefined;
  return getSession(sessionId);
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE, { path: "/" });
}

// --- Auth Helper ---

export function getAuthenticatedUser(cookies: AstroCookies): User | undefined {
  const session = getSessionFromCookies(cookies);
  if (!session) return undefined;
  return getUserById(session.user_id);
}
