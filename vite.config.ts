import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  cacheDir: path.resolve(import.meta.dirname, ".vite_cache"),
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

  // Production build with vendor chunking for fast mobile & low-end device loads
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    target: "es2020",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("wouter") || id.includes("@tanstack")) {
            return "vendor-react";
          }
          if (id.includes("leaflet") || id.includes("@react-google-maps") || id.includes("@turf") || id.includes("supercluster")) {
            return "vendor-maps";
          }
          if (id.includes("recharts") || id.includes("d3-")) {
            return "vendor-charts";
          }
          if (id.includes("framer-motion")) {
            return "vendor-motion";
          }
          if (id.includes("@radix-ui") || id.includes("lucide-react") || id.includes("vaul") || id.includes("cmdk")) {
            return "vendor-ui";
          }
          if (id.includes("xlsx")) {
            return "vendor-xlsx";
          }
        },
      },
    },
  },

  server: {
    host: "0.0.0.0",
    port: 5000,
    watch: {
      usePolling: true,
      ignored: ["**/node_modules/**", "**/.vite_cache/**", "**/server/uploads/**"],
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
