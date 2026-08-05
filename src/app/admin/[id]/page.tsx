import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Mail } from "lucide-react";
import { DetailList } from "@/components/chrome/detail-list";
import { Docket } from "@/components/chrome/docket";
import { Stamp } from "@/components/chrome/stamp";
import { RequestControls } from "@/components/request-controls";
import { getRequest, listAttachments } from "@/lib/requests";
import { BUDGETS, JOB_TYPES, TIMELINES, labelFor } from "@/lib/work-order";

const stamp: Record<string, { text: string; color: string }> = {
  received: { text: "received", color: "var(--hazard)" },
  reading: { text: "reading", color: "rgba(255,255,255,0.5)" },
  quoted: { text: "quoted", color: "rgba(255,255,255,0.7)" },
  building: { text: "building", color: "rgba(255,255,255,0.85)" },
  done: { text: "done", color: "rgba(255,255,255,0.4)" },
  declined: { text: "declined", color: "rgba(248,113,113,0.7)" },
};

const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} mb`
    : `${Math.max(1, Math.round(bytes / 1024))} kb`;

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);

export default async function RequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getRequest(id);
  if (!request) notFound();

  const attachments = await listAttachments(id);
  const mark = stamp[request.status] ?? stamp.received!;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link
        href="/admin"
        className="group inline-flex items-center gap-2 text-[13px] text-white/40 transition-colors hover:text-white"
      >
        <ArrowLeft
          aria-hidden
          className="size-3.5 transition-transform group-hover:-translate-x-0.5"
          strokeWidth={1.5}
        />
        all work orders
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-12">
        <div className="min-w-0">
          <Docket
            kind="work order"
            reference={request.reference}
            title={request.title}
            mark={
              <Stamp size="sm" color={mark.color}>
                {mark.text}
              </Stamp>
            }
            rows={[
              { label: "job type", value: labelFor(JOB_TYPES, request.jobType) },
              { label: "budget", value: labelFor(BUDGETS, request.budget) },
              { label: "by when", value: labelFor(TIMELINES, request.timeline) },
              { label: "filed", value: formatDate(request.createdAt) },
            ]}
          />

          <section className="mt-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
              what they want
            </p>
            {/* whitespace-pre-wrap, not a markdown renderer: this is somebody's
                typing, and rendering it as markdown would mangle a stray
                asterisk into emphasis. */}
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-white/80">
              {request.scope}
            </p>
          </section>

          {request.links ? (
            <section className="mt-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
                links
              </p>
              <ul className="mt-3 flex flex-col gap-1">
                {request.links
                  .split(/\s*\n\s*/)
                  .filter(Boolean)
                  .map((link, index) => {
                    const external = /^https?:\/\//i.test(link);
                    return (
                      <li key={index} className="text-[13px]">
                        {external ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-white/70 underline-offset-4 hover:text-white hover:underline"
                          >
                            {link}
                          </a>
                        ) : (
                          <span className="break-all text-white/50">{link}</span>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </section>
          ) : null}

          {attachments.length > 0 ? (
            <section className="mt-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
                attached
              </p>
              <ul className="mt-3 flex flex-col gap-px">
                {attachments.map((file) => (
                  <li key={file.id}>
                    <a
                      href={`/admin/attachment/${file.id}`}
                      className="group flex items-center justify-between gap-3 border border-white/10 px-3 py-2 transition-colors hover:border-white/30 hover:bg-white/[0.03]"
                    >
                      <span className="min-w-0 truncate text-[13px] text-white/75">
                        {file.filename}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-[11px] tabular-nums text-white/30">
                          {formatBytes(Number(file.size))}
                        </span>
                        <Download
                          aria-hidden
                          className="size-3.5 text-white/25 group-hover:text-white"
                          strokeWidth={1.5}
                        />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
              who
            </p>
            <DetailList
              className="mt-3"
              items={[
                { label: "name", value: request.name },
                ...(request.company ? [{ label: "company", value: request.company }] : []),
                {
                  label: "email",
                  value: (
                    <a
                      href={`mailto:${request.email}?subject=${encodeURIComponent(
                        `${request.reference} — ${request.title}`,
                      )}`}
                      className="inline-flex items-center gap-1.5 text-white/80 underline-offset-4 hover:text-white hover:underline"
                    >
                      <Mail aria-hidden className="size-3.5" strokeWidth={1.5} />
                      {request.email}
                    </a>
                  ),
                },
              ]}
            />
          </section>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <RequestControls
            id={request.id}
            status={request.status}
            notes={request.adminNotes}
          />
        </aside>
      </div>
    </div>
  );
}
