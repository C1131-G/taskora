import { Eye, EyeSlash } from "phosphor-react-native";
import { type Ref, useState } from "react";
import { Pressable, StyleSheet, TextInput, type TextInputInstance, type TextInputProps, View } from "react-native";

import { useTheme } from "@/theme/theme-provider";
import { FONT_SCALE_CAP, typeStyle } from "@/theme/type-scale";
import { radii, spacing, theme } from "@/theme/tokens.generated";

export interface WorkspaceTextInputProps {
  readonly accessibilityLabel?: string;
  readonly autoCapitalize?: TextInputProps["autoCapitalize"];
  readonly autoComplete?: TextInputProps["autoComplete"];
  readonly autoCorrect?: boolean;
  readonly invalid?: boolean;
  readonly keyboardType?: "default" | "email-address" | "numeric" | "url";
  readonly multiline?: boolean;
  readonly onChangeText: (value: string) => void;
  readonly onSubmitEditing?: () => void;
  readonly placeholder?: string;
  /** Lets a form move focus to this field from the previous one. */
  readonly ref?: Ref<TextInputInstance>;
  readonly returnKeyType?: TextInputProps["returnKeyType"];
  readonly secureTextEntry?: boolean;
  /** "submit" keeps the keyboard up while focus moves to the next field. */
  readonly submitBehavior?: TextInputProps["submitBehavior"];
  readonly textContentType?: TextInputProps["textContentType"];
  readonly value: string;
}

export const WorkspaceTextInput = ({
  accessibilityLabel,
  autoCapitalize,
  autoComplete,
  autoCorrect,
  invalid = false,
  keyboardType = "default",
  multiline = false,
  onChangeText,
  onSubmitEditing,
  placeholder,
  ref,
  returnKeyType,
  secureTextEntry = false,
  submitBehavior,
  textContentType,
  value,
}: WorkspaceTextInputProps) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;
  // Password fields get an eye button so the typed text can be checked.
  const [revealed, setRevealed] = useState(false);
  const EyeIcon = revealed ? EyeSlash : Eye;

  return (
    <View
      style={[
        styles.frame,
        multiline ? styles.multiline : null,
        secureTextEntry ? styles.secureFrame : null,
        { backgroundColor: palette.sunken, borderColor: invalid ? palette.red : palette.border },
      ]}
    >
      <TextInput
        aria-invalid={invalid}
        accessibilityLabel={accessibilityLabel}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        maxFontSizeMultiplier={FONT_SCALE_CAP}
        multiline={multiline}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing === undefined ? undefined : () => onSubmitEditing()}
        placeholder={placeholder}
        placeholderTextColor={palette.text3}
        ref={ref}
        returnKeyType={returnKeyType}
        secureTextEntry={secureTextEntry && !revealed}
        submitBehavior={submitBehavior}
        textContentType={textContentType}
        style={[typeStyle("md"), styles.input, { color: palette.text }]}
        value={value}
      />
      {secureTextEntry ? (
        <Pressable
          accessibilityLabel={revealed ? "Hide password" : "Show password"}
          accessibilityRole="button"
          accessibilityState={{ selected: revealed }}
          hitSlop={8}
          onPress={() => setRevealed((current) => !current)}
          style={styles.eye}
        >
          <EyeIcon color={palette.text3} size={20} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: spacing.s3,
    paddingVertical: spacing.s2,
  },
  multiline: {
    minHeight: 96,
  },
  secureFrame: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s2,
  },
  eye: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  input: {
    flex: 1,
    textAlignVertical: "top",
  },
});
