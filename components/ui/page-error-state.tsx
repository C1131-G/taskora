"use client";

import { ErrorState } from "@/components/ui/error-state";

export const PageErrorState = ({
  homeHref,
  retry,
  title,
  variant = "section",
}: {
  readonly homeHref?: "/" | "/portal" | undefined;
  readonly retry: () => void;
  readonly title: string;
  readonly variant?: "page" | "section";
}) => (
  <ErrorState homeHref={homeHref} retry={retry} title={title} variant={variant} />
);
