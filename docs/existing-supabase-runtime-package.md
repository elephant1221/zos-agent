# Existing Supabase Public V1.2 Runtime Package

## Purpose

This package upgrades the existing, non-empty Knowledge Service without applying the repository's fresh-install migrations. It preserves all existing records, observations, audit history, maturity behavior, private ingestion capabilities, publication behavior, RLS state, and transition-period table privileges.

Nothing in this document is authorization to execute SQL, repair migration history, deploy an Edge Function, change grants, or modify production data.

## Package Layout

- `supabase/existing-environment/baseline/20260820_live_public_schema.sql`: normalized, read-only schema evidence
- `supabase/existing-environment/migrations/202608210001_public_v1_2_live_compatibility.sql`: additive Public RPC migration
- `supabase/functions/knowledge-api/`: RPC-capable Public Edge Function source
- `openapi/zos-agent-public-gpt-actions-v1.2.yaml`: Public GPT-only Action contract
- `tests/live-existing-environment-package.test.mjs`: static compatibility tests

The baseline file is not a migration and must never be applied to the existing database. It was reconstructed from read-only PostgreSQL catalogs. A literal `pg_dump --schema-only` must be compared with it before declaring baseline equivalence.

## Migration Tracks

### Fresh installations

Fresh installations use only the default migration track:

1. `supabase/migrations/202608200001_knowledge_service_schema.sql`
2. `supabase/migrations/202608200002_public_knowledge_service.sql`

These migrations describe the clean-install schema. They are not equivalent to the existing live text/JSONB schema.

### Existing live environment

The existing environment uses only:

1. `supabase/existing-environment/migrations/202608210001_public_v1_2_live_compatibility.sql`

Do not run `supabase db push` from the repository root against the existing environment. That would offer the two incompatible fresh-install migrations.

## Migration-Ledger Reconciliation

The existing project currently has no `supabase_migrations.schema_migrations` ledger. Do not mark the two fresh-install migrations as applied: their schemas are not equivalent to live.

For a future approved execution:

1. Capture a literal live schema-only dump.
2. Compare it with the normalized baseline and resolve every difference.
3. Create an empty temporary Supabase work directory outside the repository.
4. Copy only the existing-environment compatibility migration into that temporary work directory's `supabase/migrations` directory.
5. Link that isolated work directory to the exact existing project.
6. Run migration-list and dry-run inspection.
7. Apply the compatibility migration only after a separate production approval.
8. Confirm that the ledger contains `202608210001` and does not claim equivalence for `202608200001` or `202608200002`.

Future database pushes to the existing environment must use the isolated existing-environment track. Future fresh-install validation continues to use the repository-root track.

CI/CD must require an explicit migration-track selection and fail closed when it is absent. A production job for the existing project must never point at the repository-root fresh-install migration directory.

Migration repair is not part of this package. If ledger repair is proposed later, equivalence must first be demonstrated object-by-object and approved separately.

## Additive Migration Behavior

The compatibility migration creates or replaces exactly four Public RPCs:

- `create_public_candidate(text,text,text,jsonb,jsonb)`
- `add_public_observation(text,text,text)`
- `search_public_records(text,text,text,integer)`
- `get_public_record(text)`

It does not:

- create, drop, or alter tables
- modify existing rows
- alter RLS or policies
- revoke current `service_role` table DML
- replace maturity functions or triggers
- alter private ingestion or publication functions

The migration revokes execution of the four newly introduced Public RPCs from `PUBLIC`, `anon`, and `authenticated`, then grants execution to `service_role`. It does not change any pre-existing function ACL.

## Edge Function Cutover

Use a low-risk coordinated cutover:

