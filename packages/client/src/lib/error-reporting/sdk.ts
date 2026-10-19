/**
 * The part of @sentry/browser the reporter uses, re-exported by name.
 *
 * Generated and OWNED by hatchkit: `hatchkit update` rewrites this file,
 * so an edit here is lost on the next run. Change the generator, or move
 * the code you need into a file of your own.
 *
 * `reporter.ts` loads this file with a dynamic
 * import, never the package itself: a dynamic import of the package takes
 * the whole namespace — replay, feedback, tracing and every integration
 * the reporter never starts — because a namespace cannot be tree-shaken.
 * A module that re-exports the names it needs can be, so the lazily
 * loaded chunk holds only these.
 */
export {
  breadcrumbsIntegration,
  browserApiErrorsIntegration,
  captureException,
  dedupeIntegration,
  eventFiltersIntegration,
  functionToStringIntegration,
  globalHandlersIntegration,
  httpContextIntegration,
  init,
  linkedErrorsIntegration,
} from "@sentry/browser";
