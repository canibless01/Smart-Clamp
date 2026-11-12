import { defineConfig } from "@playwright/test";
const external = process.env.UI_BASE_URL;
export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: external || "http://127.0.0.1:3100",
    viewport: { width: 1440, height: 1000 },
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
          args: ["--no-sandbox"],
        }
      : undefined,
    screenshot: "only-on-failure",
  },
  webServer: external
    ? undefined
    : {
        command: "npx next dev -p 3100 -H 127.0.0.1",
        url: "http://127.0.0.1:3100",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
