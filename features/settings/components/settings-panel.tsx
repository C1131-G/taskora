/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle -- Skeletons reuse the workspace tab and input classes. */

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
import { ErrorToast } from "@/components/workspace/error-toast";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { listAllClientCompanies } from "@/features/clients/clients-queries";
import { getAvatarDownloadUrl } from "@/features/files/files-queries";
import { IntakeFormsPanel } from "@/features/intake/components/intake-forms-panel";
import { listIntakeForms } from "@/features/intake/intake-queries";
import {
  getEmailSettings,
  getNotificationPreferences,
} from "@/features/notifications/notifications-queries";
import { listAllEmployees } from "@/features/people/people-queries";
import { listAllProjects } from "@/features/projects/projects-queries";
import { CalendarFeedCard } from "@/features/settings/components/calendar-feed-card";
import {
  CompanySettingsForm,
  NotificationPreferencesForm,
  PreferencesForm,
  ProfileForm,
} from "@/features/settings/components/settings-forms";
import { SettingsWorkspace } from "@/features/settings/components/settings-workspace";
import { SlaSettingsForm } from "@/features/settings/components/sla-settings-form";
import {
  getCalendarFeedStatus,
  getCompanySettings,
  getSlaSettings,
} from "@/features/settings/settings-queries";
import type { SettingsSection } from "@/features/settings/settings-section";
import { AvatarUpload } from "@/features/user/components/avatar-upload";
import { SessionList } from "@/features/user/components/session-list";
import {
  getPersonalPreferences,
  listMySessions,
} from "@/features/user/user-queries";
import { getPageSession } from "@/src/server/auth/page-session";

const listTimeZones = () => [
  ...new Set(["UTC", "Asia/Kolkata", ...Intl.supportedValuesOf("timeZone")]),
];

const getIntakePanel = (
  intakeForms: Awaited<ReturnType<typeof listIntakeForms>> | null,
  companies: Awaited<ReturnType<typeof listAllClientCompanies>> | null,
  projects: Awaited<ReturnType<typeof listAllProjects>> | null
) => {
  if (!intakeForms || !companies || !projects) {
    return null;
  }
  if (!intakeForms.ok || !companies.ok || !projects.ok) {
    return <ErrorToast message="Intake forms could not be loaded." />;
  }
  return (
    <IntakeFormsPanel
      companies={companies.data.flatMap(({ active, id, name }) =>
        active ? [{ id, label: name }] : []
      )}
      forms={intakeForms.data}
      projects={projects.data.map(({ id, key, name }) => ({
        id,
        label: `${key} ${name}`,
      }))}
    />
  );
};

const getSlaPanel = (
  sla: Awaited<ReturnType<typeof getSlaSettings>> | null
) => {
  if (!sla) {
    return null;
  }
  if (!sla.ok) {
    return <ErrorToast message={sla.error.message} />;
  }
  return (
    <SlaSettingsForm
      key={JSON.stringify(sla.data)}
      timeZones={listTimeZones()}
      values={sla.data}
    />
  );
};

const getNotificationPanel = (
  notificationPrefs: Awaited<ReturnType<typeof getNotificationPreferences>>,
  emailSettings: Awaited<ReturnType<typeof getEmailSettings>>,
  calendarFeed: Awaited<ReturnType<typeof getCalendarFeedStatus>>
) => (
  <>
    {notificationPrefs.ok && emailSettings.ok ? (
      <NotificationPreferencesForm
        emailDigest={emailSettings.data.digest}
        values={notificationPrefs.data}
      />
    ) : (
      <ErrorToast message="Notification preferences could not be loaded." />
    )}
    {calendarFeed.ok ? (
      <CalendarFeedCard status={calendarFeed.data} />
    ) : (
      <ErrorToast message="The calendar feed could not be loaded." />
    )}
  </>
);

const SettingsPanel = async ({
  initialSection,
}: {
  readonly initialSection: SettingsSection;
}) => {
  const [
    session,
    preferences,
    company,
    employees,
    sessions,
    notificationPrefs,
    emailSettings,
    calendarFeed,
  ] = await Promise.all([
    getPageSession(),
    getPersonalPreferences({}),
    getCompanySettings({}),
    listAllEmployees(),
    listMySessions({}),
    getNotificationPreferences({}),
    getEmailSettings({}),
    getCalendarFeedStatus({}),
  ]);
  const user = session.kind === "authenticated" ? session.user : null;
  const employee =
    user && employees.ok
      ? employees.data.find(({ id }) => id === user.id)
      : null;
  const isAdmin = user?.role === "admin";
  const [sla, avatar, intakeForms, companies, projects] = await Promise.all([
    isAdmin ? getSlaSettings({}) : Promise.resolve(null),
    user ? getAvatarDownloadUrl({ userId: user.id }) : Promise.resolve(null),
    isAdmin ? listIntakeForms({}) : Promise.resolve(null),
    isAdmin ? listAllClientCompanies() : Promise.resolve(null),
    isAdmin ? listAllProjects() : Promise.resolve(null),
  ]);
  return (
    <SettingsWorkspace
      canManageWorkspace={isAdmin}
      initialSection={initialSection}
      intake={getIntakePanel(intakeForms, companies, projects)}
      notificationPreferences={getNotificationPanel(
        notificationPrefs,
        emailSettings,
        calendarFeed
      )}
      preferences={
        preferences.ok ? (
          <PreferencesForm values={preferences.data} />
        ) : (
          <ErrorToast message={preferences.error.message} />
        )
      }
      profile={
        employee ? (
          <div className="stack">
            <ErrorToast
              message={avatar && !avatar.ok ? avatar.error.message : null}
            />
            <div className="panel-b">
              <AvatarUpload
                initialUrl={avatar?.ok ? avatar.data : null}
                userId={employee.id}
              />
            </div>
            <ProfileForm name={employee.name} />
          </div>
        ) : (
          <ErrorToast
            message={
              employees.ok
                ? "Profile details are unavailable."
                : employees.error.message
            }
          />
        )
      }
      sla={getSlaPanel(sla)}
      sessions={
        sessions.ok ? (
          <SessionList sessions={sessions.data} />
        ) : (
          <ErrorToast message={sessions.error.message} />
        )
      }
      workspace={
        company.ok ? (
          <CompanySettingsForm values={company.data} />
        ) : (
          <ErrorToast message={company.error.message} />
        )
      }
    />
  );
};

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

export { SettingsPanel, SettingsPanelSkeleton };
