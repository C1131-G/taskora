// The board's stages, shared by the board and its loading state.
export const BUG_BOARD_COLUMNS = [
  { id: "reported", label: "Reported", states: ["reported", "triaged"] },
  { id: "working", label: "In progress", states: ["in_progress", "rejected"] },
  {
    id: "verification",
    label: "Verification & approval",
    states: ["in_verification", "awaiting_admin_approval"],
  },
  {
    id: "release",
    label: "Release",
    states: ["approved_for_release", "released"],
  },
  { id: "closed", label: "Closed", states: ["closed", "duplicate"] },
] as const;
