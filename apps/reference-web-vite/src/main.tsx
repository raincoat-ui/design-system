import "./app.css";
import { type ComponentType, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ButtonScreen } from "./ButtonScreen";
import { TabsScreen } from "./TabsScreen";

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

/** Each component's screen, by path. The Button's is the first page. */
const screens: Record<string, ComponentType> = {
  "/": ButtonScreen,
  "/tabs": TabsScreen,
};
const Screen = screens[location.pathname] ?? ButtonScreen;

createRoot(root).render(
  <StrictMode>
    <Screen />
  </StrictMode>,
);
