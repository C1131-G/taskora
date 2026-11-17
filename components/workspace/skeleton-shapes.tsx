/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles -- Skeletons share the real workspace layout classes. */

import { SkelterSurface } from "@/components/workspace/skelter-surface";

const SKELETON_KEYS = Array.from({ length: 42 }, (_, index) => `bone-${index}`);

// "line" sits inside a text element's line box, so the real line-height (not
// the bone) decides the height; `width` sizes it like the text it stands for.
const SkeletonBone = ({
  shape = "text",
  width,
}: {
  readonly shape?:
    | "text"
    | "short"
    | "avatar"
    | "control"
    | "title"
    | "block"
    | "line";
  readonly width?: string;
}) => (
  <span
    aria-hidden="true"
    className={`sk skeleton-bone skeleton-${shape}`}
    style={width ? { width } : undefined}
  >
    &nbsp;
  </span>
);

const SkeletonToolbar = ({ count = 4 }: { readonly count?: number }) => (
  <div className="toolbar skeleton-toolbar">
    {SKELETON_KEYS.slice(0, count).map((key) => (
      <SkeletonBone key={key} shape="control" />
    ))}
  </div>
);

const SkeletonTabs = ({ count = 3 }: { readonly count?: number }) => (
  <div className="tabs skeleton-tabs">
    {SKELETON_KEYS.slice(0, count).map((key) => (
      <span className="tab" key={key}>
        <SkeletonBone shape="short" />
      </span>
    ))}
  </div>
);

const SkeletonRows = ({
  rows = 5,
  avatar = false,
}: {
  readonly rows?: number;
  readonly avatar?: boolean;
}) => (
  <div className="feed lined skeleton-feed">
    {SKELETON_KEYS.slice(0, rows).map((key) => (
      <div className="row skeleton-feed-row" key={key}>
        {avatar ? <SkeletonBone shape="avatar" /> : null}
        <div className="skeleton-copy grow">
          <SkeletonBone />
          <SkeletonBone shape="short" />
        </div>
        <SkeletonBone shape="short" />
      </div>
    ))}
  </div>
);

const SkeletonStats = ({ count = 4 }: { readonly count?: number }) => (
  <div className="stats skeleton-stats">
    {SKELETON_KEYS.slice(0, count).map((key) => (
      <div className="stat" key={key}>
        <span className="k">
          <SkeletonBone shape="short" />
        </span>
        <span className="v">
          <SkeletonBone shape="title" />
        </span>
        <span className="d">
          <SkeletonBone />
        </span>
      </div>
    ))}
  </div>
);

// Skelter draws a bone for every td/th, so data tables are skeletoned as a grid:
// the column titles stay static outside the measured rows.
const SkeletonDataGrid = ({
  columns,
  label,
  rows = 5,
  widths,
}: {
  readonly columns: readonly string[];
  readonly label: string;
  readonly rows?: number;
  readonly widths: string;
}) => (
  <div className="skeleton-grid" style={{ "--cols": widths }}>
    <div aria-hidden="true" className="skeleton-grid-head">
      {columns.map((column) => (
        <span key={column}>{column}</span>
      ))}
    </div>
    <SkelterSurface label={label}>
      {SKELETON_KEYS.slice(0, rows).map((key) => (
        <div className="skeleton-grid-row" key={key}>
          {columns.map((column, index) => (
            <div key={column}>
              <SkeletonBone shape={index === 0 ? "text" : "short"} />
            </div>
          ))}
        </div>
      ))}
    </SkelterSurface>
  </div>
);

export {
  SkeletonDataGrid,
  SKELETON_KEYS,
  SkeletonBone,
  SkeletonRows,
  SkeletonStats,
  SkeletonTabs,
  SkeletonToolbar,
};
