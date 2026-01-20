import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initEnvValidation } from "./lib/env-validation.ts";
import { initSentry } from "./lib/sentry.ts";

// Initialize Sentry first (before anything can error)
initSentry();

// Validate environment variables on startup
initEnvValidation();

createRoot(document.getElementById("root")!).render(<App />);
  