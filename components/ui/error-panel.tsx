import type { ReactNode } from "react";

import { ErrorToast } from "@/components/workspace/error-toast";

export const ErrorPanel = ({
  actions,
  description,
  title,
}: {
  readonly actions: ReactNode;
  readonly description: string;
  readonly title: string;
  readonly variant?: "page" | "section";
}) => {
  return (
    <>
      <ErrorToast message={`${title}. ${description}`} />
      <div className="flex flex-wrap gap-2">{actions}</div>
    </>
  );
};
