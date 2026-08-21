-- LIVE-DERIVED NORMALIZED SCHEMA EVIDENCE
-- Captured read-only from project edhwawuyuybmnwiwsiwh on 2026-08-20.
-- DO NOT APPLY TO THE EXISTING LIVE DATABASE.
--
-- This is a normalized reconstruction from PostgreSQL catalog evidence, not a
-- byte-for-byte pg_dump. Compare it with a future pg_dump --schema-only before
-- declaring migration-ledger equivalence.

create extension if not exists pgcrypto with schema extensions;

create table public.records (
  id text not null,
  record_type text not null,
  component text not null,
  title text not null,
  content jsonb not null,
  status text not null,
  maturity text,
  applicability jsonb,
  provenance jsonb,
  privacy_status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint records_pkey primary key (id),
  constraint records_record_type_check check (record_type = any (array['KNOWLEDGE', 'EXPERIENCE'])),
  constraint records_status_check check (status = any (array['CANDIDATE', 'VALIDATED', 'SUPPORTED', 'PUBLISHED', 'SUPERSEDED', 'RETRACTED', 'CONFLICTED'])),
  constraint records_maturity_check check (maturity is null or maturity = any (array['OBSERVED', 'REPEATED', 'SUPPORTED', 'ESTABLISHED_PATTERN'])),
  constraint records_privacy_status_check check (privacy_status = any (array['UNASSESSED', 'SANITIZED', 'PASS', 'REJECTED']))
);

create table public.observations (
  id uuid not null default gen_random_uuid(),
  record_id text not null,
  case_fingerprint text not null,
  validated boolean not null default false,
  independent boolean not null default false,
  result text,
  source_type text not null,
  privacy_status text not null,
  created_at timestamptz not null default now(),
  constraint observations_pkey primary key (id),
  constraint observations_record_case_unique unique (record_id, case_fingerprint),
  constraint observations_record_id_fkey foreign key (record_id) references public.records(id),
  constraint observations_source_type_check check (source_type = any (array['PUBLIC_GPT', 'MPBSDP', 'SYNTHETIC'])),
  constraint observations_privacy_status_check check (privacy_status = any (array['UNASSESSED', 'SANITIZED', 'PASS', 'REJECTED']))
);

create table public.record_events (
  id uuid not null default gen_random_uuid(),
  record_id text not null,
  event_type text not null,
  actor_domain text not null,
  from_status text,
  to_status text,
  details jsonb,
  created_at timestamptz not null default now(),
  constraint record_events_pkey primary key (id),
  constraint record_events_record_fk foreign key (record_id) references public.records(id),
  constraint record_events_event_type_check check (event_type = any (array['CREATED', 'OBSERVATION_ADDED', 'MATURITY_CHANGED', 'PUBLISHED', 'SUPERSEDED', 'RETRACTED', 'CONFLICTED'])),
  constraint record_events_actor_domain_check check (actor_domain = any (array['PUBLIC_GPT', 'MPBSDP', 'PUBLISH_APPROVAL', 'SYSTEM']))
);

