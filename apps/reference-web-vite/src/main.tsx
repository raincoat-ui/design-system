import "./app.css";
import { type ComponentType, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ButtonScreen } from "./ButtonScreen";
import { ToastScreen } from "./ToastScreen";

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

/** One screen per component, by path. The Button's is the first page. */
const screens: Record<string, ComponentType> = {
  "/toast": ToastScreen,
};
const Screen = screens[location.pathname] ?? ButtonScreen;

createRoot(root).render(
  <StrictMode>
    <Screen />
  </StrictMode>,
);
