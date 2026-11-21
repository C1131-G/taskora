/* eslint-disable shadcn/no-unknown-classes */

import { ErrorToast } from "@/components/workspace/error-toast";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { WorkspaceInput } from "@/components/workspace/workspace-controls";
import {
  WorkspaceSelect,
  WorkspaceSelectItem,
} from "@/components/workspace/workspace-select";
import { CustomFieldManager } from "@/features/custom-fields/components/custom-field-manager";
import { listProjectCustomFields } from "@/features/custom-fields/custom-fields-queries";
import { getProject } from "@/features/projects/projects-queries";
import { readOrThrow } from "@/lib/read-result";
import { getPageSession } from "@/src/server/auth/page-session";

// Administrators define the fields; everyone else is told where they stand.
// The project read decides whether the page exists at all.
export const ProjectCustomFields = async ({
  projectId,
}: {
  readonly projectId: string;
}) => {
  const [session, project] = await Promise.all([
    getPageSession(),
    getProject(projectId),
  ]);
  if (session.kind !== "authenticated" || session.user.role !== "admin") {
    return (
      <ErrorToast message="Only administrators can define custom fields." />
    );
  }
  const fields = readOrThrow(
    await listProjectCustomFields({ projectId: project.id }),
    "Custom fields"
  );
  return <CustomFieldManager fields={fields} projectId={project.id} />;
};

// CustomFieldManager's markup: a few field rows (name and type are bones, the
// buttons are static) above the "Add a field" form.
export const ProjectCustomFieldsSkeleton = () => (
  <SkeletonRegion label="Loading custom fields…">
    <div className="stack">
      <ul className="stack">
        {SKELETON_KEYS.slice(0, 3).map((key) => (
          <li className="panel panel-b stack" key={key}>
            <div className="row">
              <div className="grow">
                <strong>
                  <SkeletonBone shape="line" width="8em" />
                </strong>{" "}
                <span className="muted">
                  <SkeletonBone shape="line" width="4em" />
                </span>
              </div>
              {["Up", "Down", "Edit", "Archive"].map((label) => (
                <span className="btn" key={label}>
                  {label}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <section className="panel panel-b stack">
        <h2>Add a field</h2>
        <div className="stack">
          <div className="field">
            <label htmlFor="skeleton-field-name">Name</label>
            <WorkspaceInput id="skeleton-field-name" readOnly tabIndex={-1} />
          </div>
          <div className="field">
            <label htmlFor="skeleton-field-type">Type</label>
            <WorkspaceSelect
              displayValue="Text"
              id="skeleton-field-type"
              value="text"
            >
              <WorkspaceSelectItem value="text">Text</WorkspaceSelectItem>
            </WorkspaceSelect>
          </div>
          <label className="row" htmlFor="skeleton-field-required">
            <input id="skeleton-field-required" tabIndex={-1} type="checkbox" />
            <span>Required once a value is set</span>
          </label>
          <div className="row">
            <span className="btn btn-primary">Add field</span>
          </div>
        </div>
      </section>
    </div>
  </SkeletonRegion>
);
