"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  SESSION_COOKIE_NAME,
  checkLoginRate,
  createSession,
  destroySession,
  verifyAdminKey,
} from "@/lib/auth";
import { currentClientIp, requireAdmin } from "@/lib/auth-server";
import { deleteRequest, setAdminNotes, setStatus } from "@/lib/requests";
import { STATUSES, type Status } from "@/lib/work-order";

export type LoginResult = { error: string | null; rateLimited?: boolean };

export async function login(password: string): Promise<LoginResult> {
  const ip = await currentClientIp();
  if (!(await checkLoginRate(ip))) {
    return { error: "too many attempts. try again later.", rateLimited: true };
  }
  if (!verifyAdminKey(password)) {
    // Deliberately generic: a specific message would confirm which half of the
    // guess was right.
    return { error: "that's not it." };
  }

  const token = await createSession();
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 24 * 60 * 60,
  });
  return { error: null };
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token) await destroySession(token);
  store.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

/* ── work orders ── */

export async function updateStatus(id: string, status: string): Promise<void> {
  await requireAdmin();
  if (!(STATUSES as readonly string[]).includes(status)) {
    throw new Error(`unknown status: ${status}`);
  }
  await setStatus(id, status as Status);
  revalidatePath("/admin");
  revalidatePath(`/admin/${id}`);
}

export async function updateNotes(id: string, notes: string): Promise<void> {
  await requireAdmin();
  await setAdminNotes(id, notes);
  revalidatePath(`/admin/${id}`);
}

export async function removeRequest(id: string): Promise<void> {
  await requireAdmin();
  await deleteRequest(id);
  revalidatePath("/admin");
  redirect("/admin");
}
