/**
 * The shape of a work order, and the rules about it — with no database import,
 * so both the form and the server action can hold the same definition of what a
 * valid request is. `requests.ts` is the server-only half that stores one.
 *
 * Validation living here rather than in the form is deliberate: the action
 * re-runs it on submit, so a post that never went near our UI is checked by
 * exactly the same code the UI showed you.
 */

export const JOB_TYPES = [
  { value: "build", label: "build something new", blurb: "a site, a tool, a thing that doesn't exist yet" },
  { value: "fix", label: "fix or finish something", blurb: "it exists, it's broken or half-done" },
  { value: "advise", label: "look at something", blurb: "a review, an audit, a second opinion" },
  { value: "odd", label: "an odd job", blurb: "it doesn't fit the boxes above" },
] as const;

export const BUDGETS = [
  { value: "under-1k", label: "under 1k", blurb: "a weekend of work" },
  { value: "1k-5k", label: "1k – 5k", blurb: "a couple of weeks" },
  { value: "5k-plus", label: "5k+", blurb: "a real project" },
  { value: "unsure", label: "not sure yet", blurb: "tell me what it's worth to you" },
] as const;

export const TIMELINES = [
  { value: "whenever", label: "whenever" },
  { value: "month", label: "within a month" },
  { value: "weeks", label: "a few weeks" },
  { value: "urgent", label: "it's urgent" },
] as const;

export const STATUSES = ["received", "reading", "quoted", "building", "done", "declined"] as const;
export type Status = (typeof STATUSES)[number];

const JOB_TYPE_VALUES = new Set(JOB_TYPES.map((job) => job.value as string));
const BUDGET_VALUES = new Set(BUDGETS.map((budget) => budget.value as string));
const TIMELINE_VALUES = new Set(TIMELINES.map((timeline) => timeline.value as string));

export const labelFor = (
  list: ReadonlyArray<{ value: string; label: string }>,
  value: string,
) => list.find((entry) => entry.value === value)?.label ?? value;

export const isStatus = (value: string): value is Status =>
  (STATUSES as readonly string[]).includes(value);

/* ── limits ── */

export const MAX_SCOPE = 4000;
export const MAX_TITLE = 120;
export const MIN_SCOPE = 40;

/**
 * Attachments are held inline in the database (see db.ts), so this cap is the
 * only thing standing between a work order and a row nobody wants to read.
 * A written spec that doesn't fit in 2 MB is a spec that should be a link.
 */
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

export const ACCEPTED_ATTACHMENTS = [
  "application/pdf",
  "text/markdown",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const ATTACHMENT_ACCEPT = ".pdf,.md,.txt,.doc,.docx";

/* ── input ── */

export type RequestInput = {
  jobType: string;
  title: string;
  scope: string;
  budget: string;
  timeline: string;
  links: string;
  name: string;
  email: string;
  company: string;
};

export type FieldErrors = Partial<Record<keyof RequestInput | "attachment", string>>;

// Deliberately loose: the only thing worth asserting before sending is that
// there is a local part, an @, and a dot-something. Anything stricter rejects
// addresses that genuinely work.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmail = (value: string) => EMAIL_RE.test(value.trim());

/** Per-step rules, so the form can gate a step with the same logic that guards the whole thing. */
export function validateStep(step: number, input: RequestInput): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 0) {
    if (!JOB_TYPE_VALUES.has(input.jobType)) errors.jobType = "pick one.";

    const title = input.title.trim();
    if (!title) errors.title = "give it a name.";
    else if (title.length > MAX_TITLE) errors.title = `${MAX_TITLE} characters at most.`;

    const scope = input.scope.trim();
    if (scope.length < MIN_SCOPE) {
      errors.scope = "a few sentences at least — this is the part i actually work from.";
    } else if (scope.length > MAX_SCOPE) {
      errors.scope = `${MAX_SCOPE} characters at most.`;
    }
  }

  if (step === 1) {
    if (!BUDGET_VALUES.has(input.budget)) errors.budget = "pick one.";
    if (!TIMELINE_VALUES.has(input.timeline)) errors.timeline = "pick one.";
  }

  if (step === 2) {
    if (!input.name.trim()) errors.name = "who's asking?";
    if (!isEmail(input.email)) errors.email = "i need somewhere to reply.";
  }

  return errors;
}

export function validate(input: RequestInput): FieldErrors {
  return {
    ...validateStep(0, input),
    ...validateStep(1, input),
    ...validateStep(2, input),
  };
}

export function validateAttachment(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_BYTES) return "that's over 2 mb — send a link instead.";
  // Browsers leave `type` empty for some files (notably .md on Windows), so an
  // empty type falls back to the extension rather than being rejected outright.
  const type = file.type || "";
  if (type && !ACCEPTED_ATTACHMENTS.includes(type)) return "pdf, word, markdown or text only.";
  if (!type && !/\.(pdf|md|txt|docx?)$/i.test(file.name)) {
    return "pdf, word, markdown or text only.";
  }
  return null;
}

/* ── the shape handed to the ui ── */

export type WorkRequest = {
  id: string;
  reference: string;
  jobType: string;
  title: string;
  scope: string;
  budget: string;
  timeline: string;
  links: string | null;
  name: string;
  email: string;
  company: string | null;
  status: Status;
  adminNotes: string | null;
  createdAt: number;
  updatedAt: number;
};
