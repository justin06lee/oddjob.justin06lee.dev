"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { Button } from "@/components/chrome/button";
import { Callout } from "@/components/chrome/callout";
import { Dropzone, type DropzoneFile } from "@/components/chrome/dropzone";
import { Field } from "@/components/chrome/field";
import { Input } from "@/components/chrome/input";
import { RadioGroup } from "@/components/chrome/radio-group";
import { Stepper } from "@/components/chrome/stepper";
import { Textarea } from "@/components/chrome/textarea";
import { submitRequest, type SubmitResult } from "@/app/actions";
import {
  ATTACHMENT_ACCEPT,
  BUDGETS,
  JOB_TYPES,
  MAX_ATTACHMENT_BYTES,
  MAX_SCOPE,
  MAX_TITLE,
  TIMELINES,
  validateStep,
  type FieldErrors,
  type RequestInput,
} from "@/lib/work-order";

const STEPS = [
  { label: "the job", description: "what and why" },
  { label: "the shape", description: "budget and timing" },
  { label: "you", description: "where to reply" },
];

/** Which step each field belongs to, so a server error can send you back to it. */
const STEP_OF: Record<string, number> = {
  jobType: 0,
  title: 0,
  scope: 0,
  attachment: 0,
  budget: 1,
  timeline: 1,
  links: 1,
  name: 2,
  email: 2,
  company: 2,
};

const EMPTY: RequestInput = {
  jobType: "",
  title: "",
  scope: "",
  budget: "",
  timeline: "",
  links: "",
  name: "",
  email: "",
  company: "",
};

export type RequestFormProps = {
  onFiled: (result: { reference: string; title: string }) => void;
};

