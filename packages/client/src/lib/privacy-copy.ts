/*
 * The error-report section of /privacy.
 *
 * `when`, `contains`, `omits` and `ip` are hatchkit's generated copy,
 * which it writes from the same allowlist as the scrubber in
 * lib/error-reporting/scrub.ts. `hatchkit update` regenerates
 * .hatchkit/privacy-error-reports.md, and privacy-copy.test.ts fails
 * when this file no longer matches it.
 *
 * `operator` is written here, not generated: hatchkit's self-hosted
 * wording says no other company receives a report, but the tracker runs
 * on a Hetzner server behind Cloudflare.
 */

export const APP_NAME = "Streaks";

export const errorReportCopy = {
  when: `When ${APP_NAME} hits an error it did not expect, it sends a report to an error tracker. With no error, nothing is sent.`,
  contains: [
    "the error message and where in the code it happened",
    "the address of the page, without anything after the question mark",
    "the addresses, methods and status codes of the last requests the app made",
    "the names of the browser and the operating system",
    "the version of the app that reported the error",
    "the platform the build is for",
  ],
  omits: [
    "your name or your email address",
    "your session token or your cookies",
    "anything you typed, and the fields you typed it into",
    "what the app wrote to the browser console",
    "the contents of any request the app made",
    "anything after the question mark in an address",
    "a recording or a picture of the screen",
  ],
  operator: [
    `Reports go to GlitchTip, an error tracker that the ${APP_NAME} team runs itself.`,
    "It runs on a server that Hetzner hosts.",
    `Cloudflare carries each report to that server, as it carries every request to ${APP_NAME}.`,
  ].join(" "),
  ip: "Like every request to the service, a report arrives with your IP address. The report itself does not name it.",
} as const;
