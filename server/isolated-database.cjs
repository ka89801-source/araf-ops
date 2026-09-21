'use strict';

const source = require('./source-platform.cjs');

function invalid(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function validateKey(value, kind, projectRef) {
  // Opaque Supabase keys cannot be decoded. Their project binding must also be
  // checked by an authenticated connection test before enabling any writes.
  if (kind === 'public' && value.startsWith('sb_publishable_')) return;
  if (kind === 'secret' && value.startsWith('sb_secret_')) return;
  try {
    const segments = value.split('.');
    if (segments.length !== 3) throw invalid('INVALID_KEY');
    const claims = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'));
    const role = kind === 'public' ? 'anon' : 'service_role';
    if (claims.role !== role || claims.ref !== projectRef) throw invalid('INVALID_KEY');
  } catch {
    throw invalid('TARGET_KEY_TYPE_OR_PROJECT_MISMATCH');
  }
}

function getIsolatedDatabaseConfig(env = process.env) {
  const supabaseUrl = String(env.ARAF_TARGET_SUPABASE_URL || '').trim();
  const publishableKey = String(env.ARAF_TARGET_SUPABASE_PUBLISHABLE_KEY || '').trim();
  const secretKey = String(env.ARAF_TARGET_SUPABASE_SECRET_KEY || '').trim();

  if (!supabaseUrl || !publishableKey || !secretKey) {
    throw invalid('ISOLATED_DATABASE_NOT_CONFIGURED');
  }

  let url;
  try { url = new URL(supabaseUrl); } catch { throw invalid('INVALID_TARGET_URL'); }
  if (url.hostname === new URL(source.supabaseUrl).hostname) {
    throw invalid('PRODUCTION_DATABASE_CANNOT_BE_TARGET');
  }
  const host = url.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
  if (url.protocol !== 'https:' || !host || url.username || url.password ||
      url.port || (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    throw invalid('INVALID_TARGET_URL');
  }
  if (publishableKey === source.supabasePublishableKey || secretKey === source.supabasePublishableKey) {
    throw invalid('PRODUCTION_KEY_CANNOT_BE_TARGET');
  }
  validateKey(publishableKey, 'public', host[1]);
  validateKey(secretKey, 'secret', host[1]);
  return Object.freeze({ supabaseUrl: url.origin, publishableKey, secretKey, projectRef: host[1] });
}

module.exports = { getIsolatedDatabaseConfig };
