import type { Effect } from "effect";

import type { AppError } from "../core/action-result";
import {
  decodeInboxCursor,
  encodeInboxCursor,
} from "../notifications/inbox-cursor";
import { run } from "./portal-bug-access";
import type { FoundBug } from "./portal-bug-queries";
import { findBugs, summarize } from "./portal-bug-queries";
import type { PortalActor, PortalBugSummary } from "./portal-contracts";
import type { ListCompanyBugsInput } from "./portal-input-contracts";

// Rows read per step while looking for a page's worth of listable bugs.
const SCAN_BATCH = 100;
const PAGE_DEFAULT_SIZE = 50;

export interface PortalBugPageOptions {
  readonly cursor?: string | undefined;
  readonly limit?: number | undefined;
}

export interface PortalBugPage {
  readonly items: readonly PortalBugSummary[];
  readonly nextCursor: string | null;
}

// One page of the same list. A page is filled with bugs that can be listed, so
// a bug that is skipped (its task is archived) never leaves a short page in the
// middle of the list.
export const listBugPage = (
  actor: PortalActor,
  input: ListCompanyBugsInput,
  options: PortalBugPageOptions = {}
): Effect.Effect<PortalBugPage, AppError> =>
  run(async (transaction) => {
    const limit = options.limit ?? PAGE_DEFAULT_SIZE;
    let after = options.cursor ? decodeInboxCursor(options.cursor) : null;
    const items: PortalBugSummary[] = [];
    let lastScanned: FoundBug | null = null;
    while (items.length < limit) {
      // eslint-disable-next-line no-await-in-loop
      const batch = await findBugs(
        transaction,
        actor,
        input,
        after,
        SCAN_BATCH
      );
      if (batch.length === 0) {
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      const listed = await summarize(transaction, actor, batch);
      const byId = new Map(listed.map((summary) => [summary.id, summary]));
      for (const bug of batch) {
        lastScanned = bug;
        const summary = byId.get(bug.id);
        if (summary) {
          items.push(summary);
        }
        if (items.length === limit) {
          break;
        }
      }
      const last = batch.at(-1);
      if (batch.length < SCAN_BATCH || !last) {
        break;
      }
      after = { createdAt: last.discoveredAt, id: last.id };
    }
    const more =
      items.length === limit && lastScanned
        ? await findBugs(
            transaction,
            actor,
            input,
            { createdAt: lastScanned.discoveredAt, id: lastScanned.id },
            1
          )
        : [];
    return {
      items,
      nextCursor:
        more.length > 0 && lastScanned
          ? encodeInboxCursor({
              createdAt: lastScanned.discoveredAt,
              id: lastScanned.id,
            })
          : null,
    };
  });
