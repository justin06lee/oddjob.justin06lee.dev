import "server-only";
import { randomUUID } from "crypto";
import { db, initDb, type DbAttachment, type DbRequest } from "./db";
import { isStatus, type RequestInput, type Status, type WorkRequest } from "./work-order";

/**
 * Storage for work orders. The vocabulary and the validation rules live in
 * `work-order.ts`, which carries no database import — the form needs them too,
 * and a client bundle must not pull `server-only` in behind them.
 */

/* ── reference numbers ── */

/**
 * OJ-0042. Allocated from a counter row rather than `COUNT(*) + 1` so a deleted
 * work order never hands its number to the next one — the number has usually
 * been quoted to somebody by then. `RETURNING` makes the increment and the read
 * one atomic statement, so two simultaneous submissions can't collide.
 */
async function nextReference(): Promise<string> {
  const result = await db().execute({
    sql: `INSERT INTO oddjob_counters (name, value) VALUES ('request', 1)
          ON CONFLICT(name) DO UPDATE SET value = value + 1
          RETURNING value`,
    args: [],
  });
  const value = Number((result.rows[0] as unknown as { value: number }).value);
  return `OJ-${String(value).padStart(4, "0")}`;
}

const toWorkRequest = (row: DbRequest): WorkRequest => ({
  id: row.id,
  reference: row.reference,
  jobType: row.job_type,
  title: row.title,
  scope: row.scope,
  budget: row.budget,
  timeline: row.timeline,
  links: row.links,
  name: row.name,
  email: row.email,
  company: row.company,
  // A status that isn't one we know about would break the pill and the filters;
  // falling back keeps a hand-edited row readable instead of crashing the page.
  status: isStatus(row.status) ? row.status : "received",
  adminNotes: row.admin_notes,
  createdAt: Number(row.created_at),
  updatedAt: Number(row.updated_at),
});

/* ── writes ── */

export async function createRequest(
  input: RequestInput,
  attachment: File | null,
): Promise<WorkRequest> {
  await initDb();
  const now = Date.now();
  const id = randomUUID();
  const reference = await nextReference();

  await db().execute({
    sql: `INSERT INTO oddjob_requests
            (id, reference, job_type, title, scope, budget, timeline, links,
             name, email, company, status, admin_notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', NULL, ?, ?)`,
    args: [
      id,
      reference,
      input.jobType,
      input.title.trim(),
      input.scope.trim(),
      input.budget,
      input.timeline,
      input.links.trim() || null,
      input.name.trim(),
      input.email.trim(),
      input.company.trim() || null,
      now,
      now,
    ],
  });

  if (attachment) {
    const bytes = new Uint8Array(await attachment.arrayBuffer());
    await db().execute({
      sql: `INSERT INTO oddjob_attachments
              (id, request_id, filename, mime, size, content, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        id,
        attachment.name,
        attachment.type || "application/octet-stream",
        attachment.size,
        bytes,
        now,
      ],
    });
  }

  return {
    id,
    reference,
    jobType: input.jobType,
    title: input.title.trim(),
    scope: input.scope.trim(),
    budget: input.budget,
    timeline: input.timeline,
    links: input.links.trim() || null,
    name: input.name.trim(),
    email: input.email.trim(),
    company: input.company.trim() || null,
    status: "received",
    adminNotes: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function setStatus(id: string, status: Status): Promise<void> {
  await initDb();
  await db().execute({
    sql: "UPDATE oddjob_requests SET status = ?, updated_at = ? WHERE id = ?",
    args: [status, Date.now(), id],
  });
}

export async function setAdminNotes(id: string, notes: string): Promise<void> {
  await initDb();
  await db().execute({
    sql: "UPDATE oddjob_requests SET admin_notes = ?, updated_at = ? WHERE id = ?",
    args: [notes.trim() || null, Date.now(), id],
  });
}

export async function deleteRequest(id: string): Promise<void> {
  await initDb();
  // libsql doesn't enable PRAGMA foreign_keys per connection, so the cascade is
  // done here rather than declared — otherwise the blob outlives its row.
  await db().batch([
    { sql: "DELETE FROM oddjob_attachments WHERE request_id = ?", args: [id] },
    { sql: "DELETE FROM oddjob_requests WHERE id = ?", args: [id] },
  ]);
}

/* ── reads ── */

export const PAGE_SIZE = 15;

export async function listRequests(
  page = 1,
  status?: Status,
): Promise<{ requests: WorkRequest[]; total: number }> {
  return listRequestsRange(PAGE_SIZE, (Math.max(1, page) - 1) * PAGE_SIZE, status);
}

/**
 * The inbox pages speak page numbers; the admin API speaks limit/offset. Both
 * land here so there is exactly one listing query to keep correct.
 */
export async function listRequestsRange(
  limit: number,
  offset: number,
  status?: Status,
): Promise<{ requests: WorkRequest[]; total: number }> {
  await initDb();

  const where = status ? "WHERE status = ?" : "";
  const filterArgs = status ? [status] : [];

  const [rows, count] = await Promise.all([
    db().execute({
      sql: `SELECT * FROM oddjob_requests ${where}
            ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      args: [...filterArgs, limit, offset],
    }),
    db().execute({
      sql: `SELECT COUNT(*) AS n FROM oddjob_requests ${where}`,
      args: filterArgs,
    }),
  ]);

  return {
    requests: rows.rows.map((row) => toWorkRequest(row as unknown as DbRequest)),
    total: Number((count.rows[0] as unknown as { n: number }).n),
  };
}

