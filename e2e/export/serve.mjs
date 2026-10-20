// Serves the static client export (packages/client/out) the way the
// Cloudflare Worker does: /path/ -> path/index.html, unknown paths ->
// 404.html with status 404. Used only by playwright.export.config.ts.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "packages/client/out");
const port = Number(process.argv[3] ?? process.env.E2E_EXPORT_PORT);

if (!existsSync(path.join(root, "index.html"))) {
  console.error(
    `[serve-export] ${root}/index.html is missing. Build the export first:\n` +
      "  NEXT_FILE_EXPORT=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:5006 pnpm build:client",
  );
  process.exit(1);
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

function resolveFile(urlPath) {
  const file = path.join(root, decodeURIComponent(urlPath));
  if (!file.startsWith(root)) return null;
  if (existsSync(file) && statSync(file).isFile()) return file;
  const index = path.join(file, "index.html");
  if (existsSync(index)) return index;
  return null;
}

createServer((req, res) => {
  const urlPath = new URL(req.url ?? "/", "http://localhost").pathname;
  const file = resolveFile(urlPath);
  const status = file ? 200 : 404;
  const body = file ?? path.join(root, "404.html");
  res.writeHead(status, {
    "content-type": types[path.extname(body)] ?? "application/octet-stream",
  });
  createReadStream(body)
    .on("error", () => res.end())
    .pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`[serve-export] ${root} on http://127.0.0.1:${port}`);
});
