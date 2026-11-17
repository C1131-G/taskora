/* eslint-disable shadcn/no-restyle -- Skeletons reuse the workspace tab and input classes. */
/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

import type { Icon } from "@phosphor-icons/react";
import {
  Desktop,
  Devices,
  Moon,
  PaintBrush,
  SlidersHorizontal,
  Sun,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import type { SettingsSection } from "@/features/settings/settings-section";

const NAV_ITEMS = [
  { Icon: PaintBrush, label: "Appearance", value: "appearance" },
  { Icon: UserCircle, label: "Profile", value: "profile" },
  { Icon: SlidersHorizontal, label: "Preferences", value: "preferences" },
  { Icon: Devices, label: "Sessions", value: "sessions" },
] as const;

const THEMES = [
  { Icon: Desktop, label: "System", value: "system" },
  { Icon: Sun, label: "Light", value: "light" },
  { Icon: Moon, label: "Dark", value: "dark" },
] as const;

// Titles and blurbs are static; the form fields underneath are data, so every
// section except Appearance draws a few field-shaped bones.
const FORM_SECTIONS = {
  intake: {
    description:
      "Let people outside the portal report bugs through a public link.",
    fields: 2,
    title: "Intake forms",
  },
  preferences: {
    description: "Choose how dates and task lists are shown for your account.",
    fields: 3,
    title: "Preferences",
  },
  profile: {
    description: "Update the name and profile photo shown to your team.",
    fields: 2,
    title: "Profile",
  },
  sessions: {
    description: "Review and revoke sessions for this account.",
    fields: 3,
    title: "Active sessions",
  },
  sla: {
    description: "Set response and resolution targets for client bugs.",
    fields: 4,
    title: "SLA & business hours",
  },
  workspace: {
    description: "Manage company identity and default time zone.",
    fields: 2,
    title: "Workspace",
  },
} as const satisfies Record<
  Exclude<SettingsSection, "appearance">,
  {
    readonly description: string;
    readonly fields: number;
    readonly title: string;
  }
>;

const ThemeChoiceSkeleton = ({
  Icon,
  label,
  value,
}: {
  readonly Icon: Icon;
  readonly label: string;
  readonly value: string;
}) => (
  <label className="settings-theme-choice" htmlFor={value}>
    <RadioGroupItem id={value} value={value} />
    <Icon aria-hidden="true" size={16} />
    <span>{label}</span>
  </label>
);

const AppearanceSkeleton = () => (
  <section className="panel">
    <div className="panel-h">
      <h2>Appearance</h2>
      <p>Customize how Taskora looks on this device.</p>
    </div>
    <div className="panel-b stack">
      <div>
        <h3 className="settings-section-title">Theme</h3>
        <p className="muted">Choose a theme or follow your device setting.</p>
      </div>
      <RadioGroup
        aria-label="Theme"
        className="settings-theme-options"
        value="system"
      >
        {THEMES.map((theme) => (
          <ThemeChoiceSkeleton key={theme.value} {...theme} />
        ))}
      </RadioGroup>
    </div>
  </section>
);

const FormSectionSkeleton = ({
  section,
}: {
  readonly section: keyof typeof FORM_SECTIONS;
}) => {
  const { description, fields, title } = FORM_SECTIONS[section];
  return (
    <section className="panel">
      <div className="panel-h">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="panel-b stack">
        {SKELETON_KEYS.slice(0, fields).map((key) => (
          <div className="field" key={key}>
            <span>
              <SkeletonBone shape="line" width="12ch" />
            </span>
            <span aria-hidden="true" className="input" />
          </div>
        ))}
      </div>
    </section>
  );
};

// Mirrors SettingsWorkspace for the section in the URL. Admin-only nav entries
// are left out, as most people never see them.
const SettingsPanelSkeleton = ({
  section,
}: {
  readonly section: SettingsSection;
}) => (
  <SkeletonRegion label="Loading settings…">
    <Tabs className="settings-workspace" value={section}>
      <TabsList aria-label="Settings sections" className="settings-nav">
        {NAV_ITEMS.map(({ Icon, label, value }) => (
          <TabsTrigger key={value} value={value}>
            <Icon aria-hidden="true" size={16} />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="settings-content">
        {section === "appearance" ? (
          <AppearanceSkeleton />
        ) : (
          <FormSectionSkeleton section={section} />
        )}
      </div>
    </Tabs>
  </SkeletonRegion>
);

export { SettingsPanelSkeleton };
