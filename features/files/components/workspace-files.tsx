/* eslint-disable shadcn/no-unknown-classes */

import {
  CaretDown,
  ListBullets,
  SquaresFour,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { ErrorToast } from "@/components/workspace/error-toast";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import {
  SkeletonKeep,
  SkelterSurface,
} from "@/components/workspace/skelter-surface";
import { ProjectFiles } from "@/features/files/components/project-files";
import { listProjectFiles } from "@/features/files/files-queries";
import { listProjects } from "@/features/projects/projects-queries";
import { getPageSession } from "@/src/server/auth/page-session";

const WorkspaceFiles = async () => {
  const [projects, session] = await Promise.all([
    listProjects({}),
    getPageSession(),
  ]);
  if (!projects.ok) {
    throw new Error("Files could not be loaded.");
  }
  const fileResults = await Promise.all(
    projects.data.map(async (project) => ({
      files: await listProjectFiles({ projectId: project.id }),
      project,
    }))
  );
  const isAdmin =
    session.kind === "authenticated" && session.user.role === "admin";

  return (
    <>
      {fileResults.map(({ files, project }) => (
        <section className="stack file-project" key={project.id}>
          <div className="row">
            <h2>
              {project.name}
              {files.ok ? (
                <span className="file-count">{files.data.length}</span>
              ) : null}
            </h2>
            <span className="sp" />
            <Link
              className="btn btn-sm btn-ghost"
              href={`/projects/${project.id}?view=files`}
            >
              Open project files
            </Link>
          </div>
          {files.ok ? (
            <ProjectFiles
              canUpload={isAdmin}
              currentUserId={
                session.kind === "authenticated" ? session.user.id : null
              }
              initialFiles={files.data}
              isAdmin={isAdmin}
              projectId={project.id}
            />
          ) : (
            <ErrorToast
              message={`Files are unavailable for ${project.name}.`}
            />
          )}
        </section>
      ))}
      {projects.data.length === 0 ? (
        <section className="panel panel-b muted">
          Create a project to start sharing files.
        </section>
      ) : null}
    </>
  );
};

const PROJECT_BLOCKS = SKELETON_KEYS.slice(0, 3);

const FILE_CARDS = SKELETON_KEYS.slice(0, 2);

const FILE_LAYOUT_BUTTONS = [
  { Icon: SquaresFour, layout: "grid" },
  { Icon: ListBullets, layout: "list" },
] as const;

// ProjectFilesToolbar at its defaults, as static shapes. Upload is admin-only,
// so like the drop area it is not reserved: most people never get it.
const FileToolbarSkeleton = () => (
  <div className="panel-h file-toolbar">
    <div className="file-search">
      <input placeholder="Search files" readOnly tabIndex={-1} type="search" />
    </div>
    <div className="file-filter">
      <span
        className="flex items-center justify-between"
        data-slot="select-trigger"
      >
        All types
        <CaretDown aria-hidden="true" size={16} />
      </span>
    </div>
    <div className="file-sort">
      <span
        className="flex items-center justify-between"
        data-slot="select-trigger"
      >
        Sort: Newest
        <CaretDown aria-hidden="true" size={16} />
      </span>
    </div>
    <div className="file-layout-switch">
      {FILE_LAYOUT_BUTTONS.map(({ Icon, layout }) => (
        <span
          className="inline-flex size-[30px] items-center justify-center"
          data-file-layout-button={layout}
          key={layout}
        >
          <Icon aria-hidden="true" size={16} />
        </span>
      ))}
    </div>
  </div>
);

// Mirrors WorkspaceFiles: each project card keeps its static link label and
// toolbar; the project name, count and file cards are data.
const WorkspaceFilesSkeleton = () => (
  <>
    {PROJECT_BLOCKS.map((block) => (
      <SkelterSurface key={block} label="Loading project files…">
        <section className="stack file-project">
          <div className="row">
            <h2>
              <SkeletonBone shape="title" />
            </h2>
            <span className="sp" />
            <SkeletonKeep>
              <span className="btn btn-sm btn-ghost">Open project files</span>
            </SkeletonKeep>
          </div>
          <section className="panel project-files">
            <SkeletonKeep>
              <FileToolbarSkeleton />
            </SkeletonKeep>
            <div className="file-results" data-layout="grid">
              {FILE_CARDS.map((key) => (
                <article className="file-card file-card-skeleton" key={key}>
                  <div className="file-card-preview">
                    <SkeletonBone shape="short" />
                  </div>
                  <div className="file-card-main">
                    <strong className="file-card-name">
                      <SkeletonBone />
                    </strong>
                    <span className="file-card-details">
                      <SkeletonBone shape="short" />
                    </span>
                    <span className="file-copy-state">
                      <SkeletonBone shape="short" />
                    </span>
                  </div>
                  <span className="size-[30px]" />
                </article>
              ))}
            </div>
          </section>
        </section>
      </SkelterSurface>
    ))}
  </>
);

export { WorkspaceFiles, WorkspaceFilesSkeleton };
