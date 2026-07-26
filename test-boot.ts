import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { initializeDatabase, testDatabaseConnection } from "./server/db";
import { setupAuth } from "./server/auth";
import { registerRoutes } from "./server/routes";

async function testBoot() {
  console.log("1. Init DB");
  initializeDatabase();
  console.log("2. Test DB Connection");
  await testDatabaseConnection();
  console.log("3. Setup Auth");
  const app = express();
  const httpServer = createServer(app);
  setupAuth(app);
  console.log("4. Register Routes");
  await registerRoutes(httpServer, app);
  console.log("5. Setup Vite");
  const { setupVite } = await import("./server/vite");
  await setupVite(httpServer, app);
  console.log("6. Listening");
  httpServer.listen(5000, () => {
    console.log("SERVER RUNNING SUCCESSFULLY ON 5000");
  });
}

testBoot().catch(console.error);
