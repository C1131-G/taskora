"use client";

import { RouteError } from "@/components/ui/route-error";

const AuthError = ({ retry }: { readonly retry: () => void }) => (
  <RouteError retry={retry} title="Sign-in page unavailable" />
);

export default AuthError;
