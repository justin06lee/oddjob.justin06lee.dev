import type { Metadata } from "next";
import { Blueprint } from "@/components/chrome/blueprint";
import { RequestPage } from "@/components/request-page";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "file a work order — odd jobs",
  description:
    "tell me what you want built: what it is, what it's worth, and when you need it.",
};

export default function Request() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader trail={[{ label: "work order" }]} />

      {/* No crosshair here — a pointer-tracking reticle over a form you're
          typing into is a distraction, not an affordance. */}
      <Blueprint
        cell={8}
        major={5}
        color="var(--blueprint-line)"
        majorColor="var(--blueprint-major)"
        fade="bottom"
        className="flex-1 px-5 py-14 sm:px-8 sm:py-20"
      >
        <div className="mx-auto w-full max-w-5xl">
          <RequestPage />
        </div>
      </Blueprint>
    </div>
  );
}
