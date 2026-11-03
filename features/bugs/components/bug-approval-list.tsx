/* eslint-disable shadcn/no-unknown-classes -- Bug screens use apps/web/app/workspace-styles. */

import { SealCheck } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/workspace/empty-state";
import { ErrorToast } from "@/components/workspace/error-toast";
import { listBugs } from "@/features/bugs/bugs-queries";
import { BugList } from "@/features/bugs/components/bug-list";
import { getPageSession } from "@/src/server/auth/page-session";

const BugApprovalList = async () => {
  const session = await getPageSession();
  if (session.kind !== "authenticated" || session.user.role !== "admin") {
    redirect("/bugs");
  }
  const result = await listBugs({ status: "awaiting_admin_approval" });
  if (!result.ok) {
    return <ErrorToast message="The approval inbox could not be loaded." />;
  }
  if (result.data.length === 0) {
    return (
      <EmptyState
        description="Verified fixes show up here for your sign-off. Nothing is waiting right now."
        headingLevel={2}
        icon={SealCheck}
        size="panel"
        title="All caught up"
      />
    );
  }
  return (
    <>
      <p className="approval-summary">
        <strong>{result.data.length}</strong>{" "}
        {result.data.length === 1 ? "fix is" : "fixes are"} waiting for your
        review
      </p>
      <BugList bugs={result.data} emptyMessage="" />
    </>
  );
};

export { BugApprovalList };
