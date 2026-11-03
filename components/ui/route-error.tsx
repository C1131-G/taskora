"use client";

import { PageErrorState } from "@/components/ui/page-error-state";

export const RouteError = ({
  homeHref = "/",
  retry,
  title,
}: {
  readonly homeHref?: "/" | "/portal";
  readonly retry: () => void;
  readonly title: string;
}) => (
  <div className="mx-auto w-full max-w-xl p-6 sm:py-12">
    <PageErrorState homeHref={homeHref} retry={retry} title={title} variant="page" />
  </div>
);
