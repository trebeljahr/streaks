# Security baseline migration

These changes require an explicit rollout to affect running containers or deployed services.

## Development infrastructure

MongoDB, Redis and local S3 publications now bind `127.0.0.1`. Existing
volumes and port overrides remain unchanged. Schedule a development-container
recreation to apply this. Keep the existing volumes.
After recreation, inspect Docker's published bindings and host listeners.
Remote development clients need an authenticated tunnel instead of a public port.

## Build contexts

Docker ignore rules now exclude nested dotenv files, private keys, and local
build inputs. This prevents future build-context inclusion; it does not erase
old builder caches or prove previous images contained secrets. Inspect existing
images and caches separately. Rotate only credentials confirmed exposed, through
their established owner-approved procedure. Keep private key files owner-readable only.

## Auth links and account migration

Auth links are bearer credentials. Production no longer logs them automatically.
`AUTH_LOG_LINKS=true` explicitly permits owner recovery through private server
logs, including mail failure paths. Keep it off on hosted/multi-user services;
remove it after recovery, and control log access and retention. Development and
test environments keep their local fallback. With no permitted fallback, auth
mail fails without logging a recipient or token.

Production now requires verified email by default. Configure and test mail
before rollout. Existing unverified accounts must follow verification on their
next password sign-in; do not blanket-mark addresses verified. Existing sessions
are not revoked. Sign-up and sign-in send verification mail; verification does
not create a session automatically. Mail-free deployments must explicitly set
`AUTH_REQUIRE_EMAIL_VERIFICATION=false`; this does not prove address ownership.
Keep that opt-out only where unverified addresses are an accepted policy.
The signup page directs users to their mailbox when signup creates no session.

## Dependencies and validation

Dependency manifests and lockfiles must be deployed together. Rebuild images
and clients from the tested commit before rollout. A clean audit does not prove
all dependency code safe, and static exports do not expose a Next.js optimizer.
Run `node --test scripts/security-baseline.test.mjs` from the app root on Node 24.
For Hatchkit, the app root is `starter/`; generated PostgreSQL and account-security
variants also require the CLI's isolated regression runner.

Rollback is a local revert of the security commit followed by an explicitly
approved deployment. Reverting restores the old exposure and logging behavior;
prefer fixing configuration or using the documented opt-ins.

## Runtime dependency update

Use the manifests and lockfile from the same commit. The update advances Next,
WebSocket, database, HTTP logging and mail dependencies to patched releases.
Better Auth stays on its 1.6 patch line through a tilde range.

The workspace overrides patch transitive versions still pinned by upstream
packages. Most stay within the same major. `serialize-javascript` moves from 6
to 7 while retaining CommonJS, and SockJS uses UUID 11's CommonJS `v4` export.
Sharp moves from 0.34 to 0.35, and esbuild from 0.27 to 0.28. These require
compatibility checks when removing the overrides or changing their parents.
Use the Node 24 runtime configured by the container images. Install with the
frozen lockfile; run the production audit and application tests before rollout.
The docs and test dependencies appearing in a production audit are not proof
that their development servers are exposed by the deployed app.

MongoDB 7 is pinned to one driver version across Mongoose, Better Auth, and
direct imports. Removing that override requires checking that their `Db` and
`MongoClient` types still agree.
