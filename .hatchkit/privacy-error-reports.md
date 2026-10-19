<!--
  Generated and owned by hatchkit from the report allowlist in
  cli/src/features/error-reporting/allowlist.ts. `hatchkit update`
  rewrites this file, so edit the allowlist, not this copy. Paste the
  text below into your privacy page; this comment does not render.
-->

## Error reports

When streaks hits an error it did not expect, it sends a report to an error tracker. With no error, nothing is sent.

A report contains:

- the error message and where in the code it happened
- the address of the page, without anything after the question mark
- the addresses, methods and status codes of the last requests the app made
- the names of the browser and the operating system
- the version of the app that reported the error
- the platform the build is for

A report never contains:

- your name or your email address
- your session token or your cookies
- anything you typed, and the fields you typed it into
- what the app wrote to the browser console
- the contents of any request the app made
- anything after the question mark in an address
- a recording or a picture of the screen

[Decide before publishing: who runs the error tracker this build reports to. An endpoint on infrastructure you operate keeps the sentence "no other company receives data" true. An endpoint run by another company makes that company a processor, and this page has to name it.]

Like every request to the service, a report arrives with your IP address. The report itself does not name it.
