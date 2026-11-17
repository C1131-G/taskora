/* eslint-disable shadcn/no-unknown-classes, shadcn/no-restyle -- Workspace classes are defined in apps/web/app/workspace-styles. */

import { ListMagnifyingGlass, LockOpen } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/workspace/empty-state";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { auditEventLabel } from "@/features/clients/audit-event-types";
import {
  listAuditEvents,
  listLockedAccounts,
} from "@/features/clients/clients-queries";
import { LockedAccountsPanel } from "@/features/clients/components/locked-accounts-panel";
import { readOrThrow } from "@/lib/read-result";
import { getPageSession } from "@/src/server/auth/page-session";

import {
  DEFAULT_LIMIT,
  parseFilters,
  endOfDay,
  shortenUserAgent,
  timeFormatter,
} from "./audit-log-parse";
import type { ParsedAuditFilters } from "./audit-log-parse";
import { AuditFilters, DetailsCell, PersonCell } from "./audit-log-parts";

const AuditLogView = async ({
  filters,
}: {
  readonly filters: ParsedAuditFilters;
}) => {
  const session = await getPageSession();
  if (session.kind !== "authenticated" || session.user.role !== "admin") {
    redirect("/");
  }
  const [events, locked] = await Promise.all([
    listAuditEvents({
      from: filters.from ? `${filters.from}T00:00:00.000Z` : undefined,
      limit: filters.limit ?? DEFAULT_LIMIT,
      query: filters.person,
      to: filters.to ? endOfDay(filters.to) : undefined,
      type: filters.type,
    }),
    listLockedAccounts({}),
  ]);
  const auditEvents = readOrThrow(events, "Audit events");
  const lockedAccounts = readOrThrow(locked, "Locked accounts");
  return (
    <>
      <LockedAccountsPanel accounts={lockedAccounts} />
      <AuditFilters filters={filters} />
      <section aria-label="Audit events" className="panel clients-panel">
        {auditEvents.length ? (
          <section
            aria-label="Audit events table"
            className="audit-scroll"
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users need to scroll the wide table.
            tabIndex={0}
          >
            <table className="clients-table audit-table">
              <TableCaption className="sr-only">
                Audit events, newest first
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Person</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditEvents.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="clients-nowrap">
                      <time dateTime={entry.createdAt} title={entry.createdAt}>
                        {timeFormatter.format(new Date(entry.createdAt))}
                      </time>
                    </TableCell>
                    <TableCell>{auditEventLabel(entry.type)}</TableCell>
                    <TableCell>
                      <PersonCell entry={entry} />
                    </TableCell>
                    <TableCell>{entry.actorName ?? "—"}</TableCell>
                    <TableCell className="clients-nowrap">
                      {entry.ip ?? "—"}
                    </TableCell>
                    <TableCell title={entry.userAgent ?? undefined}>
                      {shortenUserAgent(entry.userAgent)}
                    </TableCell>
                    <TableCell>
                      <DetailsCell details={entry.details} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </table>
          </section>
        ) : (
          <EmptyState
            action={
              <Link className="btn btn-secondary btn-sm" href="/clients/audit">
                Clear filters
              </Link>
            }
            description="Widen the date range or clear the person and event filters."
            icon={ListMagnifyingGlass}
            title="No audit events match these filters"
          />
        )}
      </section>
    </>
  );
};

const COLUMNS = [
  "Time",
  "Event",
  "Person",
  "By",
  "IP",
  "Device",
  "Details",
] as const;

const EVENT_ROWS = SKELETON_KEYS.slice(0, 5);

// Mirrors AuditLogView: the locked-accounts copy, the filter form and the
// column titles are static; the locked list and event rows are data. Locked
// accounts are rare, so that panel holds the empty state's height.
const AuditLogSkeleton = () => (
  <SkeletonRegion label="Loading audit events…">
    <div className="clients-workspace">
      <section aria-label="Locked accounts" className="panel clients-panel">
        <div className="panel-h clients-panel-h">
          <div>
            <h2>Locked accounts</h2>
            <p className="muted">
              Accounts lock for 15 minutes after 5 failed sign-ins.
            </p>
          </div>
        </div>
        <div className="empty-state sm">
          <span aria-hidden="true" className="glyph">
            <LockOpen size={22} />
          </span>
          <h3 className="es-h">
            <SkeletonBone shape="line" width="16ch" />
          </h3>
          <p>
            <SkeletonBone shape="line" width="48ch" />
          </p>
        </div>
      </section>
      <AuditFilters filters={parseFilters({})} />
      <section aria-label="Audit events" className="panel clients-panel">
        <section aria-label="Audit events table" className="audit-scroll">
          <table className="clients-table audit-table">
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {EVENT_ROWS.map((key) => (
                <TableRow key={key}>
                  <TableCell className="clients-nowrap">
                    <SkeletonBone shape="line" width="18ch" />
                  </TableCell>
                  <TableCell>
                    <SkeletonBone shape="line" width="9ch" />
                  </TableCell>
                  <TableCell>
                    <span className="clients-person">
                      <strong>
                        <SkeletonBone shape="line" width="12ch" />
                      </strong>
                      <span>
                        <SkeletonBone shape="line" width="18ch" />
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <SkeletonBone shape="line" width="2ch" />
                  </TableCell>
                  <TableCell className="clients-nowrap">
                    <SkeletonBone shape="line" width="12ch" />
                  </TableCell>
                  <TableCell>
                    <SkeletonBone shape="line" width="30ch" />
                  </TableCell>
                  <TableCell>
                    <SkeletonBone shape="line" width="2ch" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </table>
        </section>
      </section>
    </div>
  </SkeletonRegion>
);

export { AuditLogView, AuditLogSkeleton };
