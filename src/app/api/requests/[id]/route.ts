import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth-server";
import {
  deleteRequest,
  getRequest,
  getRequestByReference,
  listAttachments,
  setAdminNotes,
  setStatus,
} from "@/lib/requests";
import { STATUSES, isStatus, type Status, type WorkRequest } from "@/lib/work-order";

export const dynamic = "force-dynamic";

/**
 * The path segment is the row id or the reference (OJ-0042) — the reference is
 * the handle humans quote, and its shape can't collide with a UUID, so trying
 * one then the other is unambiguous.
 */
async function resolveRequest(idOrReference: string): Promise<WorkRequest | null> {
  const request = await getRequest(idOrReference);
  if (request) return request;
  if (/^OJ-\d+$/i.test(idOrReference)) {
    return getRequestByReference(idOrReference.toUpperCase());
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const request = await resolveRequest(id);
  if (!request) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Metadata only — the bytes live behind /admin/attachment/[id].
  const [file] = await listAttachments(request.id);
  return NextResponse.json({
    ...request,
    attachment: file
      ? { id: file.id, filename: file.filename, mime: file.mime, size: Number(file.size) }
      : null,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  let status: Status | undefined;
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !isStatus(body.status)) {
      return NextResponse.json(
        { error: `unknown status: ${String(body.status)}. valid: ${STATUSES.join(", ")}` },
        { status: 400 },
      );
    }
    status = body.status;
  }

  let adminNotes: string | undefined;
  if (body.adminNotes !== undefined) {
    if (typeof body.adminNotes !== "string") {
      return NextResponse.json(
        { error: "adminNotes must be a string (empty clears them)" },
        { status: 400 },
      );
    }
    adminNotes = body.adminNotes;
  }

  if (status === undefined && adminNotes === undefined) {
    return NextResponse.json(
      { error: "nothing to update: send status and/or adminNotes" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const request = await resolveRequest(id);
  if (!request) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Mirrors the admin actions exactly: updateStatus revalidates the inbox and
  // the detail page, updateNotes only the detail page.
  if (status !== undefined) {
    await setStatus(request.id, status);
    revalidatePath("/admin");
    revalidatePath(`/admin/${request.id}`);
  }
  if (adminNotes !== undefined) {
    await setAdminNotes(request.id, adminNotes);
    revalidatePath(`/admin/${request.id}`);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const request = await resolveRequest(id);
  if (!request) return NextResponse.json({ error: "not found" }, { status: 404 });

  // deleteRequest batches attachments-then-request like the removeRequest
  // action; the action's redirect is browser navigation and has no API mirror,
  // but the revalidate is the same.
  await deleteRequest(request.id);
  revalidatePath("/admin");
  return NextResponse.json({ ok: true });
}
