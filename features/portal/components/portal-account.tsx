/* eslint-disable shadcn/no-unknown-classes -- Portal pages reuse the workspace stylesheet classes. */

import { SkeletonBone } from "@/components/workspace/skeleton-shapes";
import {
  SkeletonKeep,
  SkelterSurface,
} from "@/components/workspace/skelter-surface";
import {
  EMAIL_COPY,
  PASSWORD_HINT,
  PUSH_COPY,
} from "@/features/portal/components/portal-account-copy";
import { PortalChangePassword } from "@/features/portal/components/portal-change-password";
import { PortalEmailControl } from "@/features/portal/components/portal-email-control";
import { PortalPushControl } from "@/features/portal/components/portal-push-control";
import { PortalSessions } from "@/features/portal/components/portal-sessions";
import { PortalSignOut } from "@/features/portal/components/portal-sign-out";
import { getPortalCompany } from "@/features/portal/portal-company";
import { getPortalEmailUpdates } from "@/features/portal/portal-queries";
import { listMySessions } from "@/features/user/user-queries";
import { readOrThrow } from "@/lib/read-result";

const PortalAccount = async () => {
  const company = await getPortalCompany();
  const [emailUpdates, sessions] = company?.preview
    ? [false, []]
    : [
        readOrThrow(await getPortalEmailUpdates({}), "Email updates"),
        readOrThrow(await listMySessions({}), "Sessions"),
      ];
  return (
    <div
      className={`portal-account${company?.preview ? " portal-account-preview-mode" : ""}`}
    >
      <section
        aria-labelledby="portal-profile-h"
        className="panel portal-panel portal-account-profile"
      >
        <h2 className="sec" id="portal-profile-h">
          Profile
        </h2>
        <dl className="portal-facts">
          <div>
            <dt>Name</dt>
            <dd>{company?.userName ?? "Unavailable"}</dd>
          </div>
          <div>
            <dt>Company</dt>
            <dd>{company?.companyName ?? "Unavailable"}</dd>
          </div>
        </dl>
      </section>
      {company?.preview ? (
        <p className="portal-banner portal-account-preview" role="note">
          Password, push notification, device and sign-out controls are not
          available while previewing a client. Use Exit preview above to return.
        </p>
      ) : (
        <>
          <section
            aria-labelledby="portal-password-h"
            className="panel portal-panel portal-account-password"
          >
            <h2 className="sec" id="portal-password-h">
              Change password
            </h2>
            <PortalChangePassword />
          </section>
          <section
            aria-labelledby="portal-push-h"
            className="panel portal-panel portal-account-push"
          >
            <h2 className="sec" id="portal-push-h">
              Push notifications
            </h2>
            <PortalPushControl
              publicKey={process.env["VAPID_PUBLIC_KEY"] ?? ""}
            />
          </section>
          <section
            aria-labelledby="portal-email-h"
            className="panel portal-panel portal-account-email"
          >
            <h2 className="sec" id="portal-email-h">
              Email updates
            </h2>
            <PortalEmailControl enabled={emailUpdates} />
          </section>
          <section
            aria-labelledby="portal-sessions-h"
            className="panel portal-panel portal-account-sessions"
          >
            <h2 className="sec" id="portal-sessions-h">
              Signed-in devices
            </h2>
            <PortalSessions sessions={sessions} />
          </section>
          <section
            aria-labelledby="portal-out-h"
            className="panel portal-panel portal-account-signout"
          >
            <h2 className="sec" id="portal-out-h">
              Sign out
            </h2>
            <PortalSignOut />
          </section>
        </>
      )}
    </div>
  );
};

const PortalAccountSkeleton = () => (
  <SkelterSurface label="Loading account">
    <div className="portal-account">
      <section className="panel portal-panel portal-account-profile">
        <SkeletonKeep>
          <h2 className="sec">Profile</h2>
        </SkeletonKeep>
        <dl className="portal-facts">
          {["Name", "Company"].map((label) => (
            <div key={label}>
              <SkeletonKeep>
                <dt>{label}</dt>
              </SkeletonKeep>
              <dd>
                <SkeletonBone shape="short" />
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="panel portal-panel portal-account-password">
        <SkeletonKeep>
          <h2 className="sec">Change password</h2>
        </SkeletonKeep>
        <div className="portal-form">
          {["Current password", "New password", "Confirm new password"].map(
            (label) => (
              <div className="field" key={label}>
                <SkeletonKeep>
                  <span className="label">{label}</span>
                </SkeletonKeep>
                <SkeletonBone shape="control" />
                {label === "New password" ? (
                  <SkeletonKeep>
                    <p className="hint">{PASSWORD_HINT}</p>
                  </SkeletonKeep>
                ) : null}
              </div>
            )
          )}
          <div className="portal-skeleton-span">
            <SkeletonBone shape="control" />
          </div>
        </div>
      </section>
      <section className="panel portal-panel portal-account-push">
        <SkeletonKeep>
          <h2 className="sec">Push notifications</h2>
        </SkeletonKeep>
        {/* Without a VAPID key the live panel renders no controls. */}
        {process.env["VAPID_PUBLIC_KEY"] ? (
          <div className="portal-stack">
            <SkeletonKeep>
              <p className="muted">{PUSH_COPY}</p>
            </SkeletonKeep>
            <div>
              <SkeletonBone shape="control" />
            </div>
            <span className="hint" />
          </div>
        ) : null}
      </section>
      <section className="panel portal-panel portal-account-email">
        <SkeletonKeep>
          <h2 className="sec">Email updates</h2>
        </SkeletonKeep>
        <div className="portal-stack">
          <SkeletonKeep>
            <p className="muted">{EMAIL_COPY}</p>
          </SkeletonKeep>
          <div>
            <SkeletonBone shape="control" />
          </div>
          <span className="hint" />
        </div>
      </section>
      <section className="panel portal-panel portal-account-sessions">
        <SkeletonKeep>
          <h2 className="sec">Signed-in devices</h2>
        </SkeletonKeep>
        <article className="mini">
          <div className="grow">
            <SkeletonBone />
            <SkeletonBone />
            <SkeletonBone />
          </div>
          <SkeletonBone shape="control" />
        </article>
      </section>
      <section className="panel portal-panel portal-account-signout">
        <SkeletonKeep>
          <h2 className="sec">Sign out</h2>
        </SkeletonKeep>
        <div className="portal-stack">
          <div>
            <SkeletonBone shape="control" />
          </div>
        </div>
      </section>
    </div>
  </SkelterSurface>
);

export { PortalAccount, PortalAccountSkeleton };
