import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress the annoying Google Maps Marker deprecation warning that clogs up the Vite error overlay
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const shouldSuppress = (args: any[]) => {
  if (typeof args[0] === "string") {
    if (args[0].includes("google.maps.Marker is deprecated")) return true;
    if (args[0].includes("RetiredVersion")) return true;
  }
  return false;
};

console.error = (...args) => {
  if (shouldSuppress(args)) return;
  originalConsoleError(...args);
};

console.warn = (...args) => {
  if (shouldSuppress(args)) return;
  originalConsoleWarn(...args);
};

createRoot(document.getElementById("root")!).render(<App />);
