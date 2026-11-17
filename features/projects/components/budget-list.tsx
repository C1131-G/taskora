/* eslint-disable shadcn/no-unknown-classes */

import Link from "next/link";

import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import {
  formatMoney,
  levelLabel,
  periodLabel,
} from "@/features/projects/budget-format";
import { listProjectBudgets } from "@/features/projects/projects-queries";
import { formatMinutes } from "@/features/time/time-format";
import { readOrThrow } from "@/lib/read-result";

const COLUMNS = [
  "Project",
  "Type",
  "Spent",
  "Remaining",
  "Used",
  "Status",
] as const;

// Every project with an hours budget: spent, remaining and percent. Admins only.
const BudgetList = async () => {
  const result = await listProjectBudgets({});
  if (!result.ok && result.error.code === "FORBIDDEN") {
    return (
      <section className="panel panel-b">
        <output className="muted">Only administrators can see budgets.</output>
      </section>
    );
  }
  const budgets = readOrThrow(result, "Budgets");
  if (budgets.length === 0) {
    return (
      <section className="panel panel-b">
        <p className="muted">
          No project has an hours budget yet. Set one from a project overview.
        </p>
      </section>
    );
  }
  return (
    <div className="tbl-wrap">
      <table className="tbl time-table">
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {budgets.map((budget) => (
            <tr key={budget.projectId}>
              <td>
                <Link href={`/projects/${budget.projectId}/time`}>
                  <strong>{budget.projectKey}</strong> {budget.projectName}
                </Link>
              </td>
              <td>
                {budget.kind === "retainer"
                  ? `Retainer, ${periodLabel(budget.period.key)}`
                  : "One-off"}
              </td>
              <td>
                {formatMinutes(budget.spentMinutes)} of{" "}
                {formatMinutes(budget.budgetMinutes)}
                {budget.spentAmountCents !== null &&
                budget.budgetAmountCents !== null ? (
                  <span className="muted">
                    {" "}
                    ({formatMoney(budget.spentAmountCents, budget.currency)})
                  </span>
                ) : null}
              </td>
              <td>
                {budget.remainingMinutes < 0
                  ? `Over by ${formatMinutes(-budget.remainingMinutes)}`
                  : formatMinutes(budget.remainingMinutes)}
              </td>
              <td>{budget.percent}%</td>
              <td>{levelLabel(budget.level)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Bone widths follow typical cell text, so the auto-sized columns land close
// to the loaded ones.
const CELL_WIDTHS = ["14em", "9em", "10em", "4em", "3ch", "6em"] as const;

const BudgetListSkeleton = () => (
  <SkeletonRegion label="Loading budgets…">
    <div className="tbl-wrap">
      <table className="tbl time-table">
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SKELETON_KEYS.slice(0, 3).map((key) => (
            <tr key={key}>
              {CELL_WIDTHS.map((width, index) => (
                <td key={COLUMNS[index]}>
                  <SkeletonBone shape="line" width={width} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </SkeletonRegion>
);

export { BudgetList, BudgetListSkeleton };
