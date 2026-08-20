# V1.2 Public MVP Testing

## Local Unit Tests

The dependency-free tests cover public routing, bounded search input, caller field restrictions, privacy screening, UUID validation, normalized public RPC arguments, authentication, and HTTP response mapping.

The test command requires Node.js 24 or later because it imports the TypeScript module directly. This verification run used Node.js `v24.16.0`.

```text
node --test tests/knowledge-api.test.mjs tests/knowledge-api-handler.test.mjs
```

## Database Regression Tests

With Supabase CLI and its local containers available:

```text
supabase start
supabase db reset
supabase test db
```

The SQL suite contains 41 pgTAP assertions and validates:

- `records`, `observations`, and `record_events`
- Public candidate defaults
- Public candidate safety flags
- KNOWLEDGE candidate null maturity
- `CREATED` audit event
- Public V1.2 audit release identity
- Public observation trust defaults
- Public observation safety flags
- Public observation does not promote maturity
- `OBSERVATION_ADDED` audit event
- No public `MATURITY_CHANGED` event
- No direct `service_role` table access
- `service_role` execution permission for all four public RPCs
- `anon` and `authenticated` public RPC denial
- Audit event update and delete rejection
- Multi-keyword matching and field-weight ranking
- Exact-title lookup
- Search limit capped at 20
- `PUBLISHED + PASS` visibility
- Candidate and non-PASS hiding

The current development workstation did not have Supabase CLI, Deno, or PostgreSQL installed during implementation. SQL and deployed Edge Function runtime tests therefore require a Supabase-capable environment; static files alone are not runtime proof.

## Live Integration Checklist

Use synthetic, public-safe data only.

1. Call `GET ?action=health` with the correct public key; expect HTTP 200.
2. Repeat without the key and with an incorrect key; expect HTTP 401.
3. Search an exact title; expect only `PUBLISHED + PASS` records.
4. Search `atomic regression testing`; confirm terms can match across fields and title-weighted results rank first.
5. Read a published PASS record by UUID; expect HTTP 200.
6. Read a candidate or non-PASS record by UUID; expect HTTP 404.
7. Create a sanitized candidate; verify `CANDIDATE`, `UNASSESSED`, and `PUBLIC_GPT` provenance.
8. Verify one `CREATED` event.
9. Add a sanitized public observation; verify `PUBLIC_GPT`, `validated = false`, `independent = false`, and `UNASSESSED`.
10. Verify one `OBSERVATION_ADDED` event.
11. Verify maturity remains `OBSERVED` and no `MATURITY_CHANGED` event is created.
12. Submit content containing a secret marker, internal IP, internal URL, or raw-log marker; expect HTTP 400.
13. Request more than 20 search results; verify no more than 20 are returned.
14. Add an observation to a non-candidate record; expect HTTP 400 rather than HTTP 500.
15. Send a declared body larger than 20,000 bytes; expect HTTP 413.
16. Send chunked and understated-`Content-Length` bodies above 20,000 bytes; verify provider controls reject them before the Edge Function buffers the full payload.
17. Verify configured gateway rate limits and write quotas with a bounded synthetic test.

## V1.3+ Deferred Tests

The following tests are intentionally deferred with their corresponding implementation:

- Trusted first observation keeps `OBSERVED`
- Trusted second qualifying independent observation promotes to `REPEATED`
- `MATURITY_CHANGED` audit event from trusted promotion
- Atomic publication
- `PUBLISHED` audit event
- Publication-gate failures
- MPBSDP authentication and ingestion actions
