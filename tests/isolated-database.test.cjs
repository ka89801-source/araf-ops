'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getIsolatedDatabaseConfig } = require('../server/isolated-database.cjs');
const source = require('../server/source-platform.cjs');

const targetRef = 'abcdefghijklmnopqrst';
const valid = {
  ARAF_TARGET_SUPABASE_URL: `https://${targetRef}.supabase.co`,
  ARAF_TARGET_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_fixture',
  ARAF_TARGET_SUPABASE_SECRET_KEY: 'sb_secret_test_fixture'
};
const jwt = (role, ref) => 'test.' + Buffer.from(JSON.stringify({ role, ref })).toString('base64url') + '.fixture';

test('missing destination never falls back to production', () => {
  assert.throws(() => getIsolatedDatabaseConfig({ SUPABASE_URL: source.supabaseUrl }),
    { code: 'ISOLATED_DATABASE_NOT_CONFIGURED' });
});

test('rejects production project even with differently cased URL or trailing slash', () => {
  for (const url of [source.supabaseUrl, source.supabaseUrl + '/', source.supabaseUrl.toUpperCase()]) {
    assert.throws(() => getIsolatedDatabaseConfig({ ...valid, ARAF_TARGET_SUPABASE_URL: url }),
      { code: 'PRODUCTION_DATABASE_CANNOT_BE_TARGET' });
  }
});

test('rejects production public key in a destination configuration', () => {
  assert.throws(() => getIsolatedDatabaseConfig({ ...valid, ARAF_TARGET_SUPABASE_PUBLISHABLE_KEY: source.supabasePublishableKey }),
    { code: 'PRODUCTION_KEY_CANNOT_BE_TARGET' });
});

test('rejects insecure URLs, embedded credentials, custom hosts and API paths', () => {
  for (const url of ['http://' + targetRef + '.supabase.co', 'https://user:password@' + targetRef + '.supabase.co',
    'https://example.com', valid.ARAF_TARGET_SUPABASE_URL + '/rest/v1', valid.ARAF_TARGET_SUPABASE_URL + '?source=production']) {
    assert.throws(() => getIsolatedDatabaseConfig({ ...valid, ARAF_TARGET_SUPABASE_URL: url }), { code: 'INVALID_TARGET_URL' });
  }
});

test('rejects a legacy JWT bound to the original project or wrong role', () => {
  for (const secretKey of [jwt('service_role', source.projectRef), jwt('anon', targetRef)]) {
    assert.throws(() => getIsolatedDatabaseConfig({ ...valid, ARAF_TARGET_SUPABASE_SECRET_KEY: secretKey }),
      { code: 'TARGET_KEY_TYPE_OR_PROJECT_MISMATCH' });
  }
});

test('accepts a separate destination and does not return source settings', () => {
  const config = getIsolatedDatabaseConfig(valid);
  assert.equal(config.projectRef, targetRef);
  assert.equal(config.supabaseUrl, valid.ARAF_TARGET_SUPABASE_URL);
  assert.notEqual(config.supabaseUrl, source.supabaseUrl);
  assert.ok(Object.isFrozen(config));
});

test('accepts correctly scoped legacy key roles for the destination', () => {
  const config = getIsolatedDatabaseConfig({ ...valid,
    ARAF_TARGET_SUPABASE_PUBLISHABLE_KEY: jwt('anon', targetRef),
    ARAF_TARGET_SUPABASE_SECRET_KEY: jwt('service_role', targetRef)
  });
  assert.equal(config.projectRef, targetRef);
});
