import { flushSync } from "react-dom";

// Cross-fades the page between themes (styled in view-transitions.css) instead
// of a hard flash. flushSync lets next-themes swap the class inside the update
// callback so the new snapshot shows the new theme.
// Chrome 111-124 and Safari 18.0-18.1 only take a callback, not { types,
// update }, and without the "theme" type the cross-fade would hard-swap anyway,
// so browsers without typed transitions just switch.
const supportsTypedViewTransitions = (): boolean =>
  "startViewTransition" in document &&
  typeof ViewTransition !== "undefined" &&
  "types" in ViewTransition.prototype;

const switchTheme = (
  setTheme: (theme: string) => void,
  theme: string
): void => {
  if (!supportsTypedViewTransitions()) {
    setTheme(theme);
    return;
  }
  try {
    document.startViewTransition({
      types: ["theme"],
      update: () => {
        flushSync(() => setTheme(theme));
      },
    });
  } catch {
    setTheme(theme);
  }
};

export { switchTheme };
