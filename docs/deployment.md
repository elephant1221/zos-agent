# Knowledge Service Deployment

## Prerequisites

- A Supabase project
- Supabase CLI authenticated to the intended project
- Permission to apply database migrations and deploy Edge Functions
- A generated public Knowledge Service API key

Do not use real customer evidence or real secrets in repository files, commands saved in shell history, issue text, or screenshots.

## 1. Configure the Project

Copy `.env.example` to a local ignored environment file only if needed for local testing. Replace placeholders locally. Never commit that file.

Public V1.2 uses:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ZOS_KNOWLEDGE_API_KEY`

## 2. Link and Apply Migrations

Review the target project before running state-changing commands.

```text
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The migrations enable RLS and remove direct table access from `anon`, `authenticated`, and `service_role`. The Edge Function's `service_role` identity receives execution permission only for the public RPCs.

## 3. Configure Gateway Resource Controls

Before public deployment, configure and verify provider-side controls for:

- Maximum request body of 20,000 bytes or less
- Per-action request rates
- Write quotas for candidates and observations
- Search request quotas
- Monitoring and alerting for repeated HTTP 401, 413, and write spikes

The Edge Function checks a declared `Content-Length` before buffering and verifies the actual decoded length afterward. Provider-side limits are still required for chunked or repeated requests. Exact gateway controls are deployment-specific and are not created by this repository.

## 4. Set the Public API Secret

Set the actual key through the Supabase secret manager, not a committed file:

```text
supabase secrets set ZOS_KNOWLEDGE_API_KEY=REPLACE_WITH_GENERATED_VALUE
```

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to hosted Edge Functions. Confirm this in the target project before deployment.

## 5. Deploy the Edge Function

The function uses its own `X-ZOS-Knowledge-Key` check, so Supabase JWT verification is disabled for this function:

```text
supabase functions deploy knowledge-api --no-verify-jwt
```

After deployment, run health and negative-authentication checks before adding the schema to Public GPT.

## 6. Configure the Public GPT Action

1. Open `openapi/zos-agent-public-gpt-actions-v1.2.yaml`.
2. Replace `YOUR_PROJECT_REF` through the OpenAPI server variable or in the GPT Action editor.
3. Import the schema.
4. Configure API-key authentication using header `X-ZOS-Knowledge-Key`.
5. Provide only `ZOS_KNOWLEDGE_API_KEY` to the Public GPT Action.

Never provide Public GPT with:

- `SUPABASE_SERVICE_ROLE_KEY`

## 7. Published Knowledge Prerequisite

V1.2 does not provide a publication API. Search and record actions return only pre-existing curator-approved records with `status = PUBLISHED` and `privacy_status = PASS`. Use transaction-scoped synthetic fixtures for acceptance testing. Do not use Public GPT or an undocumented production bypass to create published records.

## 8. Rollback

Before applying migrations, capture the target database state and follow the organization's database change procedure. These migrations create new types, tables, functions, indexes, triggers, and grants. No automatic destructive rollback migration is supplied because dropping these objects would delete accumulated records and audit evidence.

If deployment fails, leave the function unpublished or remove its route through the Supabase deployment controls. Do not drop data-bearing tables as an operational rollback.
