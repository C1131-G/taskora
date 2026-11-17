"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { ReactNode } from "react";

interface SearchParamFallbackProps {
  readonly cases: Readonly<Partial<Record<string, ReactNode>>>;
  readonly fallback: ReactNode;
  readonly name: string;
}

const ResolvedFallback = ({
  cases,
  fallback,
  name,
}: SearchParamFallbackProps) => {
  const value = useSearchParams().get(name);
  return (value === null ? undefined : cases[value]) ?? fallback;
};

// A Suspense fallback cannot await searchParams, but the browser already has
// the URL: draw the skeleton for the `?<name>=` value the page is about to show.
// The hook reads runtime data, and a fallback sits outside the boundary it
// belongs to, so it gets its own boundary: the static shell draws the default
// skeleton and the client swaps in the one the URL asks for.
const SearchParamFallback = (props: SearchParamFallbackProps) => (
  <Suspense fallback={props.fallback}>
    <ResolvedFallback {...props} />
  </Suspense>
);

export { SearchParamFallback };
