import { describe, expect, it } from "vitest";

import { scrubText } from "./scrub";

describe("scrubText", () => {
  it("replaces an email address inside a message", () => {
    expect(scrubText("no account for jane+w@example.co.uk")).toBe("no account for [email]");
  });

  it("keeps package paths that only look like addresses", () => {
    const path =
      "/app/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/build/Release/better_sqlite3.node";
    expect(scrubText(`The module '${path}' was compiled`)).toBe(`The module '${path}' was compiled`);
    expect(scrubText("mailto:me@example.com")).toBe("mailto:[email]");
  });
});
