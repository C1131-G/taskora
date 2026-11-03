/* eslint-disable shadcn/no-restyle -- Skeletons reuse the workspace tab and input classes. */
/* eslint-disable shadcn/no-unknown-classes */

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorToast } from "@/components/workspace/error-toast";
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

const THEMES = ["System", "Light", "Dark"] as const;

// Mirrors SettingsWorkspace's Appearance tab: it needs no data, so the first
// section is the real static markup, not placeholder bones.
const SettingsPanelSkeleton = () => (
  <Tabs className="settings-workspace" value="appearance">
    <TabsList aria-label="Settings sections" className="settings-nav" inert>
      <TabsTrigger value="appearance">Appearance</TabsTrigger>
      <TabsTrigger value="profile">Profile</TabsTrigger>
      <TabsTrigger value="preferences">Preferences</TabsTrigger>
      <TabsTrigger value="sessions">Sessions</TabsTrigger>
    </TabsList>
    <output className="sr-only">Loading settings…</output>
    <div className="settings-content">
      <section className="panel">
        <div className="panel-h">
          <h2>Appearance</h2>
          <p>Customize how Taskora looks on this device.</p>
        </div>
        <div className="panel-b stack">
          <div>
            <h3 className="settings-section-title">Theme</h3>
            <p className="muted">
              Choose a theme or follow your device setting.
            </p>
          </div>
          <div className="settings-theme-options skeleton-theme-options">
            {THEMES.map((label) => (
              <span className="settings-theme-choice" key={label}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  </Tabs>
);

export { SettingsPanel, SettingsPanelSkeleton };
