import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/chrome/empty-state";
import { StatusPill } from "@/components/status-pill";
import { AdminPager } from "@/components/admin-pager";
import { PAGE_SIZE, listRequests, statusCounts } from "@/lib/requests";
import { BUDGETS, JOB_TYPES, STATUSES, type Status, labelFor } from "@/lib/work-order";

const asStatus = (value: string | undefined): Status | undefined =>
  value && (STATUSES as readonly string[]).includes(value) ? (value as Status) : undefined;

const relative = (timestamp: number): string => {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days}d ago` : `${Math.round(days / 30)}mo ago`;
};

export default async function AdminInbox({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = asStatus(params.status);

  const [{ requests, total }, counts] = await Promise.all([
    listRequests(page, status),
    statusCounts(),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const open = counts.received ?? 0;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl tracking-tight text-white">work orders</h1>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
          {open > 0 ? `${open} waiting on you` : "nothing waiting"}
        </p>
      </div>

      {/* Status filters double as the count readout — one row instead of a
          filter bar plus a stats strip saying the same numbers. */}
      <nav className="mt-6 flex flex-wrap items-center gap-1.5">
        <FilterChip label="all" href="/admin" active={!status} count={total} />
        {STATUSES.map((value) => (
          <FilterChip
            key={value}
            label={value}
            href={`/admin?status=${value}`}
            active={status === value}
            count={counts[value] ?? 0}
          />
        ))}
      </nav>

      {requests.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={status ? `nothing ${status}` : "no work orders yet"}
          description={
            status
              ? "try another filter."
              : "when somebody files one, it lands here."
          }
        />
      ) : (
        <ul className="mt-8 flex flex-col gap-px">
          {requests.map((request) => (
            <li key={request.id}>
              <Link
                href={`/admin/${request.id}`}
                className="group flex items-start justify-between gap-4 border border-white/10 p-4 transition-colors hover:border-white/30 hover:bg-white/[0.03]"
              >
                <span className="flex min-w-0 flex-col gap-1.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] tabular-nums tracking-[0.12em] text-white/45">
                      {request.reference}
                    </span>
                    <StatusPill status={request.status} />
                  </span>
                  <span className="truncate text-[15px] leading-tight text-white">
                    {request.title}
                  </span>
                  <span className="text-[12px] text-white/40">
                    {request.name}
                    {request.company ? ` · ${request.company}` : ""} ·{" "}
                    {labelFor(JOB_TYPES, request.jobType)} ·{" "}
                    {labelFor(BUDGETS, request.budget)}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[10px] tabular-nums text-white/25">
                    {relative(request.createdAt)}
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="size-4 text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                    strokeWidth={1.5}
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 ? (
        <AdminPager page={page} pageCount={pageCount} status={status} className="mt-8" />
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  href,
  active,
  count,
}: {
  label: string;
  href: string;
  active: boolean;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "border border-white/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white"
          : "border border-transparent px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/35 transition-colors hover:text-white/70"
      }
    >
      {label}
      <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
    </Link>
  );
}
