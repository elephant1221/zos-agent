import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL(
  '../supabase/existing-environment/migrations/202608210001_public_v1_2_live_compatibility.sql',
  import.meta.url,
);
const baselinePath = new URL(
  '../supabase/existing-environment/baseline/20260820_live_public_schema.sql',
  import.meta.url,
);

test('live compatibility migration is additive and exposes only four Public RPCs', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  const executableSql = sql.replace(/^\s*--.*$/gm, '');
  for (const signature of [
    'create_public_candidate(',
    'add_public_observation(',
    'search_public_records(',
    'get_public_record(',
  ]) assert.match(sql, new RegExp(signature.replace('(', '\\('), 'i'));

  assert.doesNotMatch(executableSql, /\b(?:drop|truncate)\b/i);
  assert.doesNotMatch(executableSql, /alter\s+table/i);
  assert.doesNotMatch(executableSql, /revoke\s+.+\s+on\s+table/i);
  assert.doesNotMatch(executableSql, /mpbsdp|publish_record_atomic/i);
});

test('live compatibility migration enforces untrusted Public writes server-side', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /'PUBLIC_GPT'/);
  assert.match(sql, /'CANDIDATE'/);
  assert.match(sql, /'UNASSESSED'/);
  assert.match(sql, /validated[\s\S]*false/i);
  assert.match(sql, /independent[\s\S]*false/i);
  assert.doesNotMatch(sql, /p_sanitized|p_generalized|p_raw_evidence_included/i);
});

test('live compatibility search preserves any-term weighted ranking and phrase bonus', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  assert.match(sql, /matched_terms\s*>\s*0/i);
  assert.match(sql, /title[\s\S]*\*\s*5/i);
  assert.match(sql, /component[\s\S]*\*\s*3/i);
  assert.match(sql, /content[\s\S]*\*\s*2/i);
  assert.match(sql, /applicability[\s\S]*\*\s*1/i);
  assert.match(sql, /then\s+10[\s\S]*exact_phrase_bonus/i);
  assert.match(sql, /least\([\s\S]*20/i);
  assert.match(sql, /status\s*=\s*'PUBLISHED'/i);
  assert.match(sql, /privacy_status\s*=\s*'PASS'/i);
});

test('live-derived baseline records the existing advanced objects without changing them', async () => {
  const sql = await readFile(baselinePath, 'utf8');
  assert.match(sql, /create table public\.records/i);
  assert.match(sql, /create table public\.observations/i);
  assert.match(sql, /create table public\.record_events/i);
  assert.match(sql, /refresh_experience_maturity\([^)]*text\)/i);
  assert.match(sql, /handle_observation_maturity_refresh\(\)/i);
  assert.match(sql, /publish_record_atomic\(text\)/i);
  assert.match(sql, /observations_refresh_maturity/i);
  assert.match(sql, /DO NOT APPLY TO THE EXISTING LIVE DATABASE/i);
});
