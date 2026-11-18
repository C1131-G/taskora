"use client";

/* eslint-disable shadcn/no-unknown-classes */

/* eslint-disable shadcn/no-restyle */

import Link from "next/link";
import { useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { EmployeeAdminControls } from "@/features/people/components/employee-admin-controls";
import type { EmployeeDirectoryEntry } from "@/src/server/people/user-contracts";

import type { MemberRole } from "./members-directory-parts";
import { MembersEmptyState, RolePermissions } from "./members-directory-parts";

const MembersDirectory = ({
  canManageMembers,
  employees,
  section,
  teams,
}: {
  readonly canManageMembers: boolean;
  readonly employees: readonly EmployeeDirectoryEntry[];
  readonly section: "members" | "roles";
  readonly teams: readonly { readonly id: string; readonly name: string }[];
}) => {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<MemberRole>("all");
  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return employees.filter((employee) => {
      const matchesQuery =
        !query ||
        [employee.name, employee.email, employee.jobTitle, employee.teamName]
          .filter(Boolean)
          .some((value) => value?.toLocaleLowerCase().includes(query));
      const matchesRole = role === "all" || employee.role === role;
      return matchesQuery && matchesRole;
    });
  }, [employees, role, search]);

  return (
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
        <section aria-label="Workspace members" className="panel members-panel">
          <div className="panel-h members-toolbar">
            <span className="members-count-label">
              <strong>{filteredEmployees.length}</strong>{" "}
              {filteredEmployees.length === 1 ? "member" : "members"}
            </span>
            <div className="members-controls">
              <Input
                aria-label="Search members"
                className="members-search"
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search members"
                type="search"
                value={search}
              />
              <div
                aria-label="Filter members by role"
                className="members-role-filter"
              >
                {(
                  [
                    ["all", "All"],
                    ["admin", "Admin"],
                    ["employee", "Employee"],
                  ] as const
                ).map(([value, label]) => (
                  <WorkspaceButton
                    active={role === value}
                    aria-pressed={role === value}
                    key={value}
                    onClick={() => setRole(value)}
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
          {filteredEmployees.length ? (
            <Table className="members-table">
              <TableCaption className="sr-only">Workspace members</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Active projects</TableHead>
                  <TableHead>Open tasks</TableHead>
                  <TableHead>Status</TableHead>
                  {canManageMembers ? <TableHead>Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <Link
                        className="members-person members-person-link"
                        href={`/members/${employee.id}`}
                        transitionTypes={["nav-forward"]}
                      >
                        <Avatar className="members-avatar">
                          {employee.avatar ? (
                            <AvatarImage alt="" src={employee.avatar} />
                          ) : null}
                          <AvatarFallback>
                            {employee.name.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="members-person-copy">
                          <strong>{employee.name}</strong>
                          <span>{employee.email}</span>
                          {employee.jobTitle ? (
                            <span>
                              {employee.jobTitle} · {employee.employeeId}
                            </span>
                          ) : (
                            <span>{employee.employeeId}</span>
                          )}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className={`member-role role-${employee.role}`}>
                        {employee.role === "admin" ? "Admin" : "Employee"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {employee.teamName ?? (
                        <span className="member-muted">No team</span>
                      )}
                    </TableCell>
                    <TableCell className="member-num">
                      {employee.activeProjectCount}
                    </TableCell>
                    <TableCell className="member-num">
                      {employee.openAssignedTaskCount}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="member-status"
                        data-status={
                          employee.mustChangePassword ? "pending" : "active"
                        }
                        variant={
                          employee.mustChangePassword ? "outline" : "secondary"
                        }
                      >
                        {employee.mustChangePassword
                          ? "Setup required"
                          : "Active"}
                      </Badge>
                    </TableCell>
                    {canManageMembers ? (
                      <TableCell>
                        <EmployeeAdminControls
                          employee={employee}
                          teams={teams}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <MembersEmptyState
              filtered={Boolean(search) || role !== "all"}
              onClearFilters={() => {
                setSearch("");
                setRole("all");
              }}
            />
          )}
        </section>
      )}
    </div>
  );
};

export { MembersDirectory };
