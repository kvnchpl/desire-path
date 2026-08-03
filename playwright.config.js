import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:8080",
    browserName: "chromium",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run serve",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: !process.env.CI,
  },
});