create or replace function public.refresh_experience_maturity(p_record_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_type text;
  v_old_maturity text;
  v_new_maturity text;
  v_validated_independent_count integer;
begin
  select record_type, maturity
  into v_record_type, v_old_maturity
  from public.records
  where id = p_record_id;

  if not found or v_record_type <> 'EXPERIENCE' then
    return;
  end if;

  select count(*)::integer
  into v_validated_independent_count
  from public.observations
  where record_id = p_record_id
    and validated = true
    and independent = true
    and privacy_status = 'PASS';

  v_new_maturity := case when v_validated_independent_count >= 2 then 'REPEATED' else 'OBSERVED' end;

  if v_old_maturity is distinct from v_new_maturity then
    update public.records
    set maturity = v_new_maturity, updated_at = now()
    where id = p_record_id;

    insert into public.record_events (
      record_id, event_type, actor_domain, from_status, to_status, details
    ) values (
      p_record_id, 'MATURITY_CHANGED', 'SYSTEM', null, null,
      jsonb_build_object(
        'from_maturity', v_old_maturity,
        'to_maturity', v_new_maturity,
        'validated_independent_count', v_validated_independent_count
      )
    );
  end if;
end;
$$;

create or replace function public.handle_observation_maturity_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_experience_maturity(old.record_id);
    return old;
  elsif tg_op = 'UPDATE' then
    if old.record_id is distinct from new.record_id then
      perform public.refresh_experience_maturity(old.record_id);
    end if;
    perform public.refresh_experience_maturity(new.record_id);
    return new;
  else
    perform public.refresh_experience_maturity(new.record_id);
    return new;
  end if;
end;
$$;

create trigger observations_refresh_maturity
after insert or delete or update on public.observations
for each row execute function public.handle_observation_maturity_refresh();

create or replace function public.publish_record_atomic(p_record_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.records%rowtype;
begin
  select * into v_record
  from public.records
  where id = p_record_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'record not found';
  end if;

  if v_record.status = 'PUBLISHED' then
    return jsonb_build_object('record_id', v_record.id, 'status', v_record.status, 'published', false, 'already_published', true);
  end if;
  if v_record.status <> 'CANDIDATE' then
    raise exception using errcode = '22023', message = 'record status must be CANDIDATE';
  end if;
  if v_record.privacy_status <> 'PASS' then
    raise exception using errcode = '22023', message = 'privacy_status must be PASS';
  end if;
  if coalesce(v_record.provenance ->> 'source_type', '') <> 'MPBSDP' then
    raise exception using errcode = '22023', message = 'provenance source_type must be MPBSDP';
  end if;
  if coalesce((v_record.provenance ->> 'raw_evidence_included')::boolean, true) <> false then
    raise exception using errcode = '22023', message = 'raw evidence must not be included';
  end if;
  if coalesce((v_record.provenance ->> 'sanitized')::boolean, false) <> true then
    raise exception using errcode = '22023', message = 'record must be sanitized';
  end if;
  if coalesce((v_record.provenance ->> 'generalized')::boolean, false) <> true then
    raise exception using errcode = '22023', message = 'record must be generalized';
  end if;
  if v_record.record_type = 'EXPERIENCE'
     and v_record.maturity not in ('REPEATED', 'SUPPORTED', 'ESTABLISHED_PATTERN') then
    raise exception using errcode = '22023', message = 'EXPERIENCE maturity is not publishable';
  end if;

  update public.records
  set status = 'PUBLISHED', updated_at = now()
  where id = v_record.id
  returning * into v_record;

  insert into public.record_events (
    record_id, event_type, actor_domain, from_status, to_status, details
  ) values (
    v_record.id,
    'PUBLISHED',
    'PUBLISH_APPROVAL',
    'CANDIDATE',
    'PUBLISHED',
    jsonb_build_object('record_type', v_record.record_type, 'maturity', v_record.maturity)
  );

  return jsonb_build_object('record_id', v_record.id, 'status', v_record.status, 'published', true, 'already_published', false);
end;
$$;

alter table public.records enable row level security;
alter table public.observations enable row level security;
alter table public.record_events enable row level security;

-- No public RLS policies and no public sequences existed at capture time.
-- Existing table ACLs are evidence and must not be applied from this file:
-- records service_role: SELECT, INSERT, UPDATE, REFERENCES, TRIGGER, TRUNCATE
-- observations/record_events service_role: SELECT, INSERT, REFERENCES, TRIGGER, TRUNCATE
-- anon/authenticated on all tables: REFERENCES, TRIGGER, TRUNCATE
-- refresh/trigger functions: default PUBLIC EXECUTE (separate hardening review)
-- publish_record_atomic(text): EXECUTE only for postgres and service_role

revoke all on table public.records from public, anon, authenticated, service_role;
revoke all on table public.observations from public, anon, authenticated, service_role;
revoke all on table public.record_events from public, anon, authenticated, service_role;

grant truncate, references, trigger, maintain on table public.records to anon, authenticated;
grant truncate, references, trigger, maintain on table public.observations to anon, authenticated;
grant truncate, references, trigger, maintain on table public.record_events to anon, authenticated;
grant select, insert, update, truncate, references, trigger, maintain on table public.records to service_role;
grant select, insert, truncate, references, trigger, maintain on table public.observations to service_role;
grant select, insert, truncate, references, trigger, maintain on table public.record_events to service_role;

grant execute on function public.refresh_experience_maturity(text) to public;
grant execute on function public.handle_observation_maturity_refresh() to public;
revoke all on function public.publish_record_atomic(text) from public, anon, authenticated;
grant execute on function public.publish_record_atomic(text) to service_role;
