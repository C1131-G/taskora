/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

import { redirect } from "next/navigation";

import { SkeletonBone } from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { listGithubConnections } from "@/features/github/github-queries";
import { listAllProjects } from "@/features/projects/projects-queries";
import { readOrThrow } from "@/lib/read-result";
import { getPageSession } from "@/src/server/auth/page-session";

import { GithubConnectionCard } from "./github-connection-card";
import { GithubConnectionForm } from "./github-connection-form";

const GithubPanel = async () => {
  const session = await getPageSession();
  if (session.kind !== "authenticated" || session.user.role !== "admin") {
    redirect("/");
  }
  const [connections, projects] = await Promise.all([
    listGithubConnections({}),
    listAllProjects(),
  ]);
  const connected = readOrThrow(connections, "GitHub connections");
  const choices = readOrThrow(projects, "Projects").map(
    ({ id, key, name }) => ({
      id,
      label: `${key} ${name}`,
    })
  );
  return (
    <div className="stack">
      <GithubConnectionForm projects={choices} />
      {connected.length === 0 ? (
        <section className="panel panel-b">
          <h2>No repositories yet</h2>
          <p className="muted">
            Connect a repository above to link its pull requests to tasks.
          </p>
        </section>
      ) : (
        connected.map((connection) => (
          <GithubConnectionCard connection={connection} key={connection.id} />
        ))
      )}
    </div>
  );
};

// The real create form (empty project list) followed by one connection card
// with the card's labels and buttons; repository, project and secret are bones.
const GithubPanelSkeleton = () => (
  <SkeletonRegion label="Loading GitHub…">
    <div className="stack">
      <GithubConnectionForm projects={[]} />
      <article className="panel">
        <div className="panel-h">
          <h3>
            <SkeletonBone shape="line" width="10em" />
          </h3>
          <p>
            <SkeletonBone shape="line" width="12em" />
          </p>
        </div>
        <div className="panel-b stack">
          <dl className="stack">
            <div>
              <dt className="muted">Secret</dt>
              <dd>
                <SkeletonBone shape="line" width="8em" />
              </dd>
            </div>
            <div>
              <dt className="muted">When a pull request is merged</dt>
              <dd>
                <SkeletonBone shape="line" width="16em" />
              </dd>
            </div>
          </dl>
          <div className="row">
            <span className="btn btn-secondary btn-sm">Disable</span>
            <span className="btn btn-secondary btn-sm">Complete on merge</span>
            <span className="btn btn-secondary btn-sm">New secret</span>
          </div>
        </div>
      </article>
    </div>
  </SkeletonRegion>
);

export { GithubPanel, GithubPanelSkeleton };
