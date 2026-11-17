import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { WorkspaceUndoToast } from "@/components/workspace/workspace-undo";
import { ErrorToastContext } from "@/components/workspace/error-toast-context";

export { useErrorToast } from "@/components/workspace/error-toast-context";
const ErrorToastDisplayContext = createContext<{ message: string | undefined; dismiss: () => void }>({
  message: undefined,
  dismiss: () => undefined,
});

export const ErrorToastViewport = () => {
  const { message, dismiss } = useContext(ErrorToastDisplayContext);
  return <WorkspaceUndoToast message={message ?? ""} onClose={dismiss} visible={message !== undefined} />;
};

export const ErrorToastProvider = ({ children, renderViewport = true }: { readonly children: ReactNode; readonly renderViewport?: boolean }) => {
  const [messages, setMessages] = useState<readonly string[]>([]);
  const showError = useCallback((message: string) => {
    setMessages((current) => current.includes(message) ? current : [...current, message]);
  }, []);
  const dismiss = useCallback(() => setMessages((current) => current.slice(1)), []);
  const message = messages[0];

  useEffect(() => {
    if (message === undefined) return;
    const timer = setTimeout(dismiss, 6000);
    return () => clearTimeout(timer);
  }, [message, dismiss]);

  return (
    <ErrorToastContext.Provider value={showError}>
      <ErrorToastDisplayContext.Provider value={{ message, dismiss }}>
        <View style={styles.root}>
          {children}
          {renderViewport ? <ErrorToastViewport /> : null}
        </View>
      </ErrorToastDisplayContext.Provider>
    </ErrorToastContext.Provider>
  );
};

const styles = StyleSheet.create({ root: { flex: 1 } });
