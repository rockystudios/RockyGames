const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SESSION_SECRET = Deno.env.get('ROCKY_SESSION_SECRET');
const PASSWORD_PEPPER = Deno.env.get('ROCKY_PASSWORD_PEPPER');
const ADMIN_PASSWORD = Deno.env.get('ROCKY_ADMIN_PASSWORD');
const CREATE_CODE = Deno.env.get('ROCKY_CREATE_CODE');
const TABLE = 'account_v2';
const PBKDF2_ITERATIONS = 310000;
const SESSION_SECONDS = 60 * 60 * 24 * 14;
const MAX_COINS = 2000000000;

const apiErrorStatuses = new WeakMap();

function apiError(message: string, status: number) {
	const error = new Error(message);
	apiErrorStatuses.set(error, status);
	return error;
}

const corsHeaders = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': 'authorization, apikey, content-type',
	'access-control-allow-methods': 'POST, OPTIONS',
	'content-type': 'application/json'
};

function respond(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function normalizeName(text: string) {
	const map: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
	return text.toLowerCase().replace(/[013457@$!]/g, (char) => map[char]).replace(/[^a-z]/g, '');
}

function base64Url(bytes: Uint8Array) {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64Url(value: string) {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	return Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')), (char) => char.charCodeAt(0));
}

function toBytes(value: string) {
	return new TextEncoder().encode(value);
}

function sameSecret(input: string, expected: string) {
	const left = toBytes(input);
	const right = toBytes(expected);
	let difference = left.length ^ right.length;
	for (let i = 0; i < Math.min(left.length, right.length); i++) difference |= left[i] ^ right[i];
	return difference === 0;
}

async function hmac(value: string) {
	if (!SESSION_SECRET || SESSION_SECRET.length < 32) throw new Error('ROCKY_SESSION_SECRET must be at least 32 characters.');
	const key = await crypto.subtle.importKey('raw', toBytes(SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	return new Uint8Array(await crypto.subtle.sign('HMAC', key, toBytes(value)));
}

async function issueToken(payload: Record<string, unknown>, lifetime = SESSION_SECONDS) {
	const header = base64Url(toBytes(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
	const body = base64Url(toBytes(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + lifetime })));
	const data = `${header}.${body}`;
	return `${data}.${base64Url(await hmac(data))}`;
}

async function verifyToken(token: string, type: 'account' | 'admin') {
	try {
		if (!token || !SESSION_SECRET) return null;
		const parts = token.split('.');
		if (parts.length !== 3) return null;
		const data = `${parts[0]}.${parts[1]}`;
		const expected = await hmac(data);
		const actual = fromBase64Url(parts[2]);
		let difference = actual.length ^ expected.length;
		for (let i = 0; i < Math.min(actual.length, expected.length); i++) difference |= actual[i] ^ expected[i];
		if (difference) return null;
		const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[1])));
		return payload.type === type && Number(payload.exp) > Date.now() / 1000 ? payload : null;
	} catch {
		return null;
	}
}

async function passwordHash(password: string) {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const key = await crypto.subtle.importKey('raw', toBytes(password), 'PBKDF2', false, ['deriveBits']);
	const hash = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS }, key, 256));
	return `pbkdf2$${PBKDF2_ITERATIONS}$${base64Url(salt)}$${base64Url(hash)}`;
}

async function passwordMatches(password: string, encoded: unknown) {
	if (typeof encoded !== 'string') return false;
	const [scheme, iterationText, saltText, hashText] = encoded.split('$');
	if (scheme !== 'pbkdf2' || !/^\d+$/.test(iterationText || '') || !saltText || !hashText) return false;
	const iterations = Number(iterationText);
	if (!Number.isSafeInteger(iterations) || iterations < 100000 || iterations > 1000000) return false;
	const key = await crypto.subtle.importKey('raw', toBytes(password), 'PBKDF2', false, ['deriveBits']);
	const hash = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64Url(saltText), iterations }, key, 256));
	const expected = fromBase64Url(hashText);
	if (hash.length !== expected.length) return false;
	let difference = 0;
	for (let i = 0; i < hash.length; i++) difference |= hash[i] ^ expected[i];
	return difference === 0;
}

async function passwordCheck(password: string) {
	if (!PASSWORD_PEPPER || PASSWORD_PEPPER.length < 32) throw new Error('ROCKY_PASSWORD_PEPPER must be at least 32 characters.');
	const key = await crypto.subtle.importKey('raw', toBytes(PASSWORD_PEPPER), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, toBytes(`password:${password}`))));
}

