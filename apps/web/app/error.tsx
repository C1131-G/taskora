"use client";

import { RouteError } from "@/components/ui/route-error";

const RootError = ({ retry }: { readonly retry: () => void }) => (
  <RouteError retry={retry} title="Application error" />
);

export default RootError;
