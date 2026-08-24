#!/usr/bin/env node
/*
 * Generate Electron desktop icons (icon.icns + icon.ico) from build/icon.png.
 *
 * Drop-in replacement for the legacy electron-icon-builder script, which
 * pulled phantomjs-prebuilt via icon-gen@2 → svg2png@4. We now use
 * icon-gen@5, which renders PNG variants through sharp.
 *
 * Linux uses build/icon.png directly via the electron-builder config,
 * so we only emit the macOS and Windows formats here.
 */
import iconGen from "icon-gen";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const src = path.join(root, "build", "icon.png");
const out = path.join(root, "build");

await iconGen(src, out, {
  report: true,
  ico: { name: "icon" },
  icns: { name: "icon" },
});
