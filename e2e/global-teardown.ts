import { execSync } from "child_process";

export default async function globalTeardown() {
  if (process.env.CI) return;

  console.log("[e2e] Cleaning up test containers...");
  const containers = [
    "starter-e2e-mongo",
    "starter-e2e-redis",
    "starter-e2e-seaweedfs",
  ];

  for (const name of containers) {
    try {
      execSync(`docker stop ${name} && docker rm ${name}`, {
        stdio: "ignore",
      });
    } catch {
      // Container may not exist or already stopped
    }
  }
}
