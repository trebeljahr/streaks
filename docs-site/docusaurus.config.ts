import type { Config } from "@docusaurus/types";
import type { Plugin } from "@docusaurus/types";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const docsUrl = process.env.DOCS_SITE_URL ?? "https://docs.example.com";
const usesPlaceholderUrl = docsUrl === "https://docs.example.com";
const docsTitle = "Node Realtime Starter Docs";
const docsDescription =
  "Developer documentation for a production-ready Node realtime starter with Express, Next.js, WebSockets, auth, payments, and deployment workflows.";

function generatedRobotsPlugin(): Plugin<void> {
  return {
    name: "generated-robots",
    postBuild({ outDir }) {
      const body = usesPlaceholderUrl
        ? "User-agent: *\nDisallow: /\n"
        : `User-agent: *\nAllow: /\n\nSitemap: ${docsUrl.replace(/\/+$/, "")}/sitemap.xml\n`;

      writeFileSync(join(outDir, "robots.txt"), body);
    },
  };
}

const config: Config = {
  title: docsTitle,
  tagline: "A stampable starter for multiplayer web games and SaaS apps",
  url: docsUrl,
  baseUrl: "/",
  noIndex: usesPlaceholderUrl,
  titleDelimiter: "·",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.svg",

  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
        },
        blog: false,
        sitemap: usesPlaceholderUrl
          ? false
          : {
              lastmod: "date",
              changefreq: "weekly",
              priority: 0.7,
            },
      },
    ],
  ],

  plugins: [generatedRobotsPlugin],

  themeConfig: {
    image: "img/social-card.png",
    metadata: [
      { name: "description", content: docsDescription },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: docsTitle },
      { property: "og:image:alt", content: docsTitle },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image:alt", content: docsTitle },
    ],
    navbar: {
      title: docsTitle,
      items: [
        { type: "docSidebar", sidebarId: "docs", position: "left", label: "Docs" },
      ],
    },
    colorMode: {
      respectPrefersColorScheme: true,
    },
  },
};

export default config;
