# Repair accounting

Repairs commit to the owning Practice document's append-only `repairDays` array.
The array length is the spending revision. The router derives the bank from that
snapshot and appends only if the database array still has that length. A failed
comparison reloads the practice and recalculates eligibility and balance, up to
five attempts. Contention after that returns a retryable CONFLICT response.

MongoDB single-document updates provide this boundary on the standalone Mongo 7
configuration in docker-compose.yml. No transaction, replica set, Redis lock,
lease expiry, or separate debit/credit write is required. A crash cannot commit
a debit without its repair credit. A lost response can be retried: an existing
repair returns success before checking the bank or repair window.

Legacy RepairSpend documents remain immutable inputs to stats and replay checks.
Stats use the union of legacy and embedded repair days for lifetime spending,
exclude repaired days from earnings, and retain the existing rolling earnings
window and bank cap. Client DTOs do not expose the internal ledger. Future writers
must never remove, replace, or mutate this ledger outside the same atomic protocol.

## Deployment and rollback

Stop all old server writers before enabling the new server. Mixed versions are
not safe: the old router writes RepairSpend without checking the new ledger.
No data migration or new index is needed for this forward upgrade; absent arrays
are treated as empty and initialized by the first successful append.

Do not roll back to a version unaware of repairDays after new repairs exist.
Such a version omits those credits and debits. Rollback requires an offline,
reviewed ledger conversion with all repair writers stopped. No conversion or
production operation is included in this change.

## Validation boundary

Source inspection covers competing different-day requests, duplicate-day replay,
owner filtering, missing arrays, existing spends, failed writes, and lost responses.
For two requests with the same length, only the first append matches; the loser
recomputes from the enlarged ledger. Distinct practices have independent ledgers.
This fix serializes repair spending; it does not establish a transaction with
concurrent session edits, practice settings changes, or timezone/day rollover.

Only TypeScript syntax parsing and diff whitespace checks were executed for this
change. No database, concurrency test, test suite, build, or application was run.
Runtime behavior and deployment remain unverified.
