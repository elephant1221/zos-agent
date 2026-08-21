begin;

select plan(41);

select has_table('public', 'records', 'records table exists');
select has_table('public', 'observations', 'observations table exists');
select has_table('public', 'record_events', 'record_events table exists');

select has_function(
  'public',
  'create_public_candidate',
  array['text', 'text', 'text', 'text', 'text', 'boolean', 'boolean', 'boolean'],
  'public candidate RPC exists'
);
select has_function(
  'public',
  'add_public_observation',
  array['uuid', 'text', 'boolean', 'boolean', 'boolean'],
  'public observation RPC exists'
);
select has_function(
  'public',
  'search_public_records',
  array['text', 'integer'],
  'public search RPC exists'
);
select has_function(
  'public',
  'get_public_record',
  array['uuid'],
  'public record RPC exists'
);

select ok(
  not has_table_privilege('service_role', 'public.records', 'SELECT'),
  'service_role has no direct records SELECT privilege'
);
select ok(
  not has_table_privilege('service_role', 'public.records', 'INSERT'),
  'service_role has no direct records INSERT privilege'
);
select ok(
  not has_table_privilege('service_role', 'public.observations', 'INSERT'),
  'service_role has no direct observations INSERT privilege'
);
select ok(
  not has_table_privilege('service_role', 'public.record_events', 'SELECT'),
  'service_role has no direct record_events SELECT privilege'
);
select ok(
  not has_table_privilege('service_role', 'public.record_events', 'UPDATE'),
  'service_role has no direct record_events UPDATE privilege'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.search_public_records(text,integer)',
    'EXECUTE'
  ),
  'service_role can execute the public search RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.get_public_record(uuid)',
    'EXECUTE'
  ),
  'service_role can execute the public record RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.create_public_candidate(text,text,text,text,text,boolean,boolean,boolean)',
    'EXECUTE'
  ),
  'service_role can execute the public candidate RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.add_public_observation(uuid,text,boolean,boolean,boolean)',
    'EXECUTE'
  ),
  'service_role can execute the public observation RPC'
);
select ok(
  not has_function_privilege('anon', 'public.search_public_records(text,integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.get_public_record(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.create_public_candidate(text,text,text,text,text,boolean,boolean,boolean)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.add_public_observation(uuid,text,boolean,boolean,boolean)', 'EXECUTE'),
  'anon cannot execute any public Knowledge Service RPC'
);
select ok(
  not has_function_privilege('authenticated', 'public.search_public_records(text,integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.get_public_record(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.create_public_candidate(text,text,text,text,text,boolean,boolean,boolean)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.add_public_observation(uuid,text,boolean,boolean,boolean)', 'EXECUTE'),
  'authenticated cannot execute any public Knowledge Service RPC'
);

create temporary table test_ids (
  name text primary key,
  id uuid not null
);

insert into test_ids (name, id)
select 'candidate', public.create_public_candidate(
  'EXPERIENCE',
  'Sanitized allocation pattern',
  'DFSMS',
  'A generalized allocation finding.',
  'Applies when allocation messages indicate insufficient space.',
  true,
  true,
  false
);

select is(
  (select status::text from public.records where id = (select id from test_ids where name = 'candidate')),
  'CANDIDATE',
  'public candidate status is forced to CANDIDATE'
);
select is(
  (select privacy_status::text from public.records where id = (select id from test_ids where name = 'candidate')),
  'UNASSESSED',
  'public candidate privacy is forced to UNASSESSED'
);
select is(
  (select provenance ->> 'source_type' from public.records where id = (select id from test_ids where name = 'candidate')),
  'PUBLIC_GPT',
  'public candidate provenance is forced to PUBLIC_GPT'
);
select is(
  (select maturity::text from public.records where id = (select id from test_ids where name = 'candidate')),
  'OBSERVED',
  'public EXPERIENCE candidate starts OBSERVED'
);
select results_eq(
  $$
    select raw_evidence_included, sanitized, generalized
    from public.records
    where id = (select id from test_ids where name = 'candidate')
  $$,
  $$ values (false, true, true) $$,
  'public candidate safety flags are server controlled'
);
select is(
  (select count(*)::integer from public.record_events where record_id = (select id from test_ids where name = 'candidate') and event_type = 'CREATED'),
  1,
  'candidate creation writes one CREATED event'
);
select is(
  (select details ->> 'release' from public.record_events where record_id = (select id from test_ids where name = 'candidate') and event_type = 'CREATED'),
  'V1.2_PUBLIC_MVP',
  'CREATED event identifies the Public V1.2 release'
);

insert into test_ids (name, id)
select 'knowledge', public.create_public_candidate(
  'KNOWLEDGE',
  'Sanitized knowledge finding',
  'JES2',
  'A generalized reusable knowledge finding.',
  'Applies to generalized JES2 checks.',
  true,
  true,
  false
);

select ok(
  (select maturity is null from public.records where id = (select id from test_ids where name = 'knowledge')),
  'public KNOWLEDGE candidate has null maturity'
);

insert into test_ids (name, id)
select 'observation', public.add_public_observation(
  (select id from test_ids where name = 'candidate'),
  'A second sanitized public report of the same generalized symptom.',
  true,
  true,
  false
);

