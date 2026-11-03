import type { Route } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ErrorToast } from "@/components/workspace/error-toast";

export const NotFoundState = ({
  description,
  href,
  linkText,
  title,
}: {
  readonly description: string;
  readonly href: Route;
  readonly linkText: string;
  readonly title: string;
}) => (
  <div className="mx-auto w-full max-w-xl p-6 sm:py-12">
    <ErrorToast message={`${title}. ${description}`} />
    <Link className={buttonVariants({ size: "lg" })} href={href}>
      {linkText}
    </Link>
  </div>
);
