import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "/",

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },

  // Local client root
  root: path.resolve(import.meta.dirname, "client"),

  // GitHub Pages build output
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },

  server: {
    host: "0.0.0.0",
    port: 5173,

    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});