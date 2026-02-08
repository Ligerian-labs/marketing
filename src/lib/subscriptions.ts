import { randomUUID } from "node:crypto";
import db from "./db";

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  pack: string;
  status: string;
  server_ip: string | null;
  server_provider: string | null;
  tailscale_hostname: string | null;
  openclaw_version: string | null;
  channel_type: string | null;
  channel_connected: number;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  subscription_id: string;
  type: string;
  title: string;
  content: string | null;
  file_path: string | null;
  created_at: string;
}

export function createSubscription(
  userId: string,
  pack: string,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Subscription {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO subscriptions (id, user_id, pack, status, stripe_customer_id, stripe_subscription_id)
     VALUES (?, ?, ?, 'active', ?, ?)`
  ).run(id, userId, pack, stripeCustomerId || null, stripeSubscriptionId || null);

  return db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(id) as Subscription;
}

export function getUserSubscriptions(userId: string): Subscription[] {
  return db.prepare(
    "SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC"
  ).all(userId) as Subscription[];
}

export function getSubscriptionById(id: string): Subscription | undefined {
  return db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(id) as Subscription | undefined;
}

export function updateSubscription(id: string, updates: Partial<Subscription>): void {
  const fields = Object.keys(updates)
    .filter((k) => k !== "id")
    .map((k) => `${k} = ?`);
  const values = Object.keys(updates)
    .filter((k) => k !== "id")
    .map((k) => (updates as any)[k]);

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  db.prepare(`UPDATE subscriptions SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
}

export function getSubscriptionResources(subscriptionId: string): Resource[] {
  return db.prepare(
    "SELECT * FROM resources WHERE subscription_id = ? ORDER BY created_at DESC"
  ).all(subscriptionId) as Resource[];
}

export function addResource(
  subscriptionId: string,
  type: string,
  title: string,
  content?: string,
  filePath?: string
): Resource {
  const id = randomUUID();
  db.prepare(
    "INSERT INTO resources (id, subscription_id, type, title, content, file_path) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, subscriptionId, type, title, content || null, filePath || null);

  return db.prepare("SELECT * FROM resources WHERE id = ?").get(id) as Resource;
}
