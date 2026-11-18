import { and } from "@prisma/orm-postgres/orm-client";
import type { Effect } from "effect";

import { clientStatusLabel } from "@/features/portal/client-status";

import { loadSlaSettings } from "../company/sla-settings";
import type { AppError } from "../core/action-result";
import { COMPLETED_BUG_STATUSES } from "../work/bug-status-edges";
import { decodeBugWorkflowStatus } from "../work/bug-workflow-internal";
import {
  PROJECT_REMOVED_MESSAGE,
  loadCompanyBug,
  run,
} from "./portal-bug-access";
import { findBugs, summarize } from "./portal-bug-queries";
import {
  buildLifecycle,
  clientTimeline,
  clientVisibleAttachments,
  timelineActions,
} from "./portal-bug-view";
import type {
  PortalActor,
  PortalBugDetail,
  PortalBugSummary,
} from "./portal-contracts";
import type { ListCompanyBugsInput } from "./portal-input-contracts";

// The older list: the newest 200, with no way to reach the rest.
export const listBugs = (
  actor: PortalActor,
  input: ListCompanyBugsInput
): Effect.Effect<readonly PortalBugSummary[], AppError> =>
  run(async (transaction) =>
    summarize(
      transaction,
      actor,
      await findBugs(transaction, actor, input, null, 200)
    )
  );

export const getBug = (
  actor: PortalActor,
  bugId: string
): Effect.Effect<PortalBugDetail, AppError> =>
  run(async (transaction) => {
    const { bug, project, projectLinked, task } = await loadCompanyBug(
      transaction,
      actor,
      bugId
    );
    const [comments, evidence, activities, reporter, sla, slaSettings] =
      await Promise.all([
        transaction.orm.public.Comment.include("author")
          .where({ deletedAt: null, taskId: task.id, visibility: "public" })
          .orderBy((comment) => comment.createdAt.asc())
          .limit(200)
          .all(),
        transaction.orm.public.BugEvidence.where((row) =>
          and(row.bugReportId.eq(bug.id), row.fileAssetId.isNotNull())
        )
          .orderBy((row) => row.createdAt.asc())
          .all(),
        transaction.orm.public.Activity.where((activity) =>
          and(activity.taskId.eq(task.id), activity.action.in(timelineActions))
        )
          .orderBy((activity) => activity.createdAt.asc())
          .limit(200)
          .all(),
        transaction.orm.public.User.where({ id: bug.reporterId })
          .select("name")
          .first(),
        transaction.orm.public.BugSla.where({ bugId: bug.id }).first(),
        loadSlaSettings(transaction),
      ]);
    const fileIds = evidence.flatMap(({ fileAssetId }) =>
      fileAssetId ? [fileAssetId] : []
    );
    const files =
      fileIds.length === 0
        ? []
        : await transaction.orm.public.FileAsset.include("uploadedBy")
            .where((file) => and(file.id.in(fileIds), file.deletedAt.isNull()))
            .all();
    // Only what client-company users attached is shown; staff evidence stays
    // internal.
    const attachments = clientVisibleAttachments(files, actor.clientCompanyId);
    const status = decodeBugWorkflowStatus(bug.status);
    const label = clientStatusLabel(status, bug.resolution);
    const timeline = clientTimeline(activities);
    const open = !COMPLETED_BUG_STATUSES.has(status) && projectLinked;
    const isReporter = bug.reporterId === actor.id;
    const built = await buildLifecycle(
      transaction,
      actor,
      bug,
      comments.map((comment) => ({
        body: comment.body,
        isTeam: comment.author.role !== "client",
      }))
    );
    // A removed project leaves the report readable but takes every action away.
    const lifecycle = projectLinked
      ? built
      : {
          ...built,
          canRate: false,
          canReportAgain: false,
          verification: built.verification
            ? { ...built.verification, canReopen: false, canRespond: false }
            : null,
        };
    return {
      actualBehavior: bug.actualBehavior,
      attachments,
      browser: bug.browser,
      canAttach: open,
      canComment: open,
      canEdit: projectLinked && isReporter && status === "reported",
      canWithdraw: projectLinked && isReporter && status === "reported",
      comments: comments.map((comment) => ({
        authorName: comment.author.name,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        id: comment.id,
        isMine: comment.authorId === actor.id,
        isTeam: comment.author.role !== "client",
      })),
      createdAt: bug.createdAt.toISOString(),
      description: bug.description,
      device: bug.device,
      expectedBehavior: bug.expectedBehavior,
      firstResponse: {
        respondedAt: sla?.firstRespondedAt?.toISOString() ?? null,
        targetMinutes: bug.clientImpact
          ? slaSettings.targets[bug.clientImpact].firstResponseMinutes
          : null,
      },
      id: bug.id,
      impact: bug.clientImpact,
      isMine: isReporter,
      key: `${project.key}-${task.projectTaskNumber}`,
      lifecycle,
      os: bug.os,
      pageUrl: bug.route,
      projectId: project.id,
      projectName: project.name,
      readOnlyReason: projectLinked ? null : PROJECT_REMOVED_MESSAGE,
      reporterName: reporter?.name ?? "A colleague",
      reproductionSteps: bug.reproductionSteps,
      status: label,
      timeline,
      title: task.title,
      updatedAt: bug.updatedAt.toISOString(),
      version: bug.version,
    };
  });
