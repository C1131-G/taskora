"use client";

import { RouteError } from "@/components/ui/route-error";

const PortalError = ({
  error,
  retry,
}: {
  readonly error: Error & { digest?: string };
  readonly retry: () => void;
}) => {
  void error;
  return <RouteError homeHref="/portal" retry={retry} title="Portal unavailable" />;
};

export default PortalError;
