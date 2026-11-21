import type { PreferenceAudience } from "@/features/preferences/queries";

/**
 * The app's query key factories. Every key holds exactly one data shape:
 * reads that shape the same endpoint differently get sibling keys under a
 * shared prefix, so one prefix invalidation still refreshes all of them.
 */
export const projectKeys = {
  all: ["projects"] as const,
  /** The raw `{ projects }` page from listProjects. */
  list: () => [...projectKeys.all, "list"] as const,
  /** The `{ rows }` overview list. */
  overview: () => [...projectKeys.all, "overview"] as const,
};

export const bugKeys = {
  all: ["bugs"] as const,
  /** The raw `{ bugs }` page from listBugs. */
  list: () => [...bugKeys.all, "list"] as const,
};

export const portalKeys = {
  all: ["portal"] as const,
  approvals: () => [...portalKeys.all, "approvals"] as const,
  /** Prefix for every portal bug read; invalidate this after a report. */
  bugs: () => [...portalKeys.all, "bugs"] as const,
  /** The raw bug array from listPortalBugs. */
  bugList: () => [...portalKeys.bugs(), "list"] as const,
  /** The `{ rows }` list on the portal bugs screen. */
  bugRows: () => [...portalKeys.bugs(), "rows"] as const,
  notifications: () => [...portalKeys.all, "notifications"] as const,
  /** The raw `{ projects }` page from listPortalProjects. */
  projects: () => [...portalKeys.all, "projects"] as const,
};

export const taskKeys = {
  all: ["tasks"] as const,
  detail: (id: string) => [...taskKeys.all, "detail", id] as const,
  mine: () => [...taskKeys.all, "mine"] as const,
};

export const inboxKeys = {
  all: ["inbox"] as const,
  list: () => [...inboxKeys.all, "list"] as const,
};

export const preferenceKeys = {
  all: ["notification-preferences"] as const,
  forAudience: (audience: PreferenceAudience) => [...preferenceKeys.all, audience] as const,
};

/** The generic `{ rows }` workspace domain lists, one key per domain. */
export const domainKeys = {
  all: ["domain"] as const,
  list: (domain: string) => [...domainKeys.all, domain] as const,
};
