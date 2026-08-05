"use server";

import { currentClientIp } from "@/lib/auth-server";
import { checkRequestRate } from "@/lib/auth";
import { confirmToRequester, notifyNewRequest } from "@/lib/notify";
import { createRequest } from "@/lib/requests";
import { type FieldErrors, type RequestInput, validate, validateAttachment } from "@/lib/work-order";

export type SubmitResult =
  | { ok: true; reference: string; title: string }
  | { ok: false; errors: FieldErrors; message?: string };

const field = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
};

export async function submitRequest(data: FormData): Promise<SubmitResult> {
  const ip = await currentClientIp();
  if (!(await checkRequestRate(ip))) {
    return {
      ok: false,
      errors: {},
      message: "that's a lot of work orders. try again in an hour.",
    };
  }

  const input: RequestInput = {
    jobType: field(data, "jobType"),
    title: field(data, "title"),
    scope: field(data, "scope"),
    budget: field(data, "budget"),
    timeline: field(data, "timeline"),
    links: field(data, "links"),
    name: field(data, "name"),
    email: field(data, "email"),
    company: field(data, "company"),
  };

  const errors = validate(input);

  // The attachment is validated client-side too, but a FormData post doesn't
  // have to come from our form — so the size and type rules are enforced again
  // here, where they're the ones that actually protect the database.
  const raw = data.get("attachment");
  const attachment = raw instanceof File && raw.size > 0 ? raw : null;
  if (attachment) {
    const problem = validateAttachment(attachment);
    if (problem) errors.attachment = problem;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const request = await createRequest(input, attachment);

  // The work order is already saved. A notification that fails is a thing to
  // fix in the logs, not a reason to tell someone their request didn't go
  // through — they would only file it a second time.
  try {
    await Promise.all([
      notifyNewRequest(request, attachment !== null),
      confirmToRequester(request),
    ]);
  } catch (error) {
    console.error("[actions] work order saved but notification failed", error);
  }

  return { ok: true, reference: request.reference, title: request.title };
}
