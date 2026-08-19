import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  checkLoginRate,
  clientIpFrom,
  createSession,
  destroySession,
  verifyAdminKey,
} from "@/lib/auth";
import { isAdmin } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/**
 * The HTTP door to the same session the login page mints — for the MCP server
 * and anything else that can hold a cookie. Same rate limiter, same session
 * table, same cookie, so a token from here is indistinguishable from one the
 * browser got.
 */

// Identical to the login action's attributes: a session is a session no matter
// which door minted it.
const COOKIE_ATTRS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

export async function POST(req: NextRequest) {
  // Reject oversized bodies before buffering — a login payload is a small
  // {password} object, so anything large is abuse.
  if (Number(req.headers.get("content-length")) > 4096) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { password } = body;

  // An empty password isn't a guess, so it doesn't burn a rate-limit attempt —
  // a client with a config hole shouldn't retry itself into the 24h lockout.
  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "password required" }, { status: 401 });
  }

  if (!(await checkLoginRate(clientIpFrom(req.headers)))) {
    return NextResponse.json({ error: "too many attempts" }, { status: 429 });
  }

  if (!process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "admin login is not configured" }, { status: 503 });
  }

  // Bound the length before verifyAdminKey: safeCompare allocates buffers sized
  // to the input, so a multi-MB string would blow up allocation just to fail.
  if (password.length > 512 || !verifyAdminKey(password)) {
    // Deliberately bare, like the login page: a specific message would confirm
    // which half of the guess was right.
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, { ...COOKIE_ATTRS, maxAge: 24 * 60 * 60 });
  return res;
}

/** Is this cookie still a session? */
export async function GET() {
  if (await isAdmin()) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: false }, { status: 401 });
}

/** Destroy the caller's own session and clear the cookie. Always 200. */
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) await destroySession(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { ...COOKIE_ATTRS, maxAge: 0 });
  return res;
}
