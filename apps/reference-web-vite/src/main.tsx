import "./app.css";
import { type JSX, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ButtonScreen } from "./ButtonScreen";
import { InputScreen } from "./InputScreen";

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

// One screen per component, each at its own path; the Button's is the first page. The server
// gives every path this page.
const screens: Record<string, () => JSX.Element> = {
  "/": ButtonScreen,
  "/input": InputScreen,
};
const Screen = screens[location.pathname.replace(/(.)\/$/, "$1")] ?? ButtonScreen;

createRoot(root).render(
  <StrictMode>
    <Screen />
  </StrictMode>,
);
