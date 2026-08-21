# Changelog

All notable changes to this project are documented in this file.

## V1.2 Public MVP - 2026-08-20

### Added

- Supabase schema for records, observations, and record events
- EXPERIENCE maturity and lifecycle audit vocabularies
- Public candidate and observation RPCs
- Public observation non-promotion enforcement
- `PUBLISHED + PASS` public read visibility
- Multi-keyword weighted search with a maximum of 20 results
- Public `knowledge-api` Edge Function
- Public GPT Action OpenAPI schema
- Placeholder-only environment example and local secret exclusions
- Architecture, GPT behavior, deployment, and testing documentation
- Unit and database regression tests for the Public MVP scope
- Live-derived existing-environment baseline evidence and additive RPC migration track
- Coordinated existing-environment ledger, cutover, validation, and rollback instructions

### Security

- Kept the Supabase service-role credential server-side
- Exposed only the Public Knowledge API key to the Public GPT Action
- Removed direct anonymous and authenticated table access
- Removed direct runtime `service_role` table access
- Enforced append-only audit events and restrictive parent deletion
- Added public submission field ownership, bounds, and sensitive-evidence screening
- Added standalone token, JWT, internal-hostname, request-size, and database-domain error controls
- Preserved transition-period `service_role` table DML while isolating the future RPC cutover
- Documented the existing maturity-function `PUBLIC EXECUTE` exposure for separate review without changing it

### V1.3+ Backlog

- MPBSDP trusted ingestion
- Trusted maturity promotion
- Atomic publication and publication approval
- Trusted-ingestion and publication lifecycle regression coverage

## v0.1.0

- Initial public diagnostic framework, knowledge checklists, and synthetic examples
