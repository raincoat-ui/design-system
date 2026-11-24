import "./app.css";
import { type JSX, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ButtonScreen } from "./ButtonScreen";
import { InputScreen } from "./InputScreen";
import { TypographyScreen } from "./TypographyScreen";

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

// Each component has a screen at a path of its own. The Button's is the first page.
const SCREENS: Record<string, () => JSX.Element> = {
  "/typography": TypographyScreen,
  "/input": InputScreen,
};
const Screen = SCREENS[location.pathname] ?? ButtonScreen;

createRoot(root).render(
  <StrictMode>
    <Screen />
  </StrictMode>,
);
