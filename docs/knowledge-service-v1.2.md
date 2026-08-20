# Public Knowledge Service V1.2

## Status and Scope

V1.2 is the Public GPT / Public Knowledge Service MVP for z/OS Agent Elephant.

Implemented in V1.2:

- Public health, search, and record-read actions
- Public candidate and observation submission
- `records`, `observations`, and `record_events`
- EXPERIENCE maturity vocabulary
- Public observation non-promotion controls
- `PUBLISHED + PASS` public visibility
- Multi-keyword ranked search
- Public GPT OpenAPI contract

Explicitly deferred to V1.3+:

- MPBSDP trusted ingestion
- Trusted observation validation and independence processing
- Automatic `OBSERVED -> REPEATED` promotion
- Publication approval and `publish_record_atomic`
- `publish_record` API routing

The deferred capabilities are not required for Public V1.2 acceptance.

## Architecture

The public integration has three layers:

1. Public GPT calls one Supabase Edge Function using `X-ZOS-Knowledge-Key`.
2. `knowledge-api` validates the action, payload, bounds, and common sensitive-evidence patterns.
3. Database RPCs enforce status, privacy, provenance, trust attributes, visibility, and audit events.

Public GPT never connects directly to the database and never receives the Supabase service-role credential.

## Data Model

### `records`

Stores sanitized and generalized reusable findings. Core controls include:

- `record_type`: `KNOWLEDGE` or `EXPERIENCE`
- `status`: `CANDIDATE`, `PUBLISHED`, `SUPERSEDED`, `RETRACTED`, or `CONFLICTED`
- `privacy_status`: `UNASSESSED`, `PASS`, or `FAIL`
- `maturity`: EXPERIENCE maturity, or null for KNOWLEDGE
- `provenance`: structured source metadata
- `raw_evidence_included`, `sanitized`, and `generalized`

### `observations`

Stores sanitized and generalized evidence associated with a record. Public observations are always created with:

- `source_type = PUBLIC_GPT`
- `validated = false`
- `independent = false`
- `privacy_status = UNASSESSED`
- `raw_evidence_included = false`
- `sanitized = true`
- `generalized = true`

### `record_events`

Provides an append-only lifecycle audit vocabulary. Database triggers reject event updates and deletes, and restrictive foreign keys prevent parent deletion from removing audit evidence:

- `CREATED`
- `OBSERVATION_ADDED`
- `MATURITY_CHANGED`
- `PUBLISHED`
- `SUPERSEDED`
- `RETRACTED`
- `CONFLICTED`

V1.2 creates and tests `CREATED` and `OBSERVATION_ADDED`. The remaining event values are dormant schema-compatibility values reserved for V1.3+ lifecycle operations.

## EXPERIENCE Maturity

The complete maturity vocabulary is:

1. `OBSERVED`
2. `REPEATED`
3. `SUPPORTED`
4. `ESTABLISHED_PATTERN`

A public EXPERIENCE candidate starts at `OBSERVED`. No Public V1.2 RPC can change maturity. In particular, adding any number of public observations does not promote the record.

Trusted promotion belongs to V1.3+. Public observations must never promote maturity.

## Public Actions

The Edge Function uses query-parameter routing:

| Method | Action | Purpose |
| --- | --- | --- |
| GET | `health` | Return service identity and version status |
| GET | `search` | Search public records |
| GET | `record` | Read one public record by UUID |
| POST | `create_candidate` | Submit an untrusted public candidate |
| POST | `add_observation` | Add an untrusted public observation to a candidate |

The following V1.3+ actions are not implemented or routed in V1.2:

- `mpbsdp_create_candidate`
- `mpbsdp_add_observation`
- `publish_record`

## Public Visibility

Both search and record read require:

```text
status = PUBLISHED
AND privacy_status = PASS
```

Candidates, failed privacy reviews, and unassessed records are hidden. V1.2 has no publication API. Read actions serve only pre-existing curator-approved `PUBLISHED + PASS` records loaded outside the Public GPT path. Public GPT cannot publish records.

## Search

Search behavior is deliberately small and deterministic:

- Split `q` on whitespace.
- Normalize repeated whitespace.
- Require every distinct term to match at least one searchable field.
- Search `title`, `component`, `content`, and `applicability`.
- Rank each matched term using `title = 8`, `component = 4`, `content = 2`, and `applicability = 1`.
- Cap results at 20, regardless of the requested limit.

For example, `atomic regression testing` can match with different terms located in different fields, but all three terms must be present somewhere in the record.

## Application-Level Experience Accumulation

z/OS Agent accumulates experience at the application level through database records, observations, maturity, and audit events. Public GPT may submit sanitized and generalized candidates and observations, but these submissions remain untrusted.

This is not model-weight training, fine-tuning, or automatic incorporation into a foundation model.

## V1.2 Credential Boundary

V1.2 runtime configuration uses:

- `SUPABASE_URL`: server-side project endpoint
- `SUPABASE_SERVICE_ROLE_KEY`: server-side database credential
- `ZOS_KNOWLEDGE_API_KEY`: Public GPT actions

`SUPABASE_SERVICE_ROLE_KEY` is a server-side Supabase credential, not a Public GPT credential. It is used only inside the deployed Edge Function.

Public GPT receives only the `ZOS_KNOWLEDGE_API_KEY` value through `X-ZOS-Knowledge-Key` and must never receive `SUPABASE_SERVICE_ROLE_KEY`. Future trusted-ingestion and publication-approval credentials are V1.3+ concerns and are not configured by V1.2.

## Privacy Boundary

The service stores only reusable technical findings. It has no raw log or dump field. Public submission flags must explicitly state that content is sanitized, generalized, and contains no raw evidence. The Edge Function rejects common secret, internal URL, internal IP, private-key, and raw-log markers.

Automated screening is a defense in depth measure, not proof of sanitization. All public candidates remain `UNASSESSED` until a separate privacy review marks them safe.

Common standalone token and JWT formats, internal URLs, internal hostname suffixes, non-documentation IPv4 addresses, private-key markers, and raw-log markers are rejected. Pattern matching cannot reliably identify every customer name or proprietary fact, so human privacy review remains mandatory.
