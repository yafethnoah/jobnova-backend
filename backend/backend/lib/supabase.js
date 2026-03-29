const { createClient } = require('@supabase/supabase-js');
let cachedAnonClient = null; let cachedAdminClient = null;
const clean = (value) => String(value || '').trim();
function hasSupabaseAnon() { return Boolean(clean(process.env.SUPABASE_URL) && clean(process.env.SUPABASE_ANON_KEY)); }
function hasSupabaseAdmin() { return Boolean(clean(process.env.SUPABASE_URL) && clean(process.env.SUPABASE_SERVICE_ROLE_KEY)); }
function getSupabaseClient() { if (!hasSupabaseAnon()) return null; if (!cachedAnonClient) cachedAnonClient = createClient(clean(process.env.SUPABASE_URL), clean(process.env.SUPABASE_ANON_KEY), { auth: { persistSession: false, autoRefreshToken: false } }); return cachedAnonClient; }
function getSupabaseAdmin() { if (!hasSupabaseAdmin()) return null; if (!cachedAdminClient) cachedAdminClient = createClient(clean(process.env.SUPABASE_URL), clean(process.env.SUPABASE_SERVICE_ROLE_KEY), { auth: { persistSession: false, autoRefreshToken: false } }); return cachedAdminClient; }
async function supabaseHealthcheck() {
  const anonReady = hasSupabaseAnon(); const adminReady = hasSupabaseAdmin();
  if (!anonReady && !adminReady) return { enabled: false, ok: false, mode: 'unconfigured', reason: 'SUPABASE_URL and keys are missing' };
  try {
    const admin = getSupabaseAdmin();
    if (!admin) return { enabled: true, ok: false, mode: 'partial', reason: 'Supabase anon config exists, but admin storage config is incomplete' };
    const bucket = clean(process.env.STORAGE_BUCKET || 'resumes');
    const { error } = await admin.storage.from(bucket).list('', { limit: 1 });
    if (error) return { enabled: true, ok: false, mode: 'configured-with-errors', reason: error.message || 'Supabase storage check failed' };
    return { enabled: true, ok: true, mode: 'configured' };
  } catch (error) {
    return { enabled: true, ok: false, mode: 'configured-with-errors', reason: error instanceof Error ? error.message : 'Supabase healthcheck failed' };
  }
}
module.exports = { getSupabaseClient, getSupabaseAdmin, hasSupabaseAnon, hasSupabaseAdmin, supabaseHealthcheck };
