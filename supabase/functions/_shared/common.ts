import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY') ?? '';
const TURNSTILE_VERIFY_URL = Deno.env.get('TURNSTILE_VERIFY_URL') || 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ALLOWED_ORIGINS = (Deno.env.get('ROCKY_ALLOWED_ORIGINS')
	|| 'https://rockystudios.github.io,http://localhost:8000,http://127.0.0.1:8000').split(',').map((v) => v.trim()).filter(Boolean);

export const EMAIL_DOMAIN = 'players.rockygames.invalid';
export const MAX_COINS = 2000000000;

export class ApiError extends Error {
	constructor(message: string, public status = 400) {
		super(message);
	}
}

export function admin(): SupabaseClient {
	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new ApiError('Server is not configured.', 500);
	return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

// A throwaway client for password sign-ins so no state leaks between requests.
export function publicClient(): SupabaseClient {
	return createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function corsHeaders(request: Request) {
	const origin = request.headers.get('origin') || '';
	const headers: Record<string, string> = {
		'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
		'access-control-allow-methods': 'POST, OPTIONS',
		'content-type': 'application/json',
		'cache-control': 'no-store',
		vary: 'origin'
	};
	if (ALLOWED_ORIGINS.includes(origin)) headers['access-control-allow-origin'] = origin;
	return headers;
}

export function respond(request: Request, body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}

export function serve(handler: (request: Request, body: Record<string, any>) => Promise<Response>) {
	Deno.serve(async (request) => {
		if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(request) });
		try {
			if (request.method !== 'POST') throw new ApiError('POST required.', 405);
			const origin = request.headers.get('origin');
			if (origin && !ALLOWED_ORIGINS.includes(origin)) throw new ApiError('Origin not allowed.', 403);
			const text = await request.text();
			if (text.length > 20000) throw new ApiError('Request too large.', 413);
			let body: Record<string, any>;
			try { body = JSON.parse(text || '{}'); } catch { throw new ApiError('Invalid JSON.', 400); }
			if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError('Invalid request.', 400);
			return await handler(request, body);
		} catch (error) {
			if (error instanceof ApiError) return respond(request, { error: error.message }, error.status);
			console.error('Rocky request failed:', error);
			return respond(request, { error: 'Unexpected server error.' }, 500);
		}
	});
}

const encoder = new TextEncoder();

export function bytesToHex(bytes: Uint8Array) {
	return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function constantTimeEqual(a: string, b: string) {
	const left = encoder.encode(a);
	const right = encoder.encode(b);
	let difference = left.length ^ right.length;
	for (let i = 0; i < Math.min(left.length, right.length); i++) difference |= left[i] ^ right[i];
	return difference === 0;
}

// Keyed hash so rate-limit keys never store raw IPs or usernames.
export async function keyed(value: string) {
	const key = await crypto.subtle.importKey('raw', encoder.encode(SERVICE_ROLE_KEY || 'unconfigured'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	return bytesToHex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))).slice(0, 40);
}

export function clientIp(request: Request) {
	const address = request.headers.get('cf-connecting-ip')?.trim()
		|| request.headers.get('x-real-ip')?.trim()
		|| request.headers.get('x-forwarded-for')?.split(',')[0].trim()
		|| '';
	return /^[0-9a-fA-F:.]{3,45}$/.test(address) ? address : '';
}

export async function takeLimit(db: SupabaseClient, name: string, subject: string, max: number, windowSeconds: number) {
	const { data, error } = await db.rpc('rocky_take_rate_limit', {
		p_key: `${name}:${await keyed(subject)}`, p_max_requests: max, p_window_seconds: windowSeconds
	});
	if (error) throw new Error(`rate limiter failed: ${error.message}`);
	return data === true;
}

export async function limitStatus(db: SupabaseClient, name: string, subject: string, max: number, windowSeconds: number) {
	const { data, error } = await db.rpc('rocky_rate_limit_status', {
		p_key: `${name}:${await keyed(subject)}`, p_max_requests: max, p_window_seconds: windowSeconds
	});
	if (error) throw new Error(`rate limiter failed: ${error.message}`);
	return data === true;
}

export async function clearLimit(db: SupabaseClient, name: string, subject: string) {
	await db.rpc('rocky_clear_rate_limit', { p_key: `${name}:${await keyed(subject)}` });
}

export async function logEvent(db: SupabaseClient, event: string, username: string | null, ip: string, detail: Record<string, unknown> = {}) {
	const { error } = await db.from('security_events').insert({ event, username: username?.slice(0, 40) ?? null, ip: ip || null, detail });
	if (error) console.error('could not record security event:', error.message);
}

