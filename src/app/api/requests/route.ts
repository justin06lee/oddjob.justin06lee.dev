import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth-server";
import type { DbAttachment } from "@/lib/db";
import { PAGE_SIZE, listAttachmentsForRequests, listRequestsRange } from "@/lib/requests";
import { STATUSES, isStatus, type Status } from "@/lib/work-order";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 100;

// Metadata only — the blob never rides along in JSON; the bytes live behind
// /admin/attachment/[id].
const toMeta = (file: DbAttachment | undefined) =>
  file
    ? { id: file.id, filename: file.filename, mime: file.mime, size: Number(file.size) }
    : null;

/** null → the default; anything that isn't a plain base-10 integer → null (reject). */
function intParam(value: string | null, fallback: number): number | null {
  if (value === null || value === "") return fallback;
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;

  const statusParam = params.get("status");
  let status: Status | undefined;
  if (statusParam !== null) {
    if (!isStatus(statusParam)) {
      return NextResponse.json(
        { error: `unknown status: ${statusParam}. valid: ${STATUSES.join(", ")}` },
        { status: 400 },
      );
    }
    status = statusParam;
  }

  const limit = intParam(params.get("limit"), PAGE_SIZE);
  if (limit === null || limit < 1 || limit > MAX_LIMIT) {
    return NextResponse.json(
      { error: `limit must be an integer between 1 and ${MAX_LIMIT}` },
      { status: 400 },
    );
  }

  const offset = intParam(params.get("offset"), 0);
  if (offset === null) {
    return NextResponse.json({ error: "offset must be an integer >= 0" }, { status: 400 });
  }

  const { requests, total } = await listRequestsRange(limit, offset, status);

  const attachmentFor = new Map<string, DbAttachment>();
  for (const file of await listAttachmentsForRequests(requests.map((r) => r.id))) {
    attachmentFor.set(file.request_id, file);
  }

  return NextResponse.json({
    requests: requests.map((request) => ({
      ...request,
      attachment: toMeta(attachmentFor.get(request.id)),
    })),
    total,
    limit,
    offset,
  });
}