function clientIp(request: Request) {
	const address = request.headers.get('cf-connecting-ip')?.trim()
		|| request.headers.get('x-forwarded-for')?.split(',')[0].trim()
		|| '';
	return /^[0-9a-fA-F:.]{3,45}$/.test(address) ? address : '';
}

async function database(path: string, init: RequestInit = {}) {
	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('Supabase function secrets are not configured.');
	const endpoint = path.startsWith('/rpc/') ? `${SUPABASE_URL}/rest/v1${path}` : `${SUPABASE_URL}/rest/v1/${TABLE}${path}`;
	const response = await fetch(endpoint, {
		...init,
		headers: {
			apikey: SERVICE_ROLE_KEY,
			authorization: `Bearer ${SERVICE_ROLE_KEY}`,
			'content-type': 'application/json',
			prefer: 'return=representation',
			...(init.headers || {})
		}
	});
	const text = await response.text();
	if (!response.ok) throw new Error(`Database request failed (${response.status}): ${text.slice(0, 300)}`);
	return text ? JSON.parse(text) : [];
}

async function isRateLimited(request: Request, action: string, maxRequests: number, windowSeconds: number) {
	const ip = clientIp(request);
	if (!ip) return false;
	const key = base64Url(await hmac(`rate:${action}:${ip}`));
	return await database('/rpc/rocky_take_rate_limit', {
		method: 'POST',
		body: JSON.stringify({ p_key: key, p_max_requests: maxRequests, p_window_seconds: windowSeconds })
	}) === true;
}

async function config() {
	const rows = await database(`?username=eq.${encodeURIComponent('config:blocked-words')}&select=bgs&limit=1`);
	return rows[0]?.bgs || {};
}

function blockedName(name: string, words: unknown) {
	if (!Array.isArray(words)) return false;
	const normalized = normalizeName(name);
	return words.map((word) => normalizeName(String(word))).filter((word) => word.length >= 2).some((word) => normalized.includes(word));
}

async function checkBlocked(row: Record<string, any>, lists: Record<string, any>) {
	if (row.username === 'config:blocked-words' || row.username.startsWith('ip:')) return false;
	let matchesPassword = false;
	if (Array.isArray(lists.passwords)) {
		for (const value of lists.passwords) {
			if (row.password_check === await passwordCheck(String(value))) {
				matchesPassword = true;
				break;
			}
		}
	}
	return blockedName(row.username, lists.words) || matchesPassword || (Array.isArray(lists.coins) && lists.coins.includes(row.coins));
}

function safeAccount(row: Record<string, any>) {
	const { password: _password, password_check: _passwordCheck, ...safe } = row;
	return safe;
}

async function requireAccount(tokenValue: string) {
	const token = await verifyToken(tokenValue, 'account');
	if (!token || !Number.isSafeInteger(token.id)) throw apiError('Sign in again to continue.', 401);
	const rows = await database(`?id=eq.${token.id}&select=*&limit=1`);
	if (!rows.length) throw apiError('This account no longer exists.', 401);
	const row = rows[0];
	if (row.bgs?.banned) throw apiError('This account is banned.', 403);
	const lists = await config();
	if (await checkBlocked(row, lists)) {
		await database(`?id=eq.${row.id}`, { method: 'PATCH', body: JSON.stringify({ coins: 0, bgs: { banned: true, reason: 'blocked list' } }) });
		throw apiError('This account is banned.', 403);
	}
	return row;
}

async function adminProxy(body: Record<string, any>) {
	const token = await verifyToken(String(body.token || ''), 'admin');
	if (!token) throw apiError('Admin session expired. Sign in again.', 401);
	const method = String(body.method || 'GET').toUpperCase();
	if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) throw new Error('Unsupported request.');
	const query = String(body.query || '');
	if (!query.startsWith('?') && query !== '') throw new Error('Invalid query.');
	const values = body.body && typeof body.body === 'object' ? { ...body.body } : undefined;
	if (values) {
		delete values.password;
		delete values.password_check;
	}
	const rows = await database(`${query}`, {
		method,
		...(values === undefined ? {} : { body: JSON.stringify(values) })
	});
	return Array.isArray(rows) ? rows.map(safeAccount) : rows;
}

