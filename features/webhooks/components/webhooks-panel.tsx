/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

import { redirect } from "next/navigation";

import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { WebhookCreateForm } from "@/features/webhooks/components/webhook-create-form";
import { WebhookEndpointCard } from "@/features/webhooks/components/webhook-endpoint-card";
import {
  listWebhookDeliveries,
  listWebhookEndpoints,
} from "@/features/webhooks/webhooks-queries";
import { readOrThrow } from "@/lib/read-result";
import { getPageSession } from "@/src/server/auth/page-session";

const DELIVERIES_SHOWN = 10;

const WebhooksPanel = async () => {
  const session = await getPageSession();
  if (session.kind !== "authenticated" || session.user.role !== "admin") {
    redirect("/");
  }
  const endpoints = readOrThrow(
    await listWebhookEndpoints({}),
    "Webhook endpoints"
  );
  const deliveryLists = await Promise.all(
    endpoints.map((endpoint) =>
      listWebhookDeliveries({
        endpointId: endpoint.id,
        limit: DELIVERIES_SHOWN,
      })
    )
  );
  return (
    <div className="stack">
      <WebhookCreateForm />
      {endpoints.length === 0 ? (
        <section className="panel panel-b">
          <h2>No endpoints yet</h2>
          <p className="muted">
            Add an endpoint above to start receiving workspace events.
          </p>
        </section>
      ) : (
        endpoints.map((endpoint, index) => (
          <WebhookEndpointCard
            deliveries={readOrThrow(
              deliveryLists[index] ?? {
                error: {
                  code: "UNAVAILABLE",
                  message: "Deliveries are unavailable.",
                  requestId: "",
                },
                ok: false,
              },
              "Webhook deliveries"
            )}
            endpoint={endpoint}
            key={endpoint.id}
          />
        ))
      )}
    </div>
  );
};

const DELIVERY_COLUMNS = [
  ["Event", "8em"],
  ["Status", "5em"],
  ["Attempts", "2ch"],
  ["Response", "3ch"],
  ["When", "8em"],
] as const;

// The real create form followed by one endpoint card: its labels, buttons and
// table header are static, its values and delivery rows are bones.
const WebhooksPanelSkeleton = () => (
  <SkeletonRegion label="Loading webhooks…">
    <div className="stack">
      <WebhookCreateForm />
      <article className="panel">
        <div className="panel-h">
          <h3>
            <SkeletonBone shape="line" width="10em" />
          </h3>
          <p>
            <SkeletonBone shape="line" width="10em" />
          </p>
        </div>
        <div className="panel-b stack">
          <dl className="stack">
            <div>
              <dt className="muted">Destination</dt>
              <dd>
                <SkeletonBone shape="line" width="18em" />
              </dd>
            </div>
            <div>
              <dt className="muted">Events</dt>
              <dd>
                <SkeletonBone shape="line" width="14em" />
              </dd>
            </div>
          </dl>
          <div className="row">
            <span className="btn btn-secondary btn-sm">Disable</span>
            <span className="btn btn-danger-ghost btn-sm">Remove</span>
          </div>
          <h4>Recent deliveries</h4>
          <table className="tbl">
            <thead>
              <tr>
                {DELIVERY_COLUMNS.map(([column]) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SKELETON_KEYS.slice(0, 3).map((key) => (
                <tr key={key}>
                  {DELIVERY_COLUMNS.map(([column, width]) => (
                    <td key={column}>
                      <SkeletonBone shape="line" width={width} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  </SkeletonRegion>
);

export { WebhooksPanel, WebhooksPanelSkeleton };
