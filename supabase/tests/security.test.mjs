// End-to-end security checks for the Rocky Games Supabase backend.
//
// Run against a LOCAL or throw-away stack (it creates, bans and deletes accounts):
//   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
//   CAPTCHA_OK_TOKEN=valid-captcha-token node supabase/tests/security.test.mjs
//
// The stack must run the rocky-auth and rocky-admin functions with TURNSTILE_SECRET_KEY set to a
// secret whose verifier accepts CAPTCHA_OK_TOKEN and rejects everything else (a mock verifier through
// TURNSTILE_VERIFY_URL). A legacy `account` row (OldPlayer / oldpw / 250 coins) enables the legacy test.
import { createHmac } from 'node:crypto';

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const GOOD_CAPTCHA = process.env.CAPTCHA_OK_TOKEN || 'valid-captcha-token';
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
	console.error('Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.');
	process.exit(2);
}
const run = Date.now().toString(36);
const ipBase = Math.floor(Math.random() * 200) + 1;
let ipCounter = 0;
const nextIp = () => `10.${ipBase}.${Math.floor(++ipCounter / 250)}.${ipCounter % 250 + 1}`;
let passed = 0;
const failures = [];

async function test(name, fn) {
	try {
		await fn();
		passed++;
		console.log(`PASS  ${name}`);
	} catch (error) {
		failures.push(name);
		console.log(`FAIL  ${name}\n      ${error.message}`);
	}
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function eq(actual, expected, label = 'value') { if (actual !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }

async function http(path, { method = 'POST', token, body, key = SUPABASE_ANON_KEY, headers = {} } = {}) {
	const response = await fetch(`${SUPABASE_URL}${path}`, {
		method,
		headers: { apikey: key, authorization: `Bearer ${token || key}`, 'content-type': 'application/json', ...headers },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	const text = await response.text();
	let json = null;
	try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
	return { status: response.status, json, text };
}
const fn = (name, body, { token, ip } = {}) => http(`/functions/v1/${name}`, { body, token, headers: { 'cf-connecting-ip': ip || nextIp() } });
const service = (path, options = {}) => http(path, { ...options, key: SUPABASE_SERVICE_ROLE_KEY, headers: { prefer: 'return=representation', ...(options.headers || {}) } });
const rpc = (name, args, token) => http(`/rest/v1/rpc/${name}`, { body: args, token });
const keyed = (value) => createHmac('sha256', SUPABASE_SERVICE_ROLE_KEY).update(value).digest('hex').slice(0, 40);

const signup = (username, password = 'correct horse 1', ip = nextIp()) =>
	fn('rocky-auth', { action: 'signup', username, password, captcha: GOOD_CAPTCHA }, { ip });
const login = (username, password, ip = nextIp()) => fn('rocky-auth', { action: 'login', username, password }, { ip });

const alice = `alice${run}`;
const bob = `bob${run}`;
const adminName = `boss${run}`;
let aliceSession; let bobSession; let aliceId; let bobId; let adminSession; let adminId;

await test('direct signup through Supabase Auth is disabled', async () => {
	const result = await http('/auth/v1/signup', { body: { email: `x${run}@example.com`, password: 'password12345' } });
	assert(result.status >= 400, `signup unexpectedly returned ${result.status}`);
});

await test('anonymous browser cannot read, write or delete account tables', async () => {
	for (const table of ['profiles', 'account_v2', 'ip_bans', 'security_events', 'admin_audit_log', 'rocky_config', 'rocky_rate_limits']) {
		const read = await http(`/rest/v1/${table}?select=*`, { method: 'GET' });
		assert(read.status >= 400 || (Array.isArray(read.json) && read.json.length === 0), `${table} readable (${read.status})`);
	}
	const password = await http('/rest/v1/account?select=password', { method: 'GET' });
	assert(password.status >= 400, `legacy password column readable (${password.status})`);
	for (const method of ['POST', 'PATCH', 'DELETE']) {
		for (const table of ['account', 'profiles']) {
			const result = await http(`/rest/v1/${table}${method === 'POST' ? '' : '?username=neq.zzz'}`, { method, body: method === 'DELETE' ? undefined : { username: 'hacked', coins: 999999 }, headers: { prefer: 'return=representation' } });
			assert(result.status >= 400, `${method} ${table} allowed (${result.status})`);
		}
	}
});

await test('signup is refused without a valid CAPTCHA', async () => {
	eq((await fn('rocky-auth', { action: 'signup', username: `nocap${run}`, password: 'correct horse 1' })).status, 400, 'missing captcha');
	eq((await fn('rocky-auth', { action: 'signup', username: `badcap${run}`, password: 'correct horse 1', captcha: 'forged-token-value' })).status, 400, 'forged captcha');
	const { json } = await service(`/rest/v1/profiles?username_key=in.(nocap${run},badcap${run})&select=id`, { method: 'GET' });
	eq(json.length, 0, 'accounts created without captcha');
});

await test('honeypot field blocks naive bots', async () => {
	eq((await fn('rocky-auth', { action: 'signup', username: `honey${run}`, password: 'correct horse 1', captcha: GOOD_CAPTCHA, website: 'http://spam' })).status, 400);
});

await test('usernames and passwords are validated server-side', async () => {
	for (const username of ['ab', 'has space', 'semi;colon', 'x'.repeat(25), 'ip:1.2.3.4', 'config:blocked-words', 'admin', '<script>', 'émile']) {
		eq((await signup(username)).status, 400, `username ${JSON.stringify(username)}`);
	}
	eq((await signup(`shortpw${run}`, 'short')).status, 400, 'short password');
	eq((await signup(`longpw${run}`, 'x'.repeat(73))).status, 400, 'long password');
});

await test('registration works and returns a session', async () => {
	const result = await signup(alice);
	eq(result.status, 200, result.text);
	assert(result.json.session.access_token && result.json.session.refresh_token, 'missing tokens');
	eq(result.json.profile.coins, 0);
	assert(!('password' in result.json.profile), 'profile leaked a password field');
	aliceSession = result.json.session;
	aliceId = result.json.profile.id;
});

await test('duplicate usernames are rejected (case-insensitive)', async () => {
	eq((await signup(alice)).status, 409);
	eq((await signup(alice.toUpperCase())).status, 409);
});

await test('login works; wrong and unknown accounts get the same generic error', async () => {
	eq((await login(alice, 'correct horse 1')).status, 200);
	const wrong = await login(alice, 'not the password');
	const unknown = await login(`nobody${run}`, 'not the password');
	eq(wrong.status, 401);
	eq(unknown.status, 401);
	eq(wrong.json.error, unknown.json.error, 'error messages differ');
});

await test('repeated wrong passwords lock the account (login attempt limit)', async () => {
	const r = await signup(bob);
	eq(r.status, 200, r.text);
	bobSession = r.json.session; bobId = r.json.profile.id;
	for (let i = 0; i < 5; i++) eq((await login(bob, `wrong-${i}`)).status, 401, `attempt ${i}`);
	eq((await login(bob, 'correct horse 1')).status, 429, 'correct password during lockout');
	await service('/rest/v1/rpc/rocky_clear_rate_limit', { body: { p_key: `login-fail-user:${keyed(bob.toLowerCase())}` } });
});

await test('per-IP signup limit stops mass registration', async () => {
	const ip = nextIp();
	const results = [];
	for (let i = 0; i < 5; i++) results.push((await signup(`flood${i}${run}`, 'correct horse 1', ip)).status);
	eq(results.slice(0, 3).join(), '200,200,200', 'first three');
	eq(results[3], 429, 'fourth');
	eq(results[4], 429, 'fifth');
});

await test('session persists: refresh token issues a new access token', async () => {
	const refreshed = await http('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: aliceSession.refresh_token } });
	eq(refreshed.status, 200, refreshed.text);
	aliceSession = refreshed.json;
	const me = await rpc('rocky_me', {}, aliceSession.access_token);
	eq(me.status, 200);
	eq(me.json.username, alice);
});

await test('players only see their own row and cannot modify or delete any account', async () => {
	const token = aliceSession.access_token;
	const rows = await http('/rest/v1/profiles?select=id,username,coins', { method: 'GET', token });
	eq(rows.status, 200);
	eq(rows.json.length, 1, 'rows visible');
	eq(rows.json[0].id, aliceId);
	assert((await http('/rest/v1/profiles?select=last_ip', { method: 'GET', token })).status >= 400, 'last_ip readable by player');
	for (const [method, query, body] of [
		['PATCH', `?id=eq.${bobId}`, { coins: 2000000000 }],
		['PATCH', `?id=eq.${aliceId}`, { coins: 2000000000 }],
		['PATCH', `?id=eq.${aliceId}`, { is_admin: true }],
		['PATCH', `?id=eq.${bobId}`, { username: 'pwned' }],
		['PATCH', `?id=eq.${aliceId}`, { username: 'pwned' }],
		['DELETE', `?id=eq.${bobId}`, undefined],
		['DELETE', `?id=eq.${aliceId}`, undefined],
		['POST', '', { id: aliceId, username: 'dup', is_admin: true }]
	]) {
		const result = await http(`/rest/v1/profiles${query}`, { method, token, body, headers: { prefer: 'return=representation' } });
		assert(result.status >= 400, `${method} ${query} ${JSON.stringify(body)} allowed (${result.status})`);
	}
	const after = await service(`/rest/v1/profiles?id=in.(${aliceId},${bobId})&select=username,coins,is_admin`, { method: 'GET' });
	assert(after.json.length === 2 && after.json.every((row) => row.coins === 0 && !row.is_admin && !row.username.startsWith('pwned')), 'data changed');
	assert((await http(`/auth/v1/admin/users/${bobId}`, { method: 'DELETE', token })).status >= 400, 'player deleted an auth user');
});

await test('coin and shop saves are validated by the server', async () => {
	const token = aliceSession.access_token;
	const sync = (coins, bgs, nameplates) => rpc('rocky_sync_state', { p_coins: coins, p_bgs: bgs, p_nameplates: nameplates }, token);
	const base = { owned: ['default'], active: 'default' };
	const plates = { owned: ['classic'], active: 'classic' };
	assert((await sync(2000000000, base, plates)).status >= 400, 'jackpot accepted');
	assert((await sync(-5, base, plates)).status >= 400, 'negative coins accepted');
	eq((await sync(5, base, plates)).status, 200, 'normal reward rejected');
	assert((await sync(5, base, { owned: ['classic', 'prism'], active: 'prism' })).status >= 400, 'item far beyond the earnable cap accepted for free');
	assert((await sync(5, { owned: ['default', 'made-up'], active: 'default' }, plates)).status >= 400, 'unknown item accepted');
	assert((await sync(5, { owned: ['default'], active: 'sunset' }, plates)).status >= 400, 'unowned active accepted');
	await service(`/rest/v1/profiles?id=eq.${aliceId}`, { method: 'PATCH', body: { coins: 200 } });
	assert((await sync(1000, base, { owned: ['classic', 'prism'], active: 'prism' })).status >= 400, 'purchase plus jackpot accepted');
	const bought = await sync(150, { owned: ['default', 'sunset'], active: 'sunset' }, plates);
	eq(bought.status, 200, bought.text);
	const removed = await sync(150, base, plates);
	eq(removed.status, 200, removed.text);
	assert(JSON.stringify(removed.json).includes('sunset'), 'owned item was removed');
});

await test('leaderboard is public and exposes no ids or secrets', async () => {
	const result = await rpc('get_leaderboard', {});
	eq(result.status, 200);
	assert(Array.isArray(result.json) && result.json.length > 0, 'empty');
	assert(result.json.every((row) => !('id' in row) && !('password' in row) && !('last_ip' in row)), 'unexpected columns');
});

await test('username change needs the password and respects uniqueness', async () => {
	const token = aliceSession.access_token;
	const change = (username, password) => fn('rocky-auth', { action: 'change-username', username, password }, { token });
	eq((await change(`${alice}x`, 'wrong password')).status, 401);
	eq((await change(bob, 'correct horse 1')).status, 409);
	eq((await change('bad name!', 'correct horse 1')).status, 400);
	const ok = await change(`${alice}x`, 'correct horse 1');
	eq(ok.status, 200, ok.text);
	eq((await login(`${alice}x`, 'correct horse 1')).status, 200, 'login with new name');
	eq((await login(alice, 'correct horse 1')).status, 401, 'login with old name');
});

await test('password change needs the current password and ends other sessions', async () => {
	const token = aliceSession.access_token;
	const change = (current, next) => fn('rocky-auth', { action: 'change-password', current_password: current, new_password: next }, { token });
	eq((await change('wrong', 'brand new pass 9')).status, 401);
	eq((await change('correct horse 1', 'short')).status, 400);
	const ok = await change('correct horse 1', 'brand new pass 9');
	eq(ok.status, 200, ok.text);
	aliceSession = ok.json.session;
	eq((await login(`${alice}x`, 'correct horse 1')).status, 401, 'old password still works');
	eq((await login(`${alice}x`, 'brand new pass 9')).status, 200);
});

await test('blocked words and blocked passwords are enforced at signup', async () => {
	await service('/rest/v1/rocky_config', { body: { key: 'blocked', value: { words: ['badword'], passwords: ['password1234'], coins: [] } }, headers: { prefer: 'resolution=merge-duplicates,return=minimal' } });
	eq((await signup(`badword${run}`)).status, 400, 'blocked word');
	eq((await signup(`okname${run}`, 'password1234')).status, 400, 'blocked password');
});

await test('administrator tools reject non-admins and anonymous callers', async () => {
	assert([401, 403].includes((await fn('rocky-admin', { action: 'list' })).status), 'anonymous allowed');
	for (const action of ['list', 'delete', 'set-coins', 'reset-password', 'ban-ip', 'save-config', 'events', 'audit']) {
		eq((await fn('rocky-admin', { action, id: bobId, coins: 5, ip: '198.51.100.9' }, { token: aliceSession.access_token })).status, 403, `${action} as player`);
	}
	eq((await service(`/rest/v1/profiles?id=eq.${aliceId}&select=is_admin`, { method: 'GET' })).json[0].is_admin, false);
});

await test('administrator tools work for an admin and are audited', async () => {
	const created = await signup(adminName);
	eq(created.status, 200, created.text);
	adminId = created.json.profile.id;
	eq((await service(`/rest/v1/profiles?id=eq.${adminId}`, { method: 'PATCH', body: { is_admin: true } })).status, 200);
	adminSession = (await login(adminName, 'correct horse 1')).json.session;
	const token = adminSession.access_token;
	const list = await fn('rocky-admin', { action: 'list' }, { token });
	eq(list.status, 200, list.text);
	assert(list.json.accounts.some((row) => row.id === bobId), 'bob missing from list');
	assert(!list.text.includes('"password"'), 'password key in admin list');
	eq((await fn('rocky-admin', { action: 'set-coins', id: bobId, coins: 321 }, { token })).status, 200);
	eq((await fn('rocky-admin', { action: 'set-coins', id: bobId, coins: -1 }, { token })).status, 400);
	assert((await fn('rocky-admin', { action: 'delete', id: adminId }, { token })).status >= 400, 'self delete');
	const audit = await fn('rocky-admin', { action: 'audit' }, { token });
	assert(JSON.stringify(audit.json).includes('set-coins'), 'set-coins not audited');
});

await test('audit log is append-only even for the service role', async () => {
	assert((await service('/rest/v1/admin_audit_log?id=gt.0', { method: 'PATCH', body: { action: 'tampered' } })).status >= 400, 'audit update allowed');
	assert((await service('/rest/v1/admin_audit_log?id=gt.0', { method: 'DELETE' })).status >= 400, 'audit delete allowed');
});

await test('admin password reset: authorised, audited, rate limited, forces a change', async () => {
	const token = adminSession.access_token;
	const victim = `victim${run}`;
	const made = await signup(victim, 'victim pass 123');
	const victimId = made.json.profile.id;
	const oldRefresh = made.json.session.refresh_token;
	eq((await fn('rocky-admin', { action: 'reset-password', id: victimId }, { token: aliceSession.access_token })).status, 403, 'player reset');
	assert((await fn('rocky-admin', { action: 'reset-password', id: adminId }, { token })).status >= 400, 'admin self-reset');
	const reset = await fn('rocky-admin', { action: 'reset-password', id: victimId }, { token });
	eq(reset.status, 200, reset.text);
	const temp = reset.json.temporary_password;
	assert(temp && temp.length >= 12, 'no temporary password');
	eq((await login(victim, 'victim pass 123')).status, 401, 'old password still works');
	assert((await http('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: oldRefresh } })).status >= 400, 'old session survived reset');
	const first = await login(victim, temp);
	eq(first.status, 200, first.text);
	eq(first.json.profile.must_change_password, true);
	const t = first.json.session.access_token;
	assert((await rpc('rocky_sync_state', { p_coins: 1, p_bgs: { owned: ['default'], active: 'default' }, p_nameplates: { owned: ['classic'], active: 'classic' } }, t)).status >= 400, 'sync allowed before change');
	const changed = await fn('rocky-auth', { action: 'change-password', new_password: 'my own new pass 7' }, { token: t });
	eq(changed.status, 200, changed.text);
	eq(changed.json.profile.must_change_password, false);
	eq((await login(victim, temp)).status, 401, 'temporary password still works');
	eq((await login(victim, 'my own new pass 7')).status, 200);
	const audit = await fn('rocky-admin', { action: 'audit' }, { token });
	assert(JSON.stringify(audit.json).includes('reset-password') && JSON.stringify(audit.json).includes(victim), 'reset not audited');
	assert(!JSON.stringify(audit.json).includes(temp), 'temporary password written to the audit log');
	eq((await fn('rocky-admin', { action: 'reset-password', id: victimId }, { token })).status, 200, 'second reset');
	eq((await fn('rocky-admin', { action: 'reset-password', id: victimId }, { token })).status, 200, 'third reset');
	eq((await fn('rocky-admin', { action: 'reset-password', id: victimId }, { token })).status, 429, 'fourth reset should be limited');
});

await test('admin ban, IP ban and delete', async () => {
	const token = adminSession.access_token;
	eq((await fn('rocky-admin', { action: 'ban', id: bobId }, { token })).status, 200);
	assert((await login(bob, 'correct horse 1')).status !== 200, 'banned account logged in');
	const ip = '198.51.100.77';
	eq((await fn('rocky-admin', { action: 'ban-ip', ip }, { token })).status, 200);
	eq((await signup(`ipban${run}`, 'correct horse 1', ip)).status, 403, 'signup from banned IP');
	eq((await fn('rocky-auth', { action: 'ip-check' }, { ip })).json.banned, true);
	eq((await fn('rocky-admin', { action: 'unban-ip', ip }, { token })).status, 200);
	eq((await fn('rocky-admin', { action: 'unban', id: bobId }, { token })).status, 200);
	const victim = (await service(`/rest/v1/profiles?username_key=eq.flood0${run}&select=id`, { method: 'GET' })).json[0];
	eq((await fn('rocky-admin', { action: 'delete', id: victim.id }, { token })).status, 200);
	eq((await service(`/rest/v1/profiles?id=eq.${victim.id}&select=id`, { method: 'GET' })).json.length, 0, 'profile remains');
});

await test('abuse events are recorded for admins', async () => {
	const events = await fn('rocky-admin', { action: 'events' }, { token: adminSession.access_token });
	eq(events.status, 200);
	const text = JSON.stringify(events.json);
	for (const name of ['signup_captcha_failed', 'signup_rate_limited', 'login_failed']) assert(text.includes(name), `no ${name} events`);
});

await test('legacy accounts can be claimed once and must change password', async () => {
	const legacy = await service('/rest/v1/account?username=eq.OldPlayer&select=id', { method: 'GET' });
	if (!legacy.json?.length) { console.log('      (skipped: no legacy fixture)'); return; }
	eq((await login('OldPlayer', 'wrong')).status, 401);
	const claimed = await login('OldPlayer', 'oldpw');
	eq(claimed.status, 200, claimed.text);
	eq(claimed.json.profile.coins, 250);
	eq(claimed.json.profile.must_change_password, true);
	assert(JSON.stringify(claimed.json.profile.bgs).includes('sunset'), 'purchases not carried over');
	eq((await login('OldPlayer', 'oldpw')).status, 401, 'legacy password reusable after claim');
	const set = await fn('rocky-auth', { action: 'change-password', new_password: 'legacy new pass 5' }, { token: claimed.json.session.access_token });
	eq(set.status, 200, set.text);
	eq((await login('OldPlayer', 'legacy new pass 5')).status, 200);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log(failures.map((name) => ` - ${name}`).join('\n')); process.exit(1); }
