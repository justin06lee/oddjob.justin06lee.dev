import { Blueprint } from "@/components/chrome/blueprint";
import { NotFound } from "@/components/chrome/not-found";
import { SiteHeader } from "@/components/site-header";

/**
 * Installed as `app/not-found.tsx` — Next.js renders this for `notFound()` and
 * unmatched routes, so the 404 page works with zero extra wiring.
 *
 * Kept on the site's own furniture rather than left as the bare block: a 404 is
 * where somebody is already lost, and dropping the header would take away the
 * one thing that tells them where they've landed. `credit` is off because the
 * footer link below already says it.
 */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <Blueprint
        cell={8}
        major={5}
        color="var(--blueprint-line)"
        majorColor="var(--blueprint-major)"
        fade="radial"
        className="flex flex-1 items-center justify-center px-5 py-16"
      >
        <NotFound
          message="no work order by that name. the cat hasn't seen it either."
          links={[
            { label: "home", href: "/" },
            { label: "file a job", href: "/request" },
          ]}
          credit={false}
        />
      </Blueprint>

      <footer className="border-t border-white/10 px-5 py-8 sm:px-8">
        <p className="mx-auto w-full max-w-5xl text-[12px] text-white/30">
          built by{" "}
          <a
            href="https://justin06lee.dev"
            className="text-white/50 underline-offset-4 hover:text-white hover:underline"
          >
            justin06lee.dev
          </a>
        </p>
      </footer>
    </div>
  );
}
