"use client";

import { useRouter } from "next/navigation";
import { Pagination } from "@/components/chrome/pagination";
import type { Status } from "@/lib/work-order";

/**
 * `Pagination` is callback-driven rather than link-driven, so this is the thin
 * adapter that turns a page number back into a url — which keeps the inbox
 * itself a server component, and keeps a page you're on shareable.
 */
export function AdminPager({
  page,
  pageCount,
  status,
  className,
}: {
  page: number;
  pageCount: number;
  status?: Status;
  className?: string;
}) {
  const router = useRouter();

  return (
    <Pagination
      page={page}
      pageCount={pageCount}
      className={className}
      onChange={(next) => {
        const query = new URLSearchParams();
        if (status) query.set("status", status);
        if (next > 1) query.set("page", String(next));
        const search = query.toString();
        router.push(search ? `/admin?${search}` : "/admin");
      }}
    />
  );
}
