/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles -- Workspace classes are defined in apps/web/app/workspace-styles. */

import Link from "next/link";

import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { TeamAdminControls } from "@/features/people/components/team-admin-controls";
import { TeamCreateForm } from "@/features/people/components/team-create-form";
import { listTeams } from "@/features/people/people-queries";
import { getPageSession } from "@/src/server/auth/page-session";

// Only admins create teams. The button sits in the page header, whose height
// the title and blurb already set, so it appears without moving the list.
const TeamsActions = async () => {
  const session = await getPageSession();
  return session.kind === "authenticated" && session.user.role === "admin" ? (
    <TeamCreateForm />
  ) : null;
};

const TeamList = async () => {
  const [result, session] = await Promise.all([
    listTeams({}),
    getPageSession(),
  ]);
  if (!result.ok) {
    throw new Error("Teams could not be loaded.");
  }
  return result.data.length ? (
    <div className="pgrid teams-grid">
      {result.data.map((team) => (
        <article className="pcard team-card" key={team.id}>
          <div className="row">
            <span
              aria-hidden="true"
              className="pico"
              style={{ "--c": team.color }}
            >
              {team.name.slice(0, 1).toUpperCase()}
            </span>
            <Link
              className="team-card-link grow"
              href={`/teams/${team.id}`}
              transitionTypes={["nav-forward"]}
            >
              <strong>{team.name}</strong>
              <span className="muted">{team.memberCount} members</span>
            </Link>
          </div>
          <p className="desc">{team.description || "No description"}</p>
          {session.kind === "authenticated" && session.user.role === "admin" ? (
            <TeamAdminControls team={team} />
          ) : null}
        </article>
      ))}
    </div>
  ) : (
    <section className="panel panel-b">
      <h2>No teams yet</h2>
    </section>
  );
};

const TEAM_CARDS = SKELETON_KEYS.slice(0, 3);

// Mirrors the team card: avatar, name and member count, then the description.
// The admin-only Manage button is left out, as most people never see it.
const TeamListSkeleton = () => (
  <SkeletonRegion label="Loading teams…">
    <div className="pgrid teams-grid">
      {TEAM_CARDS.map((key) => (
        <article className="pcard team-card" key={key}>
          <div className="row">
            <span aria-hidden="true" className="pico" />
            <div className="team-card-link grow">
              <strong>
                <SkeletonBone shape="line" width="12ch" />
              </strong>
              <span className="muted">
                <SkeletonBone shape="line" width="9ch" />
              </span>
            </div>
          </div>
          <p className="desc">
            <SkeletonBone shape="line" width="28ch" />
          </p>
        </article>
      ))}
    </div>
  </SkeletonRegion>
);

export { TeamList, TeamListSkeleton, TeamsActions };
