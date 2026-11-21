import { DomainRoute } from "@/features/workspace/domain-route";
import { domainKeys } from "@/runtime/query-keys";
import { filesProgram } from "@/features/workspace/domain-queries";

export default function Route() {
  return (
    <DomainRoute
      emptyMessage="Nothing here yet."
      emptyTitle="Files"
      makeProgram={(api) => filesProgram(api)}
      queryKey={domainKeys.list("files")}
      screenTitle="Files"
    />
  );
}
