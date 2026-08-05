import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Blueprint } from "@/components/chrome/blueprint";
import { Docket } from "@/components/chrome/docket";
import { FadeIn } from "@/components/chrome/fade-in";
import { Hazard } from "@/components/chrome/hazard";
import { Marquee } from "@/components/chrome/marquee";
import { Stamp } from "@/components/chrome/stamp";
import { Hero } from "@/components/hero";
import { SiteHeader } from "@/components/site-header";

const TICKER = [
  "sites",
  "internal tools",
  "scripts that run at 3am",
  "the thing you keep not doing",
  "design systems",
  "one-off scrapers",
  "odd jobs",
];

const STEPS = [
  {
    n: "01",
    title: "you file a work order",
    body: "what you want, roughly what it's worth, and when you need it. attach a spec if you already wrote one.",
  },
  {
    n: "02",
    title: "i read it and reply",
    body: "a day or two, not a minute. if it isn't a job i should take, i'll say so and point you somewhere better.",
  },
  {
    n: "03",
    title: "we agree the shape",
    body: "scope, price, dates — written down before anything gets built, so neither of us is guessing.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        actions={
          <Link
            href="/request"
            className="text-sm text-white/50 transition-colors hover:text-white"
          >
            file a job
          </Link>
        }
      />

      <Blueprint
        cell={8}
        major={5}
        color="var(--blueprint-line)"
        majorColor="var(--blueprint-major)"
        fade="bottom"
        ticks
        crosshair
        className="flex-1 px-5 py-14 sm:px-8 sm:py-20"
      >
        <main className="mx-auto w-full max-w-5xl">
          <Hero />

          <FadeIn delay={0.6}>
            <Marquee
              fade
              speed={34}
              className="mt-20 border-y border-white/10 py-3"
              separator={
                <Hazard
                  thickness={8}
                  pitch={9}
                  color="var(--hazard-dim)"
                  className="w-10"
                />
              }
            >
              {TICKER.map((item) => (
                <span
                  key={item}
                  className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45"
                >
                  {item}
                </span>
              ))}
            </Marquee>
          </FadeIn>

          <section className="mt-20">
            <FadeIn>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
                how it goes
              </p>
            </FadeIn>

            <div className="mt-6 grid gap-px sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <FadeIn key={step.n} delay={0.1 + index * 0.08}>
                  <div className="h-full border border-white/10 bg-black/40 p-5">
                    <span className="font-mono text-[11px] tabular-nums text-[var(--hazard)]">
                      {step.n}
                    </span>
                    <p className="mt-3 text-[15px] leading-tight text-white">{step.title}</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-white/50">{step.body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </section>

          <section className="mt-20 grid items-start gap-8 lg:grid-cols-2">
            <FadeIn>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
                  what you get back
                </p>
                <p className="mt-4 text-2xl leading-tight tracking-tight text-white">
                  a numbered docket, not a black hole.
                </p>
                <p className="mt-3 max-w-md text-[15px] leading-7 text-white/60">
                  every work order gets a reference the moment you file it. quote it
                  in an email, or at me on a call, and i&apos;ll know exactly which
                  job you mean.
                </p>
                <Link
                  href="/request"
                  className="group mt-6 inline-flex items-center gap-2 text-sm text-white underline-offset-4 hover:underline"
                >
                  file one
                  <ArrowRight
                    aria-hidden
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={1.5}
                  />
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={0.15}>
              <Docket
                kind="work order"
                reference="OJ-0042"
                title="rebuild the booking flow"
                mark={
                  <Stamp size="sm" color="var(--hazard)">
                    received
                  </Stamp>
                }
                rows={[
                  { label: "job type", value: "fix or finish something" },
                  { label: "budget", value: "1k – 5k" },
                  { label: "by when", value: "within a month" },
                ]}
                stub={
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                    keep this stub
                  </p>
                }
              />
            </FadeIn>
          </section>
        </main>
      </Blueprint>

      <footer className="border-t border-white/10 px-5 py-8 sm:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4">
          <p className="text-[12px] text-white/30">
            built by{" "}
            <a
              href="https://justin06lee.dev"
              className="text-white/50 underline-offset-4 hover:text-white hover:underline"
            >
              justin06lee.dev
            </a>
          </p>
          <a
            href="https://coffee.justin06lee.dev"
            className="text-[12px] text-white/30 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            or just book a call
          </a>
        </div>
      </footer>
    </div>
  );
}