export async function audit(db: SupabaseClient, actor: { id: string; username: string }, action: string, target: { id?: string | null; username?: string | null } | null, detail: Record<string, unknown> = {}) {
	const { error } = await db.from('admin_audit_log').insert({
		actor_id: actor.id, actor_name: actor.username, action, target_id: target?.id ?? null, target_name: target?.username ?? null, detail
	});
	// Fail closed: a privileged action must not proceed without a record.
	if (error) throw new Error(`audit log failed: ${error.message}`);
}

export function normalizeName(text: string) {
	const map: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
	return text.toLowerCase().replace(/[013457@$!]/g, (char) => map[char]).replace(/[^a-z]/g, '');
}

const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{2,23}$/;

export function validateUsername(value: unknown) {
	const username = typeof value === 'string' ? value.trim() : '';
	if (!USERNAME_PATTERN.test(username)) {
		throw new ApiError('Usernames are 3-24 characters: letters, numbers, dot, dash or underscore, starting with a letter or number.');
	}
	if (/^(ip|config):/i.test(username) || /^(admin|administrator|root|system|moderator)$/i.test(username)) throw new ApiError('That username is reserved.');
	return username;
}

export function validateNewPassword(value: unknown) {
	const password = typeof value === 'string' ? value : '';
	if (password.length < 8) throw new ApiError('Passwords must be at least 8 characters.');
	if (encoder.encode(password).length > 72) throw new ApiError('Passwords can be at most 72 bytes.');
	return password;
}

export type Blocked = { words: string[]; passwords: string[]; coins: number[] };

export async function loadBlocked(db: SupabaseClient): Promise<Blocked> {
	const { data } = await db.from('rocky_config').select('value').eq('key', 'blocked').maybeSingle();
	const value = (data?.value ?? {}) as Record<string, unknown>;
	const list = (item: unknown) => (Array.isArray(item) ? item : []);
	return {
		words: list(value.words).map(String),
		passwords: list(value.passwords).map(String),
		coins: list(value.coins).map(Number).filter(Number.isSafeInteger)
	};
}

export function hasBlockedWord(name: string, words: string[]) {
	const normalized = normalizeName(name);
	return words.map(normalizeName).filter((word) => word.length >= 2).some((word) => normalized.includes(word));
}

export async function isIpBanned(db: SupabaseClient, ip: string) {
	if (!ip) return false;
	const { data } = await db.from('ip_bans').select('ip').eq('ip', ip).maybeSingle();
	return Boolean(data);
}

export async function verifyCaptcha(token: unknown, ip: string) {
	if (!TURNSTILE_SECRET) throw new ApiError('Account creation is not configured yet.', 503);
	if (typeof token !== 'string' || token.length < 10 || token.length > 4096) throw new ApiError('Complete the human check and try again.', 400);
	const form = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token });
	if (ip) form.set('remoteip', ip);
	let result: { success?: boolean };
	try {
		const response = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body: form, signal: AbortSignal.timeout(8000) });
		result = await response.json();
	} catch {
		throw new ApiError('The human check could not be verified. Try again.', 503);
	}
	return result.success === true;
}

export function bearer(request: Request) {
	const header = request.headers.get('authorization') || '';
	return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

export type Caller = { user: User; profile: Record<string, any>; token: string };

// Validates the user's Supabase Auth JWT with the Auth server, then loads their profile.
export async function requireCaller(db: SupabaseClient, request: Request): Promise<Caller> {
	const token = bearer(request);
	if (!token) throw new ApiError('Sign in to continue.', 401);
	const { data, error } = await db.auth.getUser(token);
	if (error || !data.user) throw new ApiError('Sign in again to continue.', 401);
	const { data: profile } = await db.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
	if (!profile) throw new ApiError('Sign in again to continue.', 401);
	if (profile.banned) throw new ApiError('This account is banned.', 403);
	return { user: data.user, profile, token };
}

export function publicProfile(row: Record<string, any>) {
	return {
		id: row.id, username: row.username, coins: row.coins, bgs: row.bgs, nameplates: row.nameplates,
		is_admin: row.is_admin, must_change_password: row.must_change_password
	};
}

export function sessionPayload(session: { access_token: string; refresh_token: string; expires_at?: number; expires_in?: number }) {
	return {
		access_token: session.access_token, refresh_token: session.refresh_token,
		expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600)
	};
}

export function randomPassword(length = 14) {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
	const limit = 256 - (256 % alphabet.length);
	let out = '';
	while (out.length < length) {
		for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
			if (byte < limit && out.length < length) out += alphabet[byte % alphabet.length];
		}
	}
	return out;
}
