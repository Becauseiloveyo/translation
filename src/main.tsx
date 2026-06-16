import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles/globals.css";
import "./styles/android-polish.css";
import "./styles/mobile-app.css";
import "./styles/neo-ui.css";
import "./styles/product-ui.css";
import "./styles/app-upgrades.css";
import "./styles/dictionary-manager-polish.css";
import "./styles/mobile-fixes.css";
import "./styles/dark-visual-balance.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
