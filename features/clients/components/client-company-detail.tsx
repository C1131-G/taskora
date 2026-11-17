/* eslint-disable shadcn/no-restyle -- Skeletons reuse the workspace tab and input classes. */
/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { getClientCompanyRecord } from "@/features/clients/clients-queries";
import { ClientCompanyWorkspace } from "@/features/clients/components/client-company-workspace";
import { listAllEmployees } from "@/features/people/people-queries";
import { listProjects } from "@/features/projects/projects-queries";
import { readOrThrow } from "@/lib/read-result";
import { getPageSession } from "@/src/server/auth/page-session";

const ClientCompanyDetailView = async ({
  companyId,
}: {
  readonly companyId: string;
}) => {
  const session = await getPageSession();
  if (session.kind !== "authenticated" || session.user.role !== "admin") {
    redirect("/");
  }
  const [detail, projectsResult, employeesResult] = await Promise.all([
    getClientCompanyRecord(companyId),
    listProjects({}),
    listAllEmployees(),
  ]);
  const projects = readOrThrow(projectsResult, "Projects");
  const employees = readOrThrow(employeesResult, "Employees");
  return (
    <ClientCompanyWorkspace
      detail={detail}
      employeeOptions={employees.map(({ email, id, name }) => ({
        email,
        id,
        name,
      }))}
      projectOptions={projects.flatMap(({ archivedAt, id, key, name }) =>
        archivedAt === null ? [{ id, key, name }] : []
      )}
    />
  );
};

const USER_COLUMNS = ["User", "Status", "Last active", "Actions"] as const;

const USER_ROWS = SKELETON_KEYS.slice(0, 4);

const TAB_LABELS = [
  "Users",
  "Projects",
  "Handlers",
  "Bugs summary",
  "Insight",
] as const;

// Mirrors ClientCompanyWorkspace: titles, the logo copy, tab names, buttons and
// column headings are static; the company, counts and users are data.
const ClientCompanyDetailSkeleton = () => (
  <SkeletonRegion label="Loading client company…">
    <div className="clients-workspace">
      <Link
        className="clients-back"
        href="/clients"
        transitionTypes={["nav-back"]}
      >
        <ArrowLeft aria-hidden="true" size={14} />
        All clients
      </Link>
      <header className="ph clients-heading">
        <div>
          <p className="eyebrow">Client company</p>
          <div className="clients-title">
            <h1>
              <SkeletonBone shape="line" width="10ch" />
            </h1>
            <Badge variant="secondary">
              <SkeletonBone shape="line" width="5ch" />
            </Badge>
          </div>
          <p>
            <SkeletonBone shape="line" width="52ch" />
          </p>
        </div>
        <div className="acts">
          <WorkspaceButton className="btn btn-sm btn-secondary" type="button">
            Rename
          </WorkspaceButton>
          <WorkspaceButton className="btn btn-sm btn-ghost" type="button">
            Deactivate
          </WorkspaceButton>
        </div>
      </header>
      <section className="panel clients-panel">
        <div className="panel-h clients-panel-h">
          <div>
            <h2>Logo</h2>
            <p className="muted">
              Shown next to the company name in the client portal. PNG, JPEG, or
              WebP up to 2 MB.
            </p>
          </div>
        </div>
        <div className="panel-b clients-logo">
          <span className="clients-logo-placeholder">No logo</span>
          <div className="acts clients-logo-acts">
            <WorkspaceButton
              size="sm"
              type="button"
              variant="secondary"
              workspace
            >
              Upload logo
            </WorkspaceButton>
          </div>
        </div>
      </section>
      <Tabs className="clients-tabs" value="users">
        <TabsList aria-label="Client company sections">
          {TAB_LABELS.map((label) => (
            <TabsTrigger key={label} value={label.toLowerCase()}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="users">
          <section className="panel clients-panel">
            <div className="panel-h clients-panel-h">
              <div>
                <h2>Users</h2>
                <p className="clients-preview-note">
                  Read-only preview; recorded in the audit log
                </p>
              </div>
              <WorkspaceButton className="btn btn-primary btn-sm" type="button">
                Add client user
              </WorkspaceButton>
            </div>
            <Table className="clients-table clients-users-table">
              <TableHeader>
                <TableRow>
                  {USER_COLUMNS.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {USER_ROWS.map((key) => (
                  <TableRow key={key}>
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
                      <span className="clients-badges">
                        <Badge variant="secondary">
                          <SkeletonBone shape="line" width="5ch" />
                        </Badge>
                      </span>
                    </TableCell>
                    <TableCell className="clients-nowrap">
                      <SkeletonBone shape="line" width="18ch" />
                    </TableCell>
                    <TableCell>
                      <div className="clients-row-actions">
                        <div className="clients-row-buttons">
                          <WorkspaceButton
                            className="btn btn-sm btn-ghost"
                            type="button"
                          >
                            Reset password
                          </WorkspaceButton>
                          <WorkspaceButton
                            className="btn btn-sm btn-ghost"
                            type="button"
                          >
                            View as client
                          </WorkspaceButton>
                          <WorkspaceButton
                            className="btn btn-sm btn-ghost"
                            type="button"
                          >
                            Deactivate
                          </WorkspaceButton>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  </SkeletonRegion>
);

export { ClientCompanyDetailView, ClientCompanyDetailSkeleton };
