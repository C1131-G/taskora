/* eslint-disable shadcn/no-unknown-classes -- Public intake screens reuse the auth chrome styles. */

import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";

import { PageTransition } from "@/components/ui/page-transition";
import { SuspenseReveal } from "@/components/ui/suspense-reveal";
import {
  ReferenceNote,
  ReferenceNoteSkeleton,
} from "@/features/intake/components/reference-note";
import { AuthCard } from "@/features/user/components/auth-card";

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { follow: false, index: false },
  title: "Report received | Taskora",
};

const Page = ({ searchParams }: PageProps<"/intake/[slug]/received">) => (
  <PageTransition>
    <AuthCard
      badge={<CheckCircle size={22} weight="duotone" />}
      description="The team has been told and will review it."
      title="Thank you, your report was received"
      titleId="intake-received-title"
    >
      <SuspenseReveal fallback={<ReferenceNoteSkeleton />}>
        {/* oxlint-disable-next-line promise/prefer-await-to-then -- The page stays synchronous so its chrome paints in the static shell. */}
        {searchParams.then(({ ref }) => (
          <ReferenceNote reference={ref} />
        ))}
      </SuspenseReveal>
    </AuthCard>
  </PageTransition>
);

export default Page;
