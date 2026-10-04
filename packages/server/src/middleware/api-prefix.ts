import type { NextFunction, Request, Response } from "express";

/**
 * Coolify routes `https://<domain>/api` to this server with a Traefik
 * PathPrefix rule and, by default, a `stripprefix` middleware that turns
 * `/api/health` into `/health`. This Coolify build will not let the API
 * turn Strip Prefix off, so every route here lives under `/api` and a
 * stripped request gets its prefix back before routing. Requests that
 * already carry the prefix (Strip Prefix off, the in-container health
 * probe, local dev) pass through unchanged.
 */
export const API_PREFIX = "/api";

export function restoreApiPrefix(req: Request, _res: Response, next: NextFunction): void {
  const url = req.url;
  if (url !== API_PREFIX && !url.startsWith(`${API_PREFIX}/`) && !url.startsWith(`${API_PREFIX}?`)) {
    req.url = url === "/" ? `${API_PREFIX}/` : `${API_PREFIX}${url.startsWith("/") ? "" : "/"}${url}`;
    req.originalUrl = req.url;
  }
  next();
}
