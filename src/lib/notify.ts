import "server-only";
import { Resend } from "resend";
import { BUDGETS, JOB_TYPES, labelFor, type WorkRequest } from "./work-order";

/**
 * The note that says a work order landed. Deliberately thin: the database is
 * the record and /admin is where you actually read one, so this only has to
 * carry enough to decide whether to go and look now or later.
 *
 * Every failure path here is swallowed by the caller. A submission that made it
 * into the database is a success even if the notification never sends — telling
 * someone their request failed because an email provider was down would be a
 * lie, and they'd file it twice.
 */

const FROM = process.env.RESEND_FROM ?? "oddjob <oddjob@justin06lee.dev>";
const TO = process.env.NOTIFY_EMAIL ?? "tenet.sh@gmail.com";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://oddjob.justin06lee.dev";

let client: Resend | null = null;

function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export async function notifyNewRequest(
  request: WorkRequest,
  hasAttachment: boolean,
): Promise<void> {
  const api = resend();
  if (!api) {
    console.warn("[notify] RESEND_API_KEY is not set; skipping the new-request note.");
    return;
  }

  const lines = [
    `${request.name}${request.company ? ` (${request.company})` : ""} filed a work order.`,
    "",
    `job type: ${labelFor(JOB_TYPES, request.jobType)}`,
    `budget:   ${labelFor(BUDGETS, request.budget)}`,
    hasAttachment ? "attachment: yes" : null,
    "",
    `${SITE}/admin`,
  ].filter((line) => line !== null);

  await api.emails.send({
    from: FROM,
    to: TO,
    replyTo: request.email,
    subject: `${request.reference} — ${request.title}`,
    text: lines.join("\n"),
  });
}

/** The receipt to the person who filed it, so they know it arrived. */
export async function confirmToRequester(request: WorkRequest): Promise<void> {
  const api = resend();
  if (!api) return;

  await api.emails.send({
    from: FROM,
    to: request.email,
    subject: `${request.reference} — got it`,
    text: [
      `thanks — your work order is ${request.reference}.`,
      "",
      `"${request.title}"`,
      "",
      "i read these myself, so a reply takes a day or two rather than a minute.",
      "if it's easier to just talk, book a call: https://coffee.justin06lee.dev",
      "",
      "— justin",
    ].join("\n"),
  });
}