1. Freeze the reviewed commit and record the currently deployed Edge Function version.
2. Complete schema-only comparison and database preflight.
3. Apply only the additive compatibility migration through the existing-environment track.
4. Exercise all four RPCs with transaction-scoped synthetic data from a trusted administrative test client.
5. Confirm existing direct-DML Edge Function behavior is unchanged.
6. Deploy the reviewed RPC-capable `knowledge-api` source without changing its URL or Public API key header.
7. Validate health, search, record, candidate creation, observation creation, audits, visibility, and maturity behavior.
8. Monitor HTTP errors, database errors, audit counts, and write volume.
9. Leave current `service_role` table DML in place throughout V1.2 transition validation.

The Public GPT Action continues using the same URL, operation IDs, and `X-ZOS-Knowledge-Key` header. It never receives the service-role credential.

## Runtime Validation

Use synthetic, generalized, public-safe fixtures only.

### Preflight

- Verify project reference, branch, and region.
- Verify exact table columns, constraints, indexes, triggers, RLS state, policies, owners, and ACLs.
- Verify the maturity and publication function hashes or normalized definitions against the schema-only dump.
- Verify current row counts without reading sensitive row content.
- Verify a recoverable copy of the currently deployed Edge Function source exists.
- Verify no real secret is present in commands, logs, screenshots, or test fixtures.

### RPC checks

1. Confirm only the four expected Public RPC signatures were added.
2. Confirm `service_role` can execute them.
3. Confirm `PUBLIC`, `anon`, and `authenticated` cannot execute them.
4. Confirm existing table and maturity-function ACLs are unchanged.
5. Confirm no existing trigger, constraint, policy, function, or index changed.

### Public Action acceptance

1. `GET ?action=health` returns HTTP 200 and V1.2 identity.
2. Exact search returns only `PUBLISHED + PASS` records.
3. `atomic regression testing` uses any-term matching and ranks stronger multi-term matches first.
4. Title matches rank above component, content, and applicability matches.
5. Exact-phrase matches receive the existing bonus.
6. Search returns no more than 20 records.
7. Record lookup returns HTTP 200 only for `PUBLISHED + PASS`; hidden records return 404.
8. Candidate creation returns HTTP 201 and atomically creates one `CANDIDATE/UNASSESSED` record and one `CREATED` event.
9. EXPERIENCE candidate maturity is `OBSERVED`; KNOWLEDGE maturity is null.
10. Candidate provenance is server-owned `PUBLIC_GPT`, `CREATE_CANDIDATE_API`, and `raw_evidence_included=false`.
11. Observation creation returns HTTP 201 and atomically creates one observation and one `OBSERVATION_ADDED` event.
12. Observation values are server-owned `PUBLIC_GPT`, `validated=false`, `independent=false`, and `UNASSESSED`.
13. Duplicate record/fingerprint submission returns HTTP 409.
14. Public observations do not count toward maturity promotion.
15. Existing private and publication behavior remains callable only through its pre-existing trusted boundary and remains absent from Public OpenAPI.

## Rollback and Fallback

### Baseline artifact

The baseline is not executable and needs no database rollback. If comparison reveals a mismatch, correct the artifact; do not change live to match it.

### Compatibility migration before Edge deployment

If RPC validation fails, stop the cutover. Leave the four functions dormant while the existing direct-DML Edge Function continues operating. This is the preferred fallback because it avoids destructive database rollback.

If removal is separately approved after confirming no callers, remove only the four exact new signatures. Do not drop tables, triggers, maturity functions, publication functions, or data.

### Edge Function after deployment

If Public Action validation fails:

1. Redeploy the recorded prior Edge Function source.
2. Confirm the prior health and Public Action behavior.
3. Leave existing table DML unchanged.
4. Preserve candidate, observation, and audit rows already committed by successful RPC calls.
5. Investigate using synthetic evidence before another cutover.

Do not attempt rollback by deleting production records or audit history.

## Deferred Security Finding

`handle_observation_maturity_refresh()` and `refresh_experience_maturity(text)` currently inherit `PUBLIC EXECUTE`. The latter can recompute maturity and insert audit state under `SECURITY DEFINER`.

This package documents but does not change that ACL. Dependency review, separate approval, and runtime validation are required before any revocation.