async function adminScan(body: Record<string, any>) {
	const token = await verifyToken(String(body.token || ''), 'admin');
	if (!token) throw apiError('Admin session expired. Sign in again.', 401);
	const words = Array.isArray(body.words) ? body.words.map((word: unknown) => normalizeName(String(word))).filter((word: string) => word.length >= 2) : [];
	const passwords = Array.isArray(body.passwords) ? body.passwords.map(String) : [];
	const coins = Array.isArray(body.coins) ? body.coins.map(Number) : [];
	const passwordChecks = new Set(await Promise.all(passwords.map((password: string) => passwordCheck(password))));
	const rows = await database('?select=id,username,password_check,coins,bgs&order=id.asc');
	const matches = [];
	for (const row of rows) {
		if (row.username === 'config:blocked-words' || row.username.startsWith('ip:') || row.bgs?.banned) continue;
		const name = normalizeName(row.username);
		const matched = words.some((word: string) => name.includes(word))
			|| coins.includes(Number(row.coins))
			|| passwordChecks.has(row.password_check);
		if (matched) matches.push({ id: row.id, username: row.username });
	}
	return matches;
}

async function handle(request: Request) {
	if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
	if (request.method !== 'POST') return respond({ error: 'POST required.' }, 405);
	const body = await request.json();
	const action = String(body.action || '');

	if (action === 'admin-login') {
		if (await isRateLimited(request, 'admin-login', 5, 600)) return respond({ error: 'Too many attempts. Try again in 10 minutes.' }, 429);
		if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 16 || !sameSecret(String(body.password || ''), ADMIN_PASSWORD)) return respond({ error: 'Wrong password.' }, 401);
		return respond({ token: await issueToken({ type: 'admin' }, 60 * 60 * 2) });
	}
	if (action === 'admin-proxy') return respond(await adminProxy(body));
	if (action === 'admin-scan') return respond(await adminScan(body));
	if (action === 'leaderboard') {
		const rows = await database('?select=username,coins,nameplates,bgs&bgs->>banned=is.null&order=coins.desc&limit=100');
		return respond(rows.filter((row: Record<string, any>) => !row.username.startsWith('ip:') && !row.username.startsWith('config:')).map((row: Record<string, any>) => ({
			username: row.username, coins: row.coins, nameplates: row.nameplates
		})));
	}
	if (action === 'ip-check') {
		const ip = clientIp(request);
		if (!ip) return respond({ banned: false });
		const rows = await database(`?username=eq.${encodeURIComponent(`ip:${ip}`)}&select=id&limit=1`);
		return respond({ banned: rows.length > 0 });
	}
	if (action === 'sign-in') {
		if (await isRateLimited(request, 'sign-in', 12, 600)) return respond({ error: 'Too many attempts. Try again in 10 minutes.' }, 429);
		const username = String(body.username || '').trim();
		const password = String(body.password || '');
		const rows = await database(`?username=eq.${encodeURIComponent(username)}&select=*&limit=1`);
		if (!rows.length || !(await passwordMatches(password, rows[0].password))) return respond({ error: 'Wrong username or password.' }, 401);
		const row = rows[0];
		if (row.bgs?.banned) return respond({ error: 'This account is banned.' }, 403);
		const lists = await config();
		if (await checkBlocked(row, lists)) {
			await database(`?id=eq.${row.id}`, { method: 'PATCH', body: JSON.stringify({ coins: 0, bgs: { banned: true, reason: 'blocked list' } }) });
			return respond({ error: 'This account is banned.' }, 403);
		}
		return respond({ account: safeAccount(row), token: await issueToken({ type: 'account', id: row.id }) });
	}
	if (action === 'create-account') {
		if (await isRateLimited(request, 'create-account', 10, 3600)) return respond({ error: 'Too many account creation attempts. Try again in an hour.' }, 429);
		if (!CREATE_CODE || !sameSecret(String(body.code || ''), CREATE_CODE)) return respond({ error: 'Wrong creation password.' }, 401);
		const username = String(body.username || '').trim();
		const password = String(body.password || '');
		if (!username || username.length > 24) return respond({ error: 'Username must be 1-24 characters.' }, 400);
		if (/^(?:ip:|config:)/i.test(username)) return respond({ error: 'That username is reserved.' }, 400);
		if (password.length < 1 || password.length > 256) return respond({ error: 'Password must be 1-256 characters.' }, 400);
		const ip = clientIp(request);
		if (!ip) return respond({ error: 'Could not detect your IP address.' }, 400);
		const ipBans = await database(`?username=eq.${encodeURIComponent(`ip:${ip}`)}&select=id&limit=1`);
		if (ipBans.length) return respond({ error: 'This network is banned.' }, 403);
		const lists = await config();
		if (blockedName(username, lists.words)) return respond({ error: 'This username is not allowed.' }, 400);
		const existing = await database(`?username=eq.${encodeURIComponent(username)}&select=id&limit=1`);
		if (existing.length) return respond({ error: 'That username is already taken.' }, 409);
		const matchesPassword = Array.isArray(lists.passwords) && lists.passwords.includes(password);
		const rows = await database('', {
			method: 'POST',
			body: JSON.stringify({
				username, password: await passwordHash(password), password_check: await passwordCheck(password),
				coins: 0, bgs: { owned: ['default'], active: 'default', ip },
				nameplates: { owned: ['classic'], active: 'classic' }
			})
		});
		if (matchesPassword || (Array.isArray(lists.coins) && lists.coins.includes(0))) {
			await database(`?id=eq.${rows[0].id}`, { method: 'PATCH', body: JSON.stringify({ coins: 0, bgs: { banned: true, reason: 'blocked list', ip } }) });
			return respond({ error: 'This account is banned.' }, 403);
		}
		return respond({ account: safeAccount(rows[0]), token: await issueToken({ type: 'account', id: rows[0].id }) });
	}
	if (action === 'account-read') {
		const row = await requireAccount(String(body.token || ''));
		return respond({ account: safeAccount(row) });
	}
	if (action === 'account-sync') {
		const row = await requireAccount(String(body.token || ''));
		const coins = Number(body.state?.coins);
		if (!Number.isSafeInteger(coins) || coins < 0 || coins > MAX_COINS) return respond({ error: 'Invalid coin balance.' }, 400);
		const bgs = body.state?.bgs || {};
		const nameplates = body.state?.nameplates || {};
		const mergedBgs = {
			...row.bgs, owned: Array.isArray(bgs.owned) ? bgs.owned : ['default'],
			active: typeof bgs.active === 'string' ? bgs.active : 'default',
			lastSpin: typeof bgs.lastSpin === 'string' ? bgs.lastSpin : null,
			ip: clientIp(request) || row.bgs?.ip
		};
		const mergedNameplates = {
			...row.nameplates, owned: Array.isArray(nameplates.owned) ? nameplates.owned : ['classic'],
			active: typeof nameplates.active === 'string' ? nameplates.active : 'classic'
		};
		const updated = await database(`?id=eq.${row.id}&bgs->>banned=is.null`, {
			method: 'PATCH', body: JSON.stringify({ coins, bgs: mergedBgs, nameplates: mergedNameplates })
		});
		return respond({ saved: updated.length > 0 });
	}
	if (action === 'account-rename') {
		const row = await requireAccount(String(body.token || ''));
		const name = String(body.username || '').trim();
		if (!name || name.length > 24) return respond({ error: 'Username must be 1-24 characters.' }, 400);
		if (!(await passwordMatches(String(body.password || ''), row.password))) return respond({ error: 'Wrong password.' }, 401);
		if (blockedName(name, (await config()).words)) {
			await database(`?id=eq.${row.id}`, { method: 'PATCH', body: JSON.stringify({ coins: 0, bgs: { banned: true, reason: 'blocked username' } }) });
			return respond({ error: 'This account is banned.' }, 403);
		}
		const updated = await database(`?username=eq.${encodeURIComponent(name)}&select=id&limit=1`);
		if (updated.length && updated[0].id !== row.id) return respond({ error: 'That username is already taken.' }, 409);
		const rows = await database(`?id=eq.${row.id}&bgs->>banned=is.null`, { method: 'PATCH', body: JSON.stringify({ username: name }) });
		return respond({ account: safeAccount(rows[0]) });
	}
	return respond({ error: 'Unknown action.' }, 404);
}

Deno.serve(async (request) => {
	try {
		return await handle(request);
	} catch (error) {
		console.error('Rocky API request failed:', error);
		const message = error instanceof Error ? error.message : 'Unexpected server error.';
		return respond({ error: message }, error instanceof Error ? (apiErrorStatuses.get(error) || 500) : 500);
	}
});
