"use client";

import { RouteError } from "@/components/ui/route-error";

const WorkspaceError = ({ retry }: { readonly retry: () => void }) => (
  <RouteError retry={retry} title="Workspace unavailable" />
);

export default WorkspaceError;
