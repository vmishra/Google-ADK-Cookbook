import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyInitialTheme } from "./lib/theme";
import "./styles/globals.css";

applyInitialTheme();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
