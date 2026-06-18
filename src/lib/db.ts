import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { ROSTER } from "./roster";

let _sql: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const cs =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (!cs) {
    throw new Error(
      "No database connection string found. Add the Neon integration in the Vercel Storage tab (sets DATABASE_URL), or set DATABASE_URL locally.",
    );
  }
  _sql = neon(cs);
  return _sql;
}

let readyPromise: Promise<void> | null = null;

// Idempotently create tables and seed the league. Safe to call on every request.
export function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = init().catch((err) => {
      readyPromise = null; // allow retry on next request
      throw err;
    });
  }
  return readyPromise;
}

async function init(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      display_name  TEXT NOT NULL,
      password_hash TEXT,
      password_salt TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS picks (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slot        INTEGER NOT NULL,
      golfer_name TEXT NOT NULL
    )
  `;

  await syncRoster();
}

// Make the database match the roster in code, idempotently:
//  - inserts new players (e.g. added later) without touching existing ones
//  - never overwrites a claimed password
//  - only rewrites a player's picks if they differ from the roster
async function syncRoster(): Promise<void> {
  const sql = getSql();
  for (const u of ROSTER) {
    const rows = (await sql`
      INSERT INTO users (username, display_name)
      VALUES (${u.username}, ${u.displayName})
      ON CONFLICT (username) DO UPDATE SET display_name = EXCLUDED.display_name
      RETURNING id
    `) as { id: number }[];
    const userId = rows[0].id;

    const existing = (await sql`
      SELECT golfer_name FROM picks WHERE user_id = ${userId} ORDER BY slot
    `) as { golfer_name: string }[];
    const current = existing.map((r) => r.golfer_name);
    const matches =
      current.length === u.golfers.length && current.every((g, i) => g === u.golfers[i]);

    if (!matches) {
      await sql`DELETE FROM picks WHERE user_id = ${userId}`;
      let slot = 1;
      for (const golfer of u.golfers) {
        await sql`INSERT INTO picks (user_id, slot, golfer_name) VALUES (${userId}, ${slot}, ${golfer})`;
        slot++;
      }
    }
  }
}

export interface DbUser {
  id: number;
  username: string;
  display_name: string;
  password_hash: string | null;
  password_salt: string | null;
}

export async function getUserByUsername(username: string): Promise<DbUser | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, username, display_name, password_hash, password_salt
    FROM users WHERE lower(username) = lower(${username}) LIMIT 1
  `) as DbUser[];
  return rows[0] ?? null;
}

export async function setUserPassword(
  userId: number,
  hash: string,
  salt: string,
): Promise<void> {
  const sql = getSql();
  await sql`UPDATE users SET password_hash = ${hash}, password_salt = ${salt} WHERE id = ${userId}`;
}

export interface UserWithPicks {
  username: string;
  display_name: string;
  golfers: string[];
}

export async function getAllUsersWithPicks(): Promise<UserWithPicks[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT u.username, u.display_name, p.golfer_name, p.slot
    FROM users u
    JOIN picks p ON p.user_id = u.id
    ORDER BY u.username, p.slot
  `) as { username: string; display_name: string; golfer_name: string; slot: number }[];

  const byUser = new Map<string, UserWithPicks>();
  for (const r of rows) {
    let entry = byUser.get(r.username);
    if (!entry) {
      entry = { username: r.username, display_name: r.display_name, golfers: [] };
      byUser.set(r.username, entry);
    }
    entry.golfers.push(r.golfer_name);
  }
  return Array.from(byUser.values());
}
