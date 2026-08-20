import { createClient } from 'npm:@supabase/supabase-js@2';

import { createKnowledgeApiHandler } from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const publicApiKey = Deno.env.get('ZOS_KNOWLEDGE_API_KEY') ?? '';

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : null;

const handler = createKnowledgeApiHandler({
  supabaseUrl,
  serviceRoleKey,
  publicApiKey,
  rpc: async (name, args) => {
    if (!supabase) return { data: null, error: { code: 'SERVICE_NOT_CONFIGURED' } };
    return await supabase.rpc(name, args);
  },
});

Deno.serve(handler);
