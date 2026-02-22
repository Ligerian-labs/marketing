import Database from "better-sqlite3";
import { join } from "node:path";

const DB_PATH = join(process.cwd(), "data", "ligerian.db");

// Ensure data directory exists
import { mkdirSync } from "node:fs";
mkdirSync(join(process.cwd(), "data"), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma("journal_mode = WAL");

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    pack TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    server_ip TEXT,
    server_provider TEXT,
    tailscale_hostname TEXT,
    openclaw_version TEXT,
    channel_type TEXT,
    channel_connected INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    file_path TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    pack TEXT NOT NULL,
    stripe_session_id TEXT,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_resources_sub ON resources(subscription_id);
  CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
`);

export default db;
