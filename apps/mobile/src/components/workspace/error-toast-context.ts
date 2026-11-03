import { createContext, useContext } from "react";

export const ErrorToastContext = createContext<(message: string) => void>(() => undefined);

export const useErrorToast = () => useContext(ErrorToastContext);
