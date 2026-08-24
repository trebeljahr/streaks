import { withLocalDev } from "@hatchkit/dev-plugin-next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  assetPrefix: "./",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@starter/server", "@starter/shared"],
};

export default withLocalDev(nextConfig, { slug: "streaks" });