export async function getRequest(id: string): Promise<WorkRequest | null> {
  await initDb();
  const result = await db().execute({
    sql: "SELECT * FROM oddjob_requests WHERE id = ?",
    args: [id],
  });
  const row = result.rows[0];
  return row ? toWorkRequest(row as unknown as DbRequest) : null;
}

/**
 * The reference (OJ-0042) is the handle humans quote — the unique index in
 * db.ts is what makes it a safe lookup key.
 */
export async function getRequestByReference(reference: string): Promise<WorkRequest | null> {
  await initDb();
  const result = await db().execute({
    sql: "SELECT * FROM oddjob_requests WHERE reference = ?",
    args: [reference],
  });
  const row = result.rows[0];
  return row ? toWorkRequest(row as unknown as DbRequest) : null;
}

/** Metadata only — the blob stays out of any list or detail query. */
export async function listAttachments(requestId: string): Promise<DbAttachment[]> {
  await initDb();
  const result = await db().execute({
    sql: `SELECT id, request_id, filename, mime, size, created_at
          FROM oddjob_attachments WHERE request_id = ?`,
    args: [requestId],
  });
  return result.rows as unknown as DbAttachment[];
}

/** Metadata for a whole page of requests in one query, so a listing isn't N+1. */
export async function listAttachmentsForRequests(requestIds: string[]): Promise<DbAttachment[]> {
  if (requestIds.length === 0) return [];
  await initDb();
  const placeholders = requestIds.map(() => "?").join(", ");
  const result = await db().execute({
    sql: `SELECT id, request_id, filename, mime, size, created_at
          FROM oddjob_attachments WHERE request_id IN (${placeholders})`,
    args: requestIds,
  });
  return result.rows as unknown as DbAttachment[];
}

export async function getAttachmentContent(
  id: string,
): Promise<{ filename: string; mime: string; content: Uint8Array } | null> {
  await initDb();
  const result = await db().execute({
    sql: "SELECT filename, mime, content FROM oddjob_attachments WHERE id = ?",
    args: [id],
  });
  const row = result.rows[0] as unknown as
    | { filename: string; mime: string; content: Uint8Array }
    | undefined;
  return row ?? null;
}

export async function statusCounts(): Promise<Record<string, number>> {
  await initDb();
  const result = await db().execute(
    "SELECT status, COUNT(*) AS n FROM oddjob_requests GROUP BY status",
  );
  const out: Record<string, number> = {};
  for (const row of result.rows as unknown as { status: string; n: number }[]) {
    out[row.status] = Number(row.n);
  }
  return out;
}
