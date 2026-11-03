import {
  ArrowsClockwise,
  At,
  Bell,
  ChatCircle,
  Clock,
  UserPlus,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

const TYPES: Readonly<Record<string, { icon: Icon; label: string }>> = {
  assignment: { icon: UserPlus, label: "Assignment" },
  comment: { icon: ChatCircle, label: "Comment" },
  due: { icon: Clock, label: "Due soon" },
  mention: { icon: At, label: "Mention" },
  update: { icon: ArrowsClockwise, label: "Update" },
};

export const getTypeLabel = (type: string): string =>
  TYPES[type]?.label ?? "Notification";

export const InboxTypeIcon = ({ type }: { readonly type: string }) => {
  const Glyph = TYPES[type]?.icon ?? Bell;
  return <Glyph aria-hidden="true" weight="bold" />;
};
