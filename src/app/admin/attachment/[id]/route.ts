import { isAdmin } from "@/lib/auth-server";
import { getAttachmentContent } from "@/lib/requests";

export const dynamic = "force-dynamic";

/**
 * Attachments are somebody's private brief, so this checks the session itself.
 * The `/admin` layout does not protect this path — route handlers don't run
 * layouts, and relying on the gate one directory up would leave every upload
 * readable by anyone who guessed an id.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return new Response("not found", { status: 404 });
  }

  const { id } = await params;
  const file = await getAttachmentContent(id);
  if (!file) return new Response("not found", { status: 404 });

  // The filename came from an upload, so it can hold quotes, newlines, or
  // anything else that would break out of the header. Strip it to a safe ASCII
  // form and let filename* carry the real name for clients that support it.
  const safe = file.filename.replace(/[^\w.\-]+/g, "_").slice(0, 100) || "attachment";
  const encoded = encodeURIComponent(file.filename);

  return new Response(new Uint8Array(file.content), {
    headers: {
      "Content-Type": file.mime || "application/octet-stream",
      "Content-Length": String(file.content.byteLength),
      "Content-Disposition": `attachment; filename="${safe}"; filename*=UTF-8''${encoded}`,
      // Private data behind a session: never let a shared cache hold it.
      "Cache-Control": "private, no-store",
    },
  });
}
