import { Effect } from "effect";

import type { AppFailure } from "@/errors";
import type { ListRow } from "@/features/workspace/domain-list-screen";
import type { MobileClient } from "@api/client";
import type { MobileApi } from "@/services/mobile-api";

type Api = MobileApi["Service"];

export interface ApprovalItem {
  readonly id: string;
  readonly projectName: string;
  readonly requestedBy: string;
  readonly status: "approved" | "pending" | "rejected";
  readonly title: string;
}

export interface PortalNotificationItem {
  readonly createdAt: string;
  readonly id: string;
  readonly readAt: string | null;
  readonly title: string;
}


const call = <A>(api: Api, run: (client: MobileClient) => Promise<A>): Effect.Effect<A, AppFailure> =>
  api.call(run);

/** The client's approvals. */
export const portalApprovalsProgram = (api: Api) =>
  Effect.map(call(api, (client) => client.listPortalApprovals({ query: {} })), (page) => ({
    rows: page.items.map<ListRow>((item) => ({
      id: item.id,
      subtitle: `${item.projectName} · ${item.requestedBy} · ${item.status}`,
      title: item.title,
    })),
  }));

/** The client's portal notifications. */
export const portalNotificationsProgram = (api: Api) =>
  Effect.map(call(api, (client) => client.listPortalNotifications({ query: {} })), (page) => ({
    rows: page.items.map<ListRow>((item) => ({
      id: item.id,
      subtitle: `${item.createdAt.slice(0, 10)}${item.readAt === null ? " · unread" : ""}`,
      title: item.title,
    })),
  }));
