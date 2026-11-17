import type { screen } from "@testing-library/react-native";

type HostElement = ReturnType<typeof screen.getByRole>;

/** True when the element renders inside a vertical ScrollView (a screen's content column). */
export const isInsideVerticalScrollView = (element: HostElement): boolean => {
  for (let node = element.parent; node !== null; node = node.parent) {
    if (node.type === "RCTScrollView" && node.props.horizontal !== true) return true;
  }
  return false;
};
