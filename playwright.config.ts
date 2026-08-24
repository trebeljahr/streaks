import { defineConfig } from "@playwright/test";

const E2E_SERVER_PORT = process.env.E2E_SERVER_PORT ?? "5006";
const E2E_CLIENT_PORT = process.env.E2E_CLIENT_PORT ?? "3001";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: `http://127.0.0.1:${E2E_CLIENT_PORT}`,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "bash e2e/start-server.sh",
      url: `http://127.0.0.1:${E2E_SERVER_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        NODE_ENV: "test",
        PORT: E2E_SERVER_PORT,
        MONGODB_URI:
          process.env.MONGODB_URI ??
          "mongodb://127.0.0.1:27018/streaks-e2e",
        REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:6380",
        BETTER_AUTH_SECRET: "e2e-test-secret",
        BETTER_AUTH_URL: `http://127.0.0.1:${E2E_SERVER_PORT}`,
        FRONTEND_URL: `http://127.0.0.1:${E2E_CLIENT_PORT}`,
        S3_ENDPOINT: process.env.S3_ENDPOINT ?? "http://127.0.0.1:9002",
        S3_FORCE_PATH_STYLE: "true",
        S3_BUCKET_NAME: "streaks-e2e",
        S3_PUBLIC_URL:
          process.env.S3_PUBLIC_URL ??
          "http://127.0.0.1:9002/streaks-e2e",
        AWS_ACCESS_KEY_ID: "hatchkit-dev",
        AWS_SECRET_ACCESS_KEY: "hatchkit-dev",
        AWS_REGION: "us-east-1",
      },
    },
    {
      command: `pnpm --filter @starter/client run dev`,
      url: `http://127.0.0.1:${E2E_CLIENT_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        PORT: E2E_CLIENT_PORT,
        NEXT_PUBLIC_API_URL: `http://127.0.0.1:${E2E_SERVER_PORT}`,
        NEXT_PUBLIC_WS_URL: `ws://127.0.0.1:${E2E_SERVER_PORT}`,
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
