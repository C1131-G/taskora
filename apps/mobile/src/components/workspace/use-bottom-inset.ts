import { useContext } from "react";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

/** The bottom safe-area inset, or 0 where no SafeAreaProvider is mounted. */
export const useBottomInset = (): number => useContext(SafeAreaInsetsContext)?.bottom ?? 0;
