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
