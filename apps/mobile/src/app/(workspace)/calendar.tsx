import { DomainRoute } from "@/features/workspace/domain-route";
import { domainKeys } from "@/runtime/query-keys";
import { calendarProgram } from "@/features/workspace/more-queries";

export default function Route() {
  return (
    <DomainRoute
      emptyMessage="Nothing here yet."
      emptyTitle="Calendar"
      makeProgram={(api) => calendarProgram(api)}
      queryKey={domainKeys.list("calendar")}
      screenTitle="Calendar"
    />
  );
}
