/* eslint-disable shadcn/no-unknown-classes */

import type { Metadata } from "next";

import { PageTransition } from "@/components/ui/page-transition";
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";
import { SuspenseReveal } from "@/components/ui/suspense-reveal";
import { SearchParamFallback } from "@/features/projects/components/search-param-fallback";
import {
  SettingsPanel,
  SettingsPanelSkeleton,
} from "@/features/settings/components/settings-panel";
import { parseSettingsSection } from "@/features/settings/settings-section";

export const metadata: Metadata = { title: "Settings | Taskora" };

const SECTION_FALLBACKS = {
  intake: <SettingsPanelSkeleton section="intake" />,
  preferences: <SettingsPanelSkeleton section="preferences" />,
  profile: <SettingsPanelSkeleton section="profile" />,
  sessions: <SettingsPanelSkeleton section="sessions" />,
  sla: <SettingsPanelSkeleton section="sla" />,
  workspace: <SettingsPanelSkeleton section="workspace" />,
};

const SettingsPage = ({ searchParams }: PageProps<"/settings">) => (
  <PageTransition>
    <div className="page">
      <div className="ph">
        <div>
          <h1>Settings</h1>
          <p>Manage your account and workspace preferences.</p>
        </div>
      </div>
      <SectionErrorBoundary title="Settings couldn't load">
        <SuspenseReveal
          fallback={
            <SearchParamFallback
              cases={SECTION_FALLBACKS}
              fallback={<SettingsPanelSkeleton section="appearance" />}
              name="section"
            />
          }
        >
          {/* oxlint-disable-next-line promise/prefer-await-to-then -- The page stays synchronous so its chrome paints in the static shell. */}
          {searchParams.then((params) => (
            <SettingsPanel
              initialSection={parseSettingsSection(params["section"])}
            />
          ))}
        </SuspenseReveal>
      </SectionErrorBoundary>
    </div>
  </PageTransition>
);

export default SettingsPage;