export function RequestForm({ onFiled }: RequestFormProps) {
  const [step, setStep] = React.useState(0);
  const [values, setValues] = React.useState<RequestInput>(EMPTY);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [message, setMessage] = React.useState<string | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, startTransition] = React.useTransition();
  const headingRef = React.useRef<HTMLParagraphElement>(null);

  const set = <K extends keyof RequestInput>(key: K, value: RequestInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    // Clearing on edit rather than on blur: an error that survives the fix
    // reads as if the fix didn't take.
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  // Each step gates on its own fields, so you can't click past a missing
  // answer — using the same `validateStep` the action re-runs on submit, so the
  // two can't drift into disagreeing about what a valid work order is.
  const stepProblems = (index: number): FieldErrors => validateStep(index, values);

  const goTo = (index: number) => {
    setStep(index);
    // Moving between steps swaps the whole panel; without this the viewport
    // stays wherever the last field was and the new step opens mid-way down.
    headingRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const next = () => {
    const problems = stepProblems(step);
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      return;
    }
    goTo(Math.min(STEPS.length - 1, step + 1));
  };

  const submit = () => {
    const problems = stepProblems(2);
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      return;
    }

    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    if (file) data.set("attachment", file);

    startTransition(async () => {
      const result: SubmitResult = await submitRequest(data);
      if (result.ok) {
        onFiled({ reference: result.reference, title: result.title });
        return;
      }
      setErrors(result.errors);
      setMessage(result.message ?? null);
      // Send the user to the earliest step that has a problem, or they'll be
      // staring at a form with no visible error on it.
      const first = Object.keys(result.errors)
        .map((key) => STEP_OF[key] ?? 0)
        .sort((a, b) => a - b)[0];
      if (first != null) goTo(first);
    });
  };

  const files: DropzoneFile[] = file
    ? [{ id: "attachment", name: file.name, size: file.size }]
    : [];

  return (
    <div>
      <Stepper
        steps={STEPS}
        current={step}
        // Only backwards: a step ahead hasn't been earned yet, and `next`
        // is what validates the one you're on.
        onStepClick={goTo}
        className="mb-10"
      />

      <p
        ref={headingRef}
        className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40"
      >
        step {step + 1} of {STEPS.length} — {STEPS[step]!.label}
      </p>

      <div className="mt-6 flex flex-col gap-7">
        {step === 0 ? (
          <>
            <Field label="what kind of job is it?" error={errors.jobType} required>
              <RadioGroup
                variant="cards"
                ariaLabel="job type"
                value={values.jobType || null}
                onChange={(value) => set("jobType", value)}
                options={JOB_TYPES.map((job) => ({
                  value: job.value,
                  label: job.label,
                  description: job.blurb,
                }))}
              />
            </Field>

            <Field
              label="give it a name"
              hint="one line. this is what shows up in my inbox."
              error={errors.title}
              required
            >
              {(control) => (
                <Input
                  {...control}
                  maxLength={MAX_TITLE}
                  placeholder="rebuild the booking flow"
                  value={values.title}
                  onChange={(event) => set("title", event.target.value)}
                />
              )}
            </Field>

            <Field
              label="what do you actually want?"
              hint="what it is, who it's for, and what makes it worth doing. the more specific, the better the reply."
              error={errors.scope}
              required
            >
              {(control) => (
                <Textarea
                  {...control}
                  counter
                  rows={9}
                  maxLength={MAX_SCOPE}
                  placeholder="right now people book through a google form and i copy it into a calendar by hand…"
                  value={values.scope}
                  onChange={(event) => set("scope", event.target.value)}
                />
              )}
            </Field>

            <Field
              label="already wrote a spec?"
              hint="pdf, word, markdown or text, up to 2 mb. optional — the box above is enough."
              error={errors.attachment}
              optional
            >
              <Dropzone
                accept={ATTACHMENT_ACCEPT}
                maxSize={MAX_ATTACHMENT_BYTES}
                multiple={false}
                accent="var(--hazard)"
                label="drop a document here"
                hint="or click to pick one"
                files={files}
                onRemove={() => setFile(null)}
                onFiles={(accepted) => {
                  setFile(accepted[0] ?? null);
                  setErrors((current) => {
                    const nextErrors = { ...current };
                    delete nextErrors.attachment;
                    return nextErrors;
                  });
                }}
                onReject={(rejections) =>
                  setErrors((current) => ({
                    ...current,
                    attachment:
                      rejections[0]?.reason === "size"
                        ? "that's over 2 mb — send a link instead."
                        : "pdf, word, markdown or text only.",
                  }))
                }
              />
            </Field>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Field
              label="what's it worth to you?"
              hint="a band is fine. i'd rather know roughly than not at all."
              error={errors.budget}
              required
            >
              <RadioGroup
                variant="cards"
                ariaLabel="budget"
                value={values.budget || null}
                onChange={(value) => set("budget", value)}
                options={BUDGETS.map((budget) => ({
                  value: budget.value,
                  label: budget.label,
                  description: budget.blurb,
                }))}
              />
            </Field>

            <Field label="by when?" error={errors.timeline} required>
              <RadioGroup
                ariaLabel="timeline"
                value={values.timeline || null}
                onChange={(value) => set("timeline", value)}
                options={TIMELINES.map((timeline) => ({
                  value: timeline.value,
                  label: timeline.label,
                }))}
              />
            </Field>

            <Field
              label="anything to look at?"
              hint="repos, figma, a live url, a loom. one per line."
              error={errors.links}
              optional
            >
              {(control) => (
                <Textarea
                  {...control}
                  rows={4}
                  placeholder={"https://github.com/…\nhttps://figma.com/…"}
                  value={values.links}
                  onChange={(event) => set("links", event.target.value)}
                />
              )}
            </Field>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Field label="your name" error={errors.name} required>
              {(control) => (
                <Input
                  {...control}
                  autoComplete="name"
                  value={values.name}
                  onChange={(event) => set("name", event.target.value)}
                />
              )}
            </Field>

            <Field label="email" hint="where the reply goes." error={errors.email} required>
              {(control) => (
                <Input
                  {...control}
                  type="email"
                  autoComplete="email"
                  placeholder="you@somewhere.com"
                  value={values.email}
                  onChange={(event) => set("email", event.target.value)}
                />
              )}
            </Field>

            <Field label="company" error={errors.company} optional>
              {(control) => (
                <Input
                  {...control}
                  autoComplete="organization"
                  value={values.company}
                  onChange={(event) => set("company", event.target.value)}
                />
              )}
            </Field>
          </>
        ) : null}

        {message ? (
          <Callout variant="danger" title="that didn't go through">
            {message}
          </Callout>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-6">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            disabled={step === 0 || pending}
            onClick={() => goTo(step - 1)}
          >
            back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button variant="outline" iconRight={ArrowRight} onClick={next}>
              next
            </Button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={submit}
              className="inline-flex items-center gap-2 border border-[var(--hazard)] bg-[var(--hazard-faint)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--hazard)] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send aria-hidden className="size-4" strokeWidth={1.5} />
              {pending ? "filing…" : "file the work order"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
