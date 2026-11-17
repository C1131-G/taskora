/* eslint-disable shadcn/no-unknown-classes, shadcn/no-restyle -- Workspace classes are defined in apps/web/app/workspace-styles. */

import { Buildings } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Table,
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
import { listAllClientCompanies } from "@/features/clients/clients-queries";
import { readOrThrow } from "@/lib/read-result";
import { getPageSession } from "@/src/server/auth/page-session";

const ClientCompanyList = async () => {
  const session = await getPageSession();
  if (session.kind !== "authenticated" || session.user.role !== "admin") {
    redirect("/");
  }
  const companies = readOrThrow(
    await listAllClientCompanies(),
    "Client companies"
  );
  return companies.length ? (
    <section aria-label="Client companies" className="panel clients-panel">
      <Table className="clients-table">
        <TableCaption className="sr-only">Client companies</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="clients-num">Active users</TableHead>
            <TableHead className="clients-num">Projects</TableHead>
            <TableHead className="clients-num">Handlers</TableHead>
            <TableHead className="clients-num">Open bugs</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow key={company.id}>
              <TableCell>
                <Link
                  className="clients-company-link"
                  href={`/clients/${company.id}`}
                  transitionTypes={["nav-forward"]}
                >
                  <Buildings aria-hidden="true" size={16} />
                  <strong>{company.name}</strong>
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={company.active ? "secondary" : "outline"}>
                  {company.active ? "Active" : "Deactivated"}
                </Badge>
              </TableCell>
              <TableCell className="clients-num">{company.userCount}</TableCell>
              <TableCell className="clients-num">
                {company.projectCount}
              </TableCell>
              <TableCell className="clients-num">
                {company.handlerCount}
              </TableCell>
              <TableCell className="clients-num">
                {company.openBugCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  ) : (
    <EmptyState
      description="Create a company, link its projects and add client users so they can report bugs through the portal."
      headingLevel={2}
      icon={Buildings}
      size="panel"
      title="No client companies yet"
    />
  );
};

const COLUMNS = [
  "Company",
  "Status",
  "Active users",
  "Projects",
  "Handlers",
  "Open bugs",
] as const;

const ClientCompanyCount = async () => {
  const companies = readOrThrow(
    await listAllClientCompanies(),
    "Client companies"
  );
  return companies.length === 1
    ? "1 client company can report bugs through the portal."
    : `${companies.length} client companies can report bugs through the portal.`;
};

const COMPANY_ROWS = SKELETON_KEYS.slice(0, 5);

// Mirrors ClientCompanyList: the column headings are static; every row is
// data.
const ClientCompanyListSkeleton = () => (
  <SkeletonRegion label="Loading client companies…">
    <section aria-label="Client companies" className="panel clients-panel">
      <Table className="clients-table">
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column, index) => (
              <TableHead
                className={index > 1 ? "clients-num" : undefined}
                key={column}
              >
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {COMPANY_ROWS.map((key) => (
            <TableRow key={key}>
              <TableCell>
                <span className="clients-company-link">
                  <Buildings aria-hidden="true" size={16} />
                  <strong>
                    <SkeletonBone shape="line" width="14ch" />
                  </strong>
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  <SkeletonBone shape="line" width="5ch" />
                </Badge>
              </TableCell>
              {COLUMNS.slice(2).map((column) => (
                <TableCell className="clients-num" key={column}>
                  <SkeletonBone shape="line" width="2ch" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  </SkeletonRegion>
);

export { ClientCompanyCount, ClientCompanyList, ClientCompanyListSkeleton };
