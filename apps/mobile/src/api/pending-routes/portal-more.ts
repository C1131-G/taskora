import { Schema } from "effect";

import type { MobileRouteDefinition } from "./route-definition";

const ApprovalItemSchema = Schema.Struct({
  id: Schema.String,
  projectName: Schema.String,
  requestedBy: Schema.String,
  status: Schema.Literals(["pending", "approved", "rejected"]),
  title: Schema.String,
});

const PortalNotificationSchema = Schema.Struct({
  createdAt: Schema.String,
  id: Schema.String,
  readAt: Schema.NullOr(Schema.String),
  title: Schema.String,
});

export const portalMoreRoutes = [] as const satisfies readonly MobileRouteDefinition[];
