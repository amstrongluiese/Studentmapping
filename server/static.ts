import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Long-lived immutable CDN/browser caching for fingerprinted Vite assets
  const assetsPath = path.resolve(distPath, "assets");
  if (fs.existsSync(assetsPath)) {
    app.use(
      "/assets",
      express.static(assetsPath, {
        maxAge: "1y",
        immutable: true,
        etag: true,
      }),
    );
  }

  // Standard static assets (favicons, manifest, images) with 1-day cache + stale-while-revalidate
  app.use(
    express.static(distPath, {
      etag: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else {
          res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
        }
      },
    }),
  );

  // SPA fallback: never cache index.html so clients always receive the latest bundle references
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
