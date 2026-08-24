# Seed data

Drop fixture content here that should populate empty local infra
on first boot. Hatchkit ships one workflow today (`assets`) and the
others are placeholders so the convention stays in one place as the
project grows.

## `seed/assets/`

Static files that should appear in the local S3 bucket. Anything
under this directory (recursively) is uploaded by:

```bash
pnpm seed:assets    # alias for `hatchkit assets seed`
```

The relative path inside `seed/assets/` becomes the S3 key. So:

```
seed/assets/avatars/default.png   →   s3://<bucket>/avatars/default.png
seed/assets/og/og-image.jpg       →   s3://<bucket>/og/og-image.jpg
```

Re-runs are idempotent (skip on ETag/size match) so you can call
`pnpm seed:assets` after every `pnpm dev:infra` without duplicating.

### Why this is here, not in the app

Putting fixtures in version control keeps "spin up a fresh dev
machine" to one command (`pnpm dev:infra && pnpm seed:assets`) and
keeps the app code free of seed-only branches. PII and large blobs
do **not** belong here — use `hatchkit assets pull` to mirror real
prod data into local S3 when you need it (and remember it's a
copy of production, treat it accordingly).

## Future siblings

`seed/db/` and `seed/redis/` would follow the same shape — a
fixtures directory plus a `pnpm seed:<name>` script that idempotently
loads it into the local container. Not implemented today.
