import "server-only";
import { createClient, type Client } from "@libsql/client";

/**
 * The same Turso database every justin06lee.dev site talks to, so every table
 * here is namespaced `oddjob_`. Sessions get their own table rather than
 * reusing another site's: the sites share an ADMIN_KEY, but there is no reason
 * a token lifted from one should unlock another.
 *
 * The client is built on first use rather than at import. Next collects page
 * data by importing every route during a build, and a client constructed at
 * module scope throws URL_INVALID there — so a missing credential would fail
 * the build rather than the request that actually needed the database.
 */
let client: Client | null = null;

export function db(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }

  client = createClient({ url, authToken });
  return client;
}

// Memoize so initDb() costs ~0 after the first call in a worker process.
// Without this, every lib function call re-runs the full schema batch — adding
// hundreds of ms to each page load.
let initPromise: Promise<void> | null = null;

export function initDb(): Promise<void> {
  if (!initPromise) initPromise = doInit();
  return initPromise;
}

async function doInit(): Promise<void> {
  await db().batch([
    `CREATE TABLE IF NOT EXISTS oddjob_requests (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL,
      job_type TEXT NOT NULL,
      title TEXT NOT NULL,
      scope TEXT NOT NULL,
      budget TEXT NOT NULL,
      timeline TEXT NOT NULL,
      links TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT,
      status TEXT NOT NULL DEFAULT 'received',
      admin_notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_oddjob_requests_reference
      ON oddjob_requests(reference)`,
    `CREATE INDEX IF NOT EXISTS idx_oddjob_requests_created
      ON oddjob_requests(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_oddjob_requests_status
      ON oddjob_requests(status)`,

    // Attachments live in their own table so listing work orders never drags
    // megabytes of blob through the wire. There is no object store in this
    // stack, and adding one for the occasional 200kb spec would be the tail
    // wagging the dog — so small files are held inline and the size cap in
    // requests.ts is what keeps that honest.
    `CREATE TABLE IF NOT EXISTS oddjob_attachments (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      content BLOB NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (request_id) REFERENCES oddjob_requests(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_oddjob_attachments_request
      ON oddjob_attachments(request_id)`,

    // A single-row counter rather than COUNT(*)+1: deleting a work order must
    // not hand its number to the next one, because the number has already been
    // quoted to somebody.
    `CREATE TABLE IF NOT EXISTS oddjob_counters (
      name TEXT PRIMARY KEY,
      value INTEGER NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS oddjob_sessions (
      token TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS oddjob_login_attempts (
      ip TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      first_attempt INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS oddjob_request_rate (
      ip TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      first_attempt INTEGER NOT NULL
    )`,
  ]);
}

/* ── row shapes ── */

export type DbRequest = {
  id: string;
  reference: string;
  job_type: string;
  title: string;
  scope: string;
  budget: string;
  timeline: string;
  links: string | null;
  name: string;
  email: string;
  company: string | null;
  status: string;
  admin_notes: string | null;
  created_at: number;
  updated_at: number;
};

export type DbAttachment = {
  id: string;
  request_id: string;
  filename: string;
  mime: string;
  size: number;
  created_at: number;
};
