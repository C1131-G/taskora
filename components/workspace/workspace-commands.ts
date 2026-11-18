import { COMMANDS } from "./workspace-command-list";
import type { Viewer, WorkspaceCommand } from "./workspace-command-types";

export type ModalState = "none" | "task-drawer" | "other";

export interface ShortcutContext {
  readonly modal: ModalState;
  readonly viewer: Viewer;
}

export interface ShortcutTarget {
  readonly isContentEditable?: boolean;
  readonly tagName?: string;
}

export interface ShortcutKeyEvent {
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly isComposing: boolean;
  readonly key: string;
  readonly metaKey: boolean;
  readonly repeat: boolean;
  readonly shiftKey: boolean;
  readonly target: ShortcutTarget | null;
}

export const getAvailableCommands = (
  viewer: Viewer
): readonly WorkspaceCommand[] =>
  COMMANDS.flatMap(({ isAvailable, ...command }) =>
    isAvailable(viewer) ? [command] : []
  );

export const isPaletteToggle = (
  event: Pick<ShortcutKeyEvent, "ctrlKey" | "key" | "metaKey">,
  isMac: boolean
): boolean =>
  event.key.toLowerCase() === "k" &&
  (isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey);

const TYPING_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA"]);

export const isTypingTarget = (target: ShortcutTarget | null): boolean =>
  target !== null &&
  (target.isContentEditable === true ||
    TYPING_TAGS.has(target.tagName?.toUpperCase() ?? ""));

// The task drawer is a modal too, but task actions stay live over it.
export const readModalState = (
  openDialogs: readonly {
    readonly dataset: Readonly<Record<string, string | undefined>>;
  }[]
): ModalState => {
  if (openDialogs.length === 0) {
    return "none";
  }
  return openDialogs.every(({ dataset }) => dataset.taskDrawer !== undefined)
    ? "task-drawer"
    : "other";
};

const SEQUENCE_LEADER = "g";

const DEFAULT_SEQUENCE_WINDOW_MS = 1500;

const hasModifier = ({ altKey, ctrlKey, metaKey }: ShortcutKeyEvent) =>
  altKey || ctrlKey || metaKey;

export const createShortcutMatcher = ({
  sequenceWindowMs = DEFAULT_SEQUENCE_WINDOW_MS,
}: { readonly sequenceWindowMs?: number } = {}) => {
  let leaderPressedAt: number | undefined;

  const handle = (
    event: ShortcutKeyEvent,
    { modal, viewer }: ShortcutContext,
    now: number
  ): WorkspaceCommand | undefined => {
    if (isTypingTarget(event.target)) {
      leaderPressedAt = undefined;
      return undefined;
    }
    if (
      modal === "other" ||
      event.repeat ||
      event.isComposing ||
      hasModifier(event)
    ) {
      return undefined;
    }
    const key = event.key.toLowerCase();
    const inSequence =
      leaderPressedAt !== undefined &&
      now - leaderPressedAt <= sequenceWindowMs;
    leaderPressedAt = undefined;
    if (!inSequence && key === SEQUENCE_LEADER) {
      leaderPressedAt = now;
      return undefined;
    }
    return getAvailableCommands(viewer).find(
      (command) =>
        (modal === "none" || command.scope === "task") &&
        command.keys.length === (inSequence ? 2 : 1) &&
        command.keys.at(-1)?.toLowerCase() === key &&
        (!inSequence || command.keys[0]?.toLowerCase() === SEQUENCE_LEADER)
    );
  };

  return { handle };
};

export const getPaletteToggleKeys = (isMac: boolean): readonly string[] =>
  isMac ? ["⌘", "K"] : ["Ctrl", "K"];
