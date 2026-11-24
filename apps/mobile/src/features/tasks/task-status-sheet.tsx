import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CaretDown, Check } from "phosphor-react-native";

import { WorkspaceSheet } from "@/components/workspace/workspace-sheet";
import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { radii, spacing, theme } from "@/theme/tokens.generated";
import { TASK_STATUS_ORDER, taskStatusLabel } from "@api/task-statuses";
import type { TaskStatus } from "@/features/tasks/queries";

export interface TaskStatusSheetProps {
  readonly current: TaskStatus;
  readonly onMove: (status: TaskStatus) => void;
  readonly open: boolean;
  readonly onClose: () => void;
}

/** The status mover: lists every status, marks the current one. */
const TaskStatusSheet = ({ current, onClose, onMove, open }: TaskStatusSheetProps) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  return (
    <WorkspaceSheet onClose={onClose} title="Move to" visible={open}>
      {TASK_STATUS_ORDER.map((status) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: status === current }}
          key={status}
          onPress={() => {
            onMove(status);
            onClose();
          }}
          style={({ pressed }) => [
            styles.option,
            { backgroundColor: pressed ? palette.surface2 : "transparent" },
          ]}
        >
          <Text style={[typeStyle("md"), { color: palette.text, flex: 1 }]}>
            {taskStatusLabel(status)}
          </Text>
          {status === current ? <Check color={palette.accent} size={18} weight="bold" /> : null}
        </Pressable>
      ))}
    </WorkspaceSheet>
  );
};

/** A compact trigger row that opens the status sheet. */
export const TaskStatusTrigger = (props: Omit<TaskStatusSheetProps, "open" | "onClose">) => {
  const [open, setOpen] = useState(false);
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  return (
    <View>
      <Pressable
        accessibilityLabel="Change status"
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: pressed ? palette.surface3 : palette.surface2 },
        ]}
      >
        <Text style={[typeStyle("sm", { weight: 500 }), { color: palette.text }]}>
          Status: {taskStatusLabel(props.current)}
        </Text>
        <CaretDown color={palette.text2} size={14} weight="bold" />
      </Pressable>
      <TaskStatusSheet {...props} onClose={() => setOpen(false)} open={open} />
    </View>
  );
};

const styles = StyleSheet.create({
  option: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    minHeight: 44,
    paddingHorizontal: spacing.s3,
  },
  trigger: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing.s1,
    minHeight: 32,
    borderRadius: radii.full,
    paddingHorizontal: spacing.s3,
    paddingVertical: spacing.s1,
  },
});
