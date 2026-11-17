/* eslint-disable shadcn/no-restyle -- Skeletons reuse the workspace tab and input classes. */
/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorToast } from "@/components/workspace/error-toast";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import {
  MembersDirectory,
  RolePermissions,
} from "@/features/people/components/members-directory";
import { EmployeeCreateForm } from "@/features/people/components/people-admin-forms";
import type { MembersSectionName } from "@/features/people/members-section-param";
import {
  listAllEmployees,
  listAllTeams,
} from "@/features/people/people-queries";
import { readOrThrow } from "@/lib/read-result";
import { getPageSession } from "@/src/server/auth/page-session";

const MembersSection = async ({
  section,
}: {
  readonly section: MembersSectionName;
}) => {
  const [result, teams, session] = await Promise.all([
    listAllEmployees(),
    listAllTeams(),
    getPageSession(),
  ]);
  const employees = readOrThrow(result, "Members");
  const isAdmin =
    session.kind === "authenticated" && session.user.role === "admin";
  return (
    <>
      <ErrorToast message={teams.ok ? null : teams.error.message} />
      <MembersDirectory
        canManageMembers={isAdmin}
        employees={employees}
        section={section}
        teams={teams.ok ? teams.data : []}
      />
    </>
  );
};

const MembersCount = async () => {
  const employees = readOrThrow(await listAllEmployees(), "Members");
  return `${employees.length} people in your Taskora workspace.`;
};

// Only admins add members; others see no action, so there is no space to hold.
const MembersActions = async () => {
  const [session, teams] = await Promise.all([
    getPageSession(),
    listAllTeams(),
  ]);
  if (session.kind !== "authenticated" || session.user.role !== "admin") {
    return null;
  }
  return <EmployeeCreateForm teams={readOrThrow(teams, "Teams")} />;
};

const COLUMNS = [
  "Member",
  "Role",
  "Team",
  "Active projects",
  "Open tasks",
  "Status",
] as const;

const ROLE_FILTERS = ["All", "Admin", "Employee"] as const;

const MEMBER_ROWS = SKELETON_KEYS.slice(0, 5);

// One member row of MembersDirectory: the avatar, three lines of identity,
// the role and status pills and the counts are data.
const MemberRowSkeleton = () => (
  <TableRow>
    <TableCell>
      <span className="members-person">
        <Avatar className="members-avatar">
          <AvatarFallback />
        </Avatar>
        <span className="members-person-copy">
          <strong>
            <SkeletonBone shape="line" width="12ch" />
          </strong>
          <span>
            <SkeletonBone shape="line" width="16ch" />
          </span>
          <span>
            <SkeletonBone shape="line" width="20ch" />
          </span>
        </span>
      </span>
    </TableCell>
    <TableCell>
      <span className="member-role">
        <SkeletonBone shape="line" width="7ch" />
      </span>
    </TableCell>
    <TableCell>
      <SkeletonBone shape="line" width="10ch" />
    </TableCell>
    <TableCell className="member-num">
      <SkeletonBone shape="line" width="2ch" />
    </TableCell>
    <TableCell className="member-num">
      <SkeletonBone shape="line" width="2ch" />
    </TableCell>
    <TableCell>
      <Badge className="member-status" variant="secondary">
        <SkeletonBone shape="line" width="5ch" />
      </Badge>
    </TableCell>
  </TableRow>
);

// Mirrors MembersSection + MembersDirectory for the section in the URL: the
// tabs, filters and column titles are static; the count and rows are data.
// Admin-only Actions column is left out, as most people never see it.
const MembersSectionSkeleton = ({
  section,
}: {
  readonly section: MembersSectionName;
}) => (
  <SkeletonRegion
    label={
      section === "roles" ? "Loading roles & permissions…" : "Loading members…"
    }
  >
    <div className="members-workspace">
      <nav aria-label="People" className="members-section-nav">
        <Link
          aria-current={section === "members" ? "page" : undefined}
          href="/members"
        >
          Members
        </Link>
        <Link href="/teams">Teams</Link>
        <Link
          aria-current={section === "roles" ? "page" : undefined}
          href="/members?section=roles"
        >
          Roles &amp; permissions
        </Link>
      </nav>
      {section === "roles" ? (
        <RolePermissions />
      ) : (
        <section className="panel members-panel">
          <div className="panel-h members-toolbar">
            <span className="members-count-label">
              <strong>
                <SkeletonBone shape="line" width="2ch" />
              </strong>{" "}
              members
            </span>
            <div className="members-controls">
              <Input
                aria-label="Search members"
                className="members-search"
                placeholder="Search members"
                type="search"
              />
              <div className="members-role-filter">
                {ROLE_FILTERS.map((label) => (
                  <WorkspaceButton
                    active={label === "All"}
                    key={label}
                    size="sm"
                    type="button"
                    variant="ghost"
                    workspace
                  >
                    {label}
                  </WorkspaceButton>
                ))}
              </div>
            </div>
          </div>
          <Table className="members-table">
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MEMBER_ROWS.map((key) => (
                <MemberRowSkeleton key={key} />
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  </SkeletonRegion>
);

export { MembersActions, MembersCount, MembersSection, MembersSectionSkeleton };
