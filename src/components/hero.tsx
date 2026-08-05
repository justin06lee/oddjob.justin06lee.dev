"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { AsciiShader } from "@/components/chrome/ascii-shader";
import { Chrome } from "@/components/chrome/chrome";
import { Dimension } from "@/components/chrome/dimension";
import { FadeIn } from "@/components/chrome/fade-in";
import { PencilRule } from "@/components/chrome/pencil-rule";
import { Scramble } from "@/components/chrome/scramble";
import { nutShader } from "@/lib/hero-shader";

export function Hero() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="order-2 lg:order-1">
        <FadeIn>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
            oddjob.justin06lee.dev
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="mt-4 text-4xl leading-[1.1] tracking-tight text-white sm:text-5xl">
            tell me what
            <br />
            you want built.
          </h1>
        </FadeIn>

        {/* The pencil rules the line under the headline once the column has
            finished arriving. The last FadeIn here starts at 0.5s and runs for
            0.8s, so 1.4 is the first moment nothing else is still moving — the
            rule then reads as the closing beat rather than as the first thing
            on screen.

            mt-3 rather than mt-2 because the pencil is tilted and stands above
            its own row; the extra step keeps it clear of the headline's
            descenders while it draws. */}
        <PencilRule
          trigger="mount"
          delay={1.4}
          duration={1.4}
          color="var(--blueprint)"
          className="mt-3 max-w-md"
        />

        <FadeIn delay={0.25}>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-white/60">
            <Scramble>
              sites, tools, scripts, and the jobs too odd to have a name.
            </Scramble>
          </p>
        </FadeIn>

        <FadeIn delay={0.35}>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/request"
              className="group inline-flex items-center justify-center gap-2 border border-[var(--hazard)] bg-[var(--hazard-faint)] px-5 py-3 text-sm text-white transition-colors hover:bg-[var(--hazard)] hover:text-black"
            >
              file a work order
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={1.5}
              />
            </Link>

            <a
              href="https://coffee.justin06lee.dev"
              className="group inline-flex items-center justify-center gap-2 border border-white/20 px-5 py-3 text-sm text-white/80 transition-colors hover:border-white/40 hover:bg-white/5 hover:text-white"
            >
              <CalendarDays aria-hidden className="size-4" strokeWidth={1.5} />
              book a call instead
            </a>
          </div>
        </FadeIn>

        <FadeIn delay={0.5}>
          <p className="mt-5 text-[12px] leading-relaxed text-white/30">
            a work order takes about four minutes. i read every one myself.
          </p>
        </FadeIn>
      </div>

      <div className="order-1 lg:order-2">
        {/* isolate={false} is required inside Chrome — the shader's paint
            containment would otherwise knock out the foil. */}
        <Chrome as="div">
          <AsciiShader
            shader={nutShader}
            isolate={false}
            size={11}
            fps={20}
            label="a hex nut turning over, drawn in ascii"
            className="h-[22rem] w-full sm:h-[26rem]"
          />
        </Chrome>

        <Dimension
          label="one (1) nut"
          cap="tick"
          color="var(--blueprint)"
          className="mt-3 opacity-70"
        />
      </div>
    </div>
  );
}
