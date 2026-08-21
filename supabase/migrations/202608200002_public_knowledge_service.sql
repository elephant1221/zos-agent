create or replace function public.create_public_candidate(
  p_record_type text,
  p_title text,
  p_component text,
  p_content text,
  p_applicability text,
  p_sanitized boolean,
  p_generalized boolean,
  p_raw_evidence_included boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_record_id uuid;
  v_record_type public.knowledge_record_type;
begin
  if p_sanitized is distinct from true
    or p_generalized is distinct from true
    or p_raw_evidence_included is distinct from false then
    raise exception using
      errcode = '22023',
      message = 'public submissions must be sanitized and generalized and exclude raw evidence';
  end if;

  begin
    v_record_type := upper(btrim(p_record_type))::public.knowledge_record_type;
  exception when invalid_text_representation then
    raise exception using
      errcode = '22023',
      message = 'record_type must be KNOWLEDGE or EXPERIENCE';
  end;

  insert into public.records (
    record_type,
    title,
    component,
    content,
    applicability,
    status,
    privacy_status,
    maturity,
    provenance,
    raw_evidence_included,
    sanitized,
    generalized
  ) values (
    v_record_type,
    btrim(p_title),
    btrim(p_component),
    btrim(p_content),
    btrim(p_applicability),
    'CANDIDATE',
    'UNASSESSED',
    case when v_record_type = 'EXPERIENCE' then 'OBSERVED'::public.experience_maturity else null end,
    jsonb_build_object('source_type', 'PUBLIC_GPT'),
    false,
    true,
    true
  )
  returning id into v_record_id;

  insert into public.record_events (
    record_id,
    event_type,
    new_maturity,
    actor_source_type,
    details
  ) values (
    v_record_id,
    'CREATED',
    case when v_record_type = 'EXPERIENCE' then 'OBSERVED'::public.experience_maturity else null end,
    'PUBLIC_GPT',
    jsonb_build_object('release', 'V1.2_PUBLIC_MVP')
  );

  return v_record_id;
end;
$$;

create or replace function public.add_public_observation(
  p_record_id uuid,
  p_content text,
  p_sanitized boolean,
  p_generalized boolean,
  p_raw_evidence_included boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_observation_id uuid;
  v_status public.knowledge_record_status;
begin
  if p_sanitized is distinct from true
    or p_generalized is distinct from true
    or p_raw_evidence_included is distinct from false then
    raise exception using
      errcode = '22023',
      message = 'public submissions must be sanitized and generalized and exclude raw evidence';
  end if;

  select status
    into v_status
    from public.records
   where id = p_record_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'record not found';
  end if;

  if v_status <> 'CANDIDATE' then
    raise exception using errcode = '22023', message = 'public observations may only be added to CANDIDATE records';
  end if;

  insert into public.observations (
    record_id,
    content,
    source_type,
    validated,
    independent,
    privacy_status,
    raw_evidence_included,
    sanitized,
    generalized
  ) values (
    p_record_id,
    btrim(p_content),
    'PUBLIC_GPT',
    false,
    false,
    'UNASSESSED',
    false,
    true,
    true
  )
  returning id into v_observation_id;

  insert into public.record_events (
    record_id,
    observation_id,
    event_type,
    actor_source_type,
    details
  ) values (
    p_record_id,
    v_observation_id,
    'OBSERVATION_ADDED',
    'PUBLIC_GPT',
    jsonb_build_object(
      'validated', false,
      'independent', false,
      'privacy_status', 'UNASSESSED'
    )
  );

  update public.records
     set updated_at = now()
   where id = p_record_id;

  return v_observation_id;
end;
$$;

create or replace function public.search_public_records(
  p_query text,
  p_limit integer default 20
)
returns table (
  id uuid,
  record_type text,
  title text,
  component text,
  content text,
  applicability text,
  maturity text,
  score integer,
  published_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with terms as (
    select distinct lower(term) as term
      from regexp_split_to_table(btrim(coalesce(p_query, '')), E'\\s+') as term
     where term <> ''
  ),
  ranked as (
    select
      r.id,
      r.record_type::text as record_type,
      r.title,
      r.component,
      r.content,
      r.applicability,
      r.maturity::text as maturity,
      sum(
        case
          when strpos(lower(r.title), t.term) > 0 then 8
          when strpos(lower(r.component), t.term) > 0 then 4
          when strpos(lower(r.content), t.term) > 0 then 2
          when strpos(lower(r.applicability), t.term) > 0 then 1
          else 0
        end
      )::integer as score,
      r.published_at,
      r.updated_at
    from public.records as r
    cross join terms as t
    where r.status = 'PUBLISHED'
      and r.privacy_status = 'PASS'
      and (
        strpos(lower(r.title), t.term) > 0
        or strpos(lower(r.component), t.term) > 0
        or strpos(lower(r.content), t.term) > 0
        or strpos(lower(r.applicability), t.term) > 0
      )
    group by r.id
    having count(*) = (select count(*) from terms)
  )
  select
    ranked.id,
    ranked.record_type,
    ranked.title,
    ranked.component,
    ranked.content,
    ranked.applicability,
    ranked.maturity,
    ranked.score,
    ranked.published_at,
    ranked.updated_at
  from ranked
  where (select count(*) from terms) > 0
  order by ranked.score desc, ranked.updated_at desc, ranked.id
  limit least(greatest(coalesce(p_limit, 20), 1), 20);
$$;

create or replace function public.get_public_record(p_record_id uuid)
returns table (
  id uuid,
  record_type text,
  title text,
  component text,
  content text,
  applicability text,
  maturity text,
  provenance jsonb,
  published_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.record_type::text,
    r.title,
    r.component,
    r.content,
    r.applicability,
    r.maturity::text,
    r.provenance,
    r.published_at,
    r.updated_at
  from public.records as r
  where r.id = p_record_id
    and r.status = 'PUBLISHED'
    and r.privacy_status = 'PASS';
$$;

revoke execute on function public.create_public_candidate(text, text, text, text, text, boolean, boolean, boolean)
  from public, anon, authenticated;
revoke execute on function public.add_public_observation(uuid, text, boolean, boolean, boolean)
  from public, anon, authenticated;
revoke execute on function public.search_public_records(text, integer)
  from public, anon, authenticated;
revoke execute on function public.get_public_record(uuid)
  from public, anon, authenticated;

grant execute on function public.create_public_candidate(text, text, text, text, text, boolean, boolean, boolean)
  to service_role;
grant execute on function public.add_public_observation(uuid, text, boolean, boolean, boolean)
  to service_role;
grant execute on function public.search_public_records(text, integer)
  to service_role;
grant execute on function public.get_public_record(uuid)
  to service_role;
