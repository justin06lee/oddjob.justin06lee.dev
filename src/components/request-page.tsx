"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, FileText } from "lucide-react";
import { CopyButton } from "@/components/chrome/copy-button";
import { Docket } from "@/components/chrome/docket";
import { FadeIn } from "@/components/chrome/fade-in";
import { FileCard } from "@/components/chrome/file-card";
import { Stamp } from "@/components/chrome/stamp";
import { RequestForm } from "@/components/request-form";

/** Set NEXT_PUBLIC_TEMPLATE_DOC_URL to point this at the live Google Doc. */
const TEMPLATE_DOC_URL = process.env.NEXT_PUBLIC_TEMPLATE_DOC_URL;

type Filed = { reference: string; title: string };

export function RequestPage() {
  const [filed, setFiled] = React.useState<Filed | null>(null);

  if (filed) return <Receipt filed={filed} />;

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-14">
      <div className="min-w-0">
        <FadeIn>
          <h1 className="text-3xl tracking-tight text-white">file a work order</h1>
          <p className="mt-3 max-w-lg text-[15px] leading-7 text-white/60">
            four minutes, three steps. you&apos;ll get a reference number at the
            end — keep it, and quote it at me any time.
          </p>
        </FadeIn>

        <div className="mt-12">
          <RequestForm onFiled={setFiled} />
        </div>
      </div>

      {/* The second section: for people who'd rather write it up properly than
          type into a form. */}
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <FadeIn delay={0.2}>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
            or write it up first
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-white/50">
            if you&apos;d rather think it through offline, take the template. it
            asks the same questions the form does, plus the one most briefs
            miss — what you are explicitly <em className="not-italic text-white/70">not</em> asking for.
          </p>

          <div className="mt-5 h-40">
            <FileCard
              name="work-order-template.md"
              meta="markdown · 3 kb"
              href="/work-order-template.md"
              download
              layers={2}
              className="h-full"
            />
          </div>

          {TEMPLATE_DOC_URL ? (
            <a
              href={TEMPLATE_DOC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-4 inline-flex items-center gap-2 text-[13px] text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              <FileText aria-hidden className="size-3.5" strokeWidth={1.5} />
              open it as a google doc
            </a>
          ) : null}

          <p className="mt-4 text-[12px] leading-relaxed text-white/30">
            filled it in? attach it in step one — the form still wants a
            sentence or two, but you can keep it short.
          </p>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="text-[13px] leading-relaxed text-white/50">
              easier to just talk it through?
            </p>
            <a
              href="https://coffee.justin06lee.dev"
              className="group mt-3 inline-flex items-center gap-2 border border-white/20 px-4 py-2 text-[13px] text-white/80 transition-colors hover:border-white/40 hover:bg-white/5 hover:text-white"
            >
              <CalendarDays aria-hidden className="size-3.5" strokeWidth={1.5} />
              book a call
            </a>
          </div>
        </FadeIn>
      </aside>
    </div>
  );
}

function Receipt({ filed }: { filed: Filed }) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <FadeIn>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
          filed
        </p>
        <h1 className="mt-4 text-3xl tracking-tight text-white">that&apos;s in.</h1>
        <p className="mt-3 text-[15px] leading-7 text-white/60">
          a copy is on its way to your inbox. i read these myself, so expect a
          reply in a day or two rather than a minute.
        </p>
      </FadeIn>

      <FadeIn delay={0.15}>
        <div className="mt-8">
          <Docket
            kind="work order"
            reference={filed.reference}
            title={filed.title}
            mark={
              <Stamp size="sm" color="var(--hazard)">
                received
              </Stamp>
            }
            stub={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                  keep this reference
                </span>
                <CopyButton
                  text={filed.reference}
                  className="border border-white/15 px-2.5 py-1 text-[11px] text-white/70 transition-colors hover:border-white/35 hover:text-white"
                />
              </div>
            }
          />
        </div>
      </FadeIn>

      <FadeIn delay={0.3}>
        <div className="mt-10 flex flex-wrap items-center gap-5">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            back to the shop
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={1.5}
            />
          </Link>
          <a
            href="https://coffee.justin06lee.dev"
            className="text-sm text-white/40 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            book a call too
          </a>
        </div>
      </FadeIn>
    </div>
  );
}
