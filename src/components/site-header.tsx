import Link from "next/link";
import { Hazard } from "@/components/chrome/hazard";
import { cn } from "@/lib/utils";

export type SiteHeaderProps = {
  /** Breadcrumb-ish trail shown after the brand. */
  trail?: { label: string; href?: string }[];
  /** Right-side slot — an admin link, a back link. */
  actions?: React.ReactNode;
  className?: string;
};

/**
 * The thin top rule every page carries, matching coffee.justin06lee.dev — with
 * a strip of tape under it instead of a hairline border, which is the whole
 * difference in vocabulary between the two sites.
 */
export function SiteHeader({ trail = [], actions, className }: SiteHeaderProps) {
  return (
    <header className={cn("relative z-10", className)}>
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link
            href="/"
            className="shrink-0 tracking-tight text-white transition-opacity hover:opacity-70"
          >
            odd jobs
          </Link>
          {trail.map((crumb, index) => (
            <span key={index} className="flex min-w-0 items-center gap-2">
              <span aria-hidden className="text-white/20">
                /
              </span>
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="truncate text-white/50 transition-colors hover:text-white"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate text-white/50">{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <Hazard thickness={3} pitch={10} color="var(--hazard-dim)" />
    </header>
  );
}