select results_eq(
  $$
    select source_type::text, validated, independent, privacy_status::text
    from public.observations
    where id = (select id from test_ids where name = 'observation')
  $$,
  $$ values ('PUBLIC_GPT'::text, false, false, 'UNASSESSED'::text) $$,
  'public observation trust fields are server controlled'
);
select results_eq(
  $$
    select raw_evidence_included, sanitized, generalized
    from public.observations
    where id = (select id from test_ids where name = 'observation')
  $$,
  $$ values (false, true, true) $$,
  'public observation safety flags are server controlled'
);
select is(
  (select maturity::text from public.records where id = (select id from test_ids where name = 'candidate')),
  'OBSERVED',
  'public observation never promotes maturity'
);
select is(
  (select count(*)::integer from public.record_events where observation_id = (select id from test_ids where name = 'observation') and event_type = 'OBSERVATION_ADDED'),
  1,
  'public observation writes one OBSERVATION_ADDED event'
);
select is(
  (select count(*)::integer from public.record_events where record_id = (select id from test_ids where name = 'candidate') and event_type = 'MATURITY_CHANGED'),
  0,
  'public observation writes no MATURITY_CHANGED event'
);

select throws_ok(
  $$
    update public.record_events
       set details = '{"changed":true}'::jsonb
     where record_id = (select id from test_ids where name = 'candidate')
  $$,
  '42501',
  'record_events is append-only',
  'record_events cannot be updated'
);
select throws_ok(
  $$
    delete from public.record_events
     where record_id = (select id from test_ids where name = 'candidate')
  $$,
  '42501',
  'record_events is append-only',
  'record_events cannot be deleted'
);

select throws_ok(
  $$ select public.create_public_candidate('EXPERIENCE', 'Unsafe', 'TEST', 'Unsafe', 'Unsafe', false, true, false) $$,
  '22023',
  'public submissions must be sanitized and generalized and exclude raw evidence',
  'candidate RPC rejects unsafe declaration flags'
);

insert into public.records (
  id, record_type, title, component, content, applicability,
  status, privacy_status, maturity, provenance, published_at,
  raw_evidence_included, sanitized, generalized
) values
  (
    '10000000-0000-0000-0000-000000000001', 'EXPERIENCE',
    'Atomic regression testing', 'DATABASE', 'Stable transaction behavior.',
    'Transaction safety checks.', 'PUBLISHED', 'PASS', 'REPEATED',
    '{"source_type":"PUBLIC_GPT"}'::jsonb, now(), false, true, true
  ),
  (
    '10000000-0000-0000-0000-000000000002', 'EXPERIENCE',
    'Regression notes', 'Atomic database', 'Testing workflow.',
    'General checks.', 'PUBLISHED', 'PASS', 'REPEATED',
    '{"source_type":"PUBLIC_GPT"}'::jsonb, now(), false, true, true
  ),
  (
    '10000000-0000-0000-0000-000000000003', 'EXPERIENCE',
    'Atomic regression testing hidden candidate', 'DATABASE', 'Hidden.',
    'Hidden.', 'CANDIDATE', 'PASS', 'OBSERVED',
    '{"source_type":"PUBLIC_GPT"}'::jsonb, null, false, true, true
  ),
  (
    '10000000-0000-0000-0000-000000000004', 'EXPERIENCE',
    'Atomic regression testing hidden privacy', 'DATABASE', 'Hidden.',
    'Hidden.', 'PUBLISHED', 'UNASSESSED', 'REPEATED',
    '{"source_type":"PUBLIC_GPT"}'::jsonb, now(), false, true, true
  );

select results_eq(
  $$
    select id
    from public.search_public_records('atomic regression testing', 20)
    limit 2
  $$,
  $$ values
    ('10000000-0000-0000-0000-000000000001'::uuid),
    ('10000000-0000-0000-0000-000000000002'::uuid)
  $$,
  'multi-keyword search requires all terms and ranks title matches first'
);
select ok(
  exists (
    select 1
    from public.search_public_records('Atomic regression testing', 20)
    where title = 'Atomic regression testing'
  ),
  'exact title search returns the matching record'
);

select is(
  (select count(*)::integer from public.search_public_records('hidden candidate', 20)),
  0,
  'unpublished candidate is hidden from search'
);
select is(
  (select count(*)::integer from public.search_public_records('hidden privacy', 20)),
  0,
  'non-PASS record is hidden from search'
);
select is(
  (select count(*)::integer from public.get_public_record('10000000-0000-0000-0000-000000000001')),
  1,
  'PUBLISHED and PASS record is publicly readable'
);
select is(
  (select count(*)::integer from public.get_public_record('10000000-0000-0000-0000-000000000003')),
  0,
  'candidate is hidden from record read'
);

insert into public.records (
  record_type, title, component, content, applicability,
  status, privacy_status, provenance, published_at,
  raw_evidence_included, sanitized, generalized
)
select
  'KNOWLEDGE', 'Limit match ' || value, 'TEST', 'limit keyword', 'limit behavior',
  'PUBLISHED', 'PASS', '{"source_type":"PUBLIC_GPT"}'::jsonb, now(),
  false, true, true
from generate_series(1, 25) as value;

select is(
  (select count(*)::integer from public.search_public_records('limit', 999)),
  20,
  'search result limit is capped at 20'
);

select * from finish();
rollback;
