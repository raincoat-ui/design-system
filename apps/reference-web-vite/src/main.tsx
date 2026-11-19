import "./app.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ButtonScreen } from "./ButtonScreen";

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

createRoot(root).render(
  <StrictMode>
    <ButtonScreen />
  </StrictMode>,
);
