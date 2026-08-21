-- Existing-environment Public Knowledge Service V1.2 compatibility migration.
--
-- ADDITIVE ONLY. This migration creates or replaces four Public RPC functions.
-- It does not alter tables, data, RLS, existing triggers, or table privileges.
-- Apply only after validating the target against the live-derived baseline.

create or replace function public.create_public_candidate(
  p_record_type text,
  p_component text,
  p_title text,
  p_content jsonb,
  p_applicability jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_record_type text;
  v_component text;
  v_title text;
  v_record_id text;
  v_record public.records%rowtype;
  v_event public.record_events%rowtype;
begin
  v_record_type := upper(btrim(coalesce(p_record_type, '')));
  if v_record_type not in ('KNOWLEDGE', 'EXPERIENCE') then
    raise exception using errcode = '22023', message = 'record_type must be KNOWLEDGE or EXPERIENCE';
  end if;

  v_component := btrim(coalesce(p_component, ''));
  v_title := btrim(coalesce(p_title, ''));
  if v_component = '' or char_length(v_component) > 100 then
    raise exception using errcode = '22023', message = 'component is required and must not exceed 100 characters';
  end if;
  if char_length(v_title) < 3 or char_length(v_title) > 200 then
    raise exception using errcode = '22023', message = 'title length must be between 3 and 200 characters';
  end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception using errcode = '22023', message = 'content must be a JSON object';
  end if;
  if p_applicability is not null and jsonb_typeof(p_applicability) <> 'object' then
    raise exception using errcode = '22023', message = 'applicability must be a JSON object or null';
  end if;

  v_record_id := format(
    'PUB-%s-%s-%s',
    case when v_record_type = 'EXPERIENCE' then 'E' else 'K' end,
    coalesce(
      nullif(trim(both '-' from regexp_replace(upper(v_component), '[^A-Z0-9]+', '-', 'g')), ''),
      'GENERAL'
    ),
    gen_random_uuid()::text
  );

  insert into public.records (
    id, record_type, component, title, content, status, maturity,
    applicability, provenance, privacy_status
  ) values (
    v_record_id,
    v_record_type,
    v_component,
    v_title,
    p_content,
    'CANDIDATE',
    case when v_record_type = 'EXPERIENCE' then 'OBSERVED' else null end,
    p_applicability,
    jsonb_build_object(
      'source_type', 'PUBLIC_GPT',
      'ingestion_method', 'CREATE_CANDIDATE_API',
      'raw_evidence_included', false
    ),
    'UNASSESSED'
  )
  returning * into v_record;

  insert into public.record_events (
    record_id, event_type, actor_domain, from_status, to_status, details
  ) values (
    v_record.id,
    'CREATED',
    'PUBLIC_GPT',
    null,
    v_record.status,
    jsonb_build_object(
      'record_type', v_record.record_type,
      'component', v_record.component,
      'maturity', v_record.maturity,
      'privacy_status', v_record.privacy_status,
      'release', 'V1.2_PUBLIC_MVP'
    )
  )
  returning * into v_event;

  return jsonb_build_object(
    'record_id', v_record.id,
    'record', to_jsonb(v_record),
    'audit_event', to_jsonb(v_event)
  );
end;
$$;

create or replace function public.add_public_observation(
  p_record_id text,
  p_case_fingerprint text,
  p_result text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_record public.records%rowtype;
  v_observation public.observations%rowtype;
  v_event public.record_events%rowtype;
begin
  if btrim(coalesce(p_record_id, '')) = '' then
    raise exception using errcode = '22023', message = 'record_id is required';
  end if;
  if btrim(coalesce(p_case_fingerprint, '')) = '' then
    raise exception using errcode = '22023', message = 'case_fingerprint is required';
  end if;

  select * into v_record
  from public.records
  where id = btrim(p_record_id)
  for share;

  if not found then
    raise exception using errcode = 'P0002', message = 'record not found';
  end if;

  insert into public.observations (
    record_id, case_fingerprint, validated, independent, result,
    source_type, privacy_status
  ) values (
    v_record.id,
    btrim(p_case_fingerprint),
    false,
    false,
    p_result,
    'PUBLIC_GPT',
    'UNASSESSED'
  )
  returning * into v_observation;

  select * into v_record
  from public.records
  where id = v_record.id;

  insert into public.record_events (
    record_id, event_type, actor_domain, from_status, to_status, details
  ) values (
    v_record.id,
    'OBSERVATION_ADDED',
    'PUBLIC_GPT',
    v_record.status,
    v_record.status,
    jsonb_build_object(
      'observation_id', v_observation.id,
      'case_fingerprint', v_observation.case_fingerprint,
      'source_type', v_observation.source_type,
      'validated', false,
      'independent', false,
      'privacy_status', 'UNASSESSED'
    )
  )
  returning * into v_event;

  return jsonb_build_object(
    'observation', to_jsonb(v_observation),
    'record', to_jsonb(v_record),
    'maturity', v_record.maturity,
    'audit_event', to_jsonb(v_event)
  );
end;
$$;

create or replace function public.search_public_records(
  p_query text default '',
  p_component text default null,
  p_record_type text default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := btrim(coalesce(p_query, ''));
  v_normalized_query text;
  v_component text := nullif(btrim(coalesce(p_component, '')), '');
  v_record_type text := nullif(upper(btrim(coalesce(p_record_type, ''))), '');
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 20);
  v_terms text[];
  v_records jsonb;
begin
  if char_length(v_query) > 200 then
    raise exception using errcode = '22023', message = 'query must not exceed 200 characters';
  end if;
  if v_record_type is not null and v_record_type not in ('KNOWLEDGE', 'EXPERIENCE') then
    raise exception using errcode = '22023', message = 'record_type must be KNOWLEDGE or EXPERIENCE';
  end if;

  v_normalized_query := btrim(regexp_replace(lower(v_query), '[^a-z0-9/_.+#-]+', ' ', 'g'));
  select coalesce(array_agg(distinct term order by term), array[]::text[])
  into v_terms
  from unnest(regexp_split_to_array(v_normalized_query, E'\\s+')) term
  where char_length(term) >= 2;

  with candidate_records as (
    select r.*
    from public.records r
    where r.status = 'PUBLISHED'
      and r.privacy_status = 'PASS'
      and (v_component is null or r.component ilike v_component)
      and (v_record_type is null or r.record_type = v_record_type)
    order by r.updated_at desc
    limit 200
  ), scored as (
    select
      c.*,
      coalesce(s.matched_terms, 0) as matched_terms,
      coalesce(s.weighted_score, 0)
        + case when lower(concat_ws(' ', c.title, c.component, c.content::text, coalesce(c.applicability, '{}'::jsonb)::text))
                    like '%' || v_normalized_query || '%'
                 and v_normalized_query <> ''
            then 10 else 0 end as score,
      case when lower(concat_ws(' ', c.title, c.component, c.content::text, coalesce(c.applicability, '{}'::jsonb)::text))
                  like '%' || v_normalized_query || '%'
               and v_normalized_query <> ''
           then 10 else 0 end as exact_phrase_bonus
    from candidate_records c
    left join lateral (
      select
        count(*) filter (
          where lower(c.title) like '%' || t.term || '%'
             or lower(c.component) like '%' || t.term || '%'
             or lower(c.content::text) like '%' || t.term || '%'
             or lower(coalesce(c.applicability, '{}'::jsonb)::text) like '%' || t.term || '%'
        )::integer as matched_terms,
        coalesce(sum(
          (case when lower(c.title) like '%' || t.term || '%' then 1 else 0 end) * 5
          + (case when lower(c.component) like '%' || t.term || '%' then 1 else 0 end) * 3
          + (case when lower(c.content::text) like '%' || t.term || '%' then 1 else 0 end) * 2
          + (case when lower(coalesce(c.applicability, '{}'::jsonb)::text) like '%' || t.term || '%' then 1 else 0 end) * 1
        ), 0)::integer as weighted_score
      from unnest(v_terms) t(term)
    ) s on true
  ), visible as (
    select to_jsonb(s) - 'matched_terms' - 'score' - 'exact_phrase_bonus' as record,
           s.matched_terms, s.score, s.updated_at
    from scored s
    where cardinality(v_terms) = 0 or s.matched_terms > 0
    order by s.matched_terms desc, s.score desc, s.updated_at desc, s.id
    limit v_limit
  )
  select coalesce(jsonb_agg(record order by matched_terms desc, score desc, updated_at desc), '[]'::jsonb)
  into v_records
  from visible;

  return jsonb_build_object(
    'query', jsonb_build_object(
      'q', v_query,
      'terms', to_jsonb(v_terms),
      'component', v_component,
      'record_type', v_record_type,
      'limit', v_limit
    ),
    'visibility', jsonb_build_object('status', 'PUBLISHED', 'privacy_status', 'PASS'),
    'count', jsonb_array_length(v_records),
    'records', v_records
  );
end;
$$;

create or replace function public.get_public_record(p_record_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(r)
  from public.records r
  where r.id = btrim(p_record_id)
    and r.status = 'PUBLISHED'
    and r.privacy_status = 'PASS';
$$;

revoke execute on function public.create_public_candidate(text, text, text, jsonb, jsonb)
  from public, anon, authenticated;
revoke execute on function public.add_public_observation(text, text, text)
  from public, anon, authenticated;
revoke execute on function public.search_public_records(text, text, text, integer)
  from public, anon, authenticated;
revoke execute on function public.get_public_record(text)
  from public, anon, authenticated;

grant execute on function public.create_public_candidate(text, text, text, jsonb, jsonb)
  to service_role;
grant execute on function public.add_public_observation(text, text, text)
  to service_role;
grant execute on function public.search_public_records(text, text, text, integer)
  to service_role;
grant execute on function public.get_public_record(text)
  to service_role;
