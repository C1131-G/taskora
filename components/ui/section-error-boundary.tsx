"use client";

import { catchError, type ErrorInfo } from "next/error";

import { PageErrorState } from "@/components/ui/page-error-state";

const SectionErrorFallback = (
  { title, variant = "section" }: { readonly title: string; readonly variant?: "page" | "section" },
  { retry }: ErrorInfo,
) => <PageErrorState retry={retry} title={title} variant={variant} />;

export const SectionErrorBoundary = catchError(SectionErrorFallback);
