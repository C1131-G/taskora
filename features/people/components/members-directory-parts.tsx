"use client";

/* eslint-disable shadcn/no-unknown-classes */

/* eslint-disable shadcn/no-restyle */

import { Check, Minus, UsersThree } from "@phosphor-icons/react";

import {
  Table,
  TableBody,
  TableCell,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHeader,
} from "@/components/ui/table";
import { EmptyState } from "@/components/workspace/empty-state";
import { WorkspaceButton } from "@/components/workspace/workspace-button";

export type MemberRole = "all" | "admin" | "employee";

const ROLE_PERMISSIONS = [
  { admin: true, employee: true, label: "View company projects and tasks" },
  { admin: true, employee: true, label: "Create tasks" },
  {
    admin: true,
    employee: true,
    label: "Edit tasks they created or are assigned to",
  },
  { admin: true, employee: true, label: "Comment on visible active tasks" },
  { admin: true, employee: true, label: "Manage personal views and favorites" },
  {
    admin: true,
    employee: false,
    label: "Manage projects, milestones, and memberships",
  },
  {
    admin: true,
    employee: false,
    label: "Manage employees, teams, and company settings",
  },
  {
    admin: true,
    employee: false,
    label: "Manage calendar events and project files",
  },
  {
    admin: true,
    employee: false,
    label: "Archive and restore projects and tasks",
  },
] as const;

const PermissionValue = ({
  allowed,
  roleLabel,
}: {
  readonly allowed: boolean;
  readonly roleLabel: "Admin" | "Employee";
}) => (
  <span
    aria-label={`${roleLabel}: ${allowed ? "allowed" : "not allowed"}`}
    className={allowed ? "permission-allowed" : "permission-denied"}
  >
    {allowed ? (
      <Check aria-hidden="true" size={16} weight="bold" />
    ) : (
      <Minus aria-hidden="true" size={16} />
    )}
  </span>
);

export const RolePermissions = () => (
  <section aria-label="Roles and permissions" className="panel members-panel">
    <div className="panel-h">
      <h2>Roles &amp; permissions</h2>
      <p>Permissions are enforced on every server request.</p>
    </div>
    <Table className="members-permissions-table">
      <TableCaption className="sr-only">Role permissions</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Permission</TableHead>
          <TableHead>Employee</TableHead>
          <TableHead>Admin</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROLE_PERMISSIONS.map(({ admin, employee, label }) => (
          <TableRow key={label}>
            <TableRowHeader>{label}</TableRowHeader>
            <TableCell>
              <PermissionValue allowed={employee} roleLabel="Employee" />
            </TableCell>
            <TableCell>
              <PermissionValue allowed={admin} roleLabel="Admin" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </section>
);

export const MembersEmptyState = ({
  filtered,
  onClearFilters,
}: {
  readonly filtered: boolean;
  readonly onClearFilters: () => void;
}) =>
  filtered ? (
    <EmptyState
      action={
        <WorkspaceButton
          className="btn btn-secondary btn-sm"
          onClick={onClearFilters}
          type="button"
        >
          Clear filters
        </WorkspaceButton>
      }
      description="Try another name or show every role."
      icon={UsersThree}
      title="No members match these filters"
    />
  ) : (
    <EmptyState
      description="People appear here once an admin adds their accounts."
      icon={UsersThree}
      title="No members yet"
    />
  );
