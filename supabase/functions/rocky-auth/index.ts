import {
	admin, ApiError, clearLimit, clientIp, constantTimeEqual, EMAIL_DOMAIN, hasBlockedWord, isIpBanned,
	limitStatus, loadBlocked, logEvent, publicClient, publicProfile, randomPassword, requireCaller, respond, serve,
	sessionPayload, takeLimit, validateNewPassword, validateUsername, verifyCaptcha, MAX_COINS
} from '../_shared/common.ts';

const encoder = new TextEncoder();
const DAY = 86400;

function loginFailure() {
	return new ApiError('Wrong username or password.', 401);
}

function fromBase64Url(value: string) {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	return Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')), (char) => char.charCodeAt(0));
}

// The legacy table stored plaintext (or, briefly, PBKDF2) passwords. Used only to let old players
// claim their account once; nothing is ever returned to the browser.
async function legacyPasswordMatches(password: string, stored: unknown) {
	if (typeof stored !== 'string' || !stored) return false;
	if (!stored.startsWith('pbkdf2$')) return constantTimeEqual(password, stored);
	const [, iterationText, saltText, hashText] = stored.split('$');
	const iterations = Number(iterationText);
	if (!Number.isSafeInteger(iterations) || iterations < 100000 || iterations > 1000000 || !saltText || !hashText) return false;
	const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
	const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64Url(saltText), iterations }, key, 256));
	const expected = fromBase64Url(hashText);
	let difference = bits.length ^ expected.length;
	for (let i = 0; i < Math.min(bits.length, expected.length); i++) difference |= bits[i] ^ expected[i];
	return difference === 0;
}

async function emailFor(db: ReturnType<typeof admin>, profileId: string) {
	const { data, error } = await db.auth.admin.getUserById(profileId);
	if (error || !data.user?.email) return null;
	return data.user.email;
}

async function createPlayer(db: ReturnType<typeof admin>, username: string, password: string, extra: Record<string, unknown> = {}) {
	const { data, error } = await db.auth.admin.createUser({
		email: `${crypto.randomUUID()}@${EMAIL_DOMAIN}`, password, email_confirm: true
	});
	if (error || !data.user) {
		console.error('createUser failed:', error?.message);
		throw new ApiError('Could not create the account. Try again.', 500);
	}
	const { data: profile, error: profileError } = await db.from('profiles').insert({ id: data.user.id, username, ...extra }).select('*').single();
	if (profileError || !profile) {
		await db.auth.admin.deleteUser(data.user.id);
		if (profileError?.code === '23505') throw new ApiError('That username is already taken.', 409);
		console.error('profile insert failed:', profileError?.message);
		throw new ApiError('Could not create the account. Try again.', 500);
	}
	return { user: data.user, profile };
}

async function signInWith(email: string, password: string) {
	const { data, error } = await publicClient().auth.signInWithPassword({ email, password });
	if (error || !data.session) return null;
	return data.session;
}

async function signup(request: Request, body: Record<string, any>) {
	const db = admin();
	const ip = clientIp(request);
	if (!ip) throw new ApiError('Could not detect your network address, so an account cannot be created.', 400);
	if (await isIpBanned(db, ip)) {
		await logEvent(db, 'signup_blocked_ip', null, ip);
		throw new ApiError('This network is banned.', 403);
	}
	if (await takeLimit(db, 'signup-ip-hour', ip, 3, 3600) || await takeLimit(db, 'signup-ip-day', ip, 8, DAY)
		|| await takeLimit(db, 'signup-global-hour', 'all', 300, 3600)) {
		await logEvent(db, 'signup_rate_limited', null, ip);
		throw new ApiError('Too many accounts were created recently. Try again later.', 429);
	}
	// Hidden form field that humans never fill in.
	if (typeof body.website === 'string' && body.website !== '') {
		await logEvent(db, 'signup_honeypot', null, ip);
		throw new ApiError('Could not create the account.', 400);
	}
	let username: string;
	let password: string;
	try {
		username = validateUsername(body.username);
		password = validateNewPassword(body.password);
	} catch (error) {
		await logEvent(db, 'signup_invalid', typeof body.username === 'string' ? body.username : null, ip);
		throw error;
	}
	if (!(await verifyCaptcha(body.captcha, ip))) {
		await logEvent(db, 'signup_captcha_failed', username, ip);
		throw new ApiError('The human check failed. Try again.', 400);
	}
	const blocked = await loadBlocked(db);
	if (hasBlockedWord(username, blocked.words)) {
		await logEvent(db, 'signup_blocked_name', username, ip);
		throw new ApiError('This username is not allowed.', 400);
	}
	if (blocked.passwords.includes(password)) throw new ApiError('Choose a less common password.', 400);
	const { data: taken } = await db.from('profiles').select('id').eq('username_key', username.toLowerCase()).maybeSingle();
	if (taken) throw new ApiError('That username is already taken.', 409);

	const { user, profile } = await createPlayer(db, username, password, { last_ip: ip });
	const session = await signInWith(user.email!, password);
	if (!session) throw new ApiError('Account created, but sign-in failed. Try signing in.', 500);
	await logEvent(db, 'signup_ok', username, ip);
	return respond(request, { session: sessionPayload(session), profile: publicProfile(profile) });
}

async function claimLegacyAccount(db: ReturnType<typeof admin>, username: string, password: string, ip: string) {
	const { data: legacy } = await db.from('account').select('id,username,password,coins,bgs,nameplates').eq('username', username).maybeSingle();
	if (!legacy || /^(ip|config):/i.test(legacy.username) || legacy.bgs?.banned) return null;
	if (!(await legacyPasswordMatches(password, legacy.password))) return null;
	const { data: existing } = await db.from('profiles').select('id').eq('legacy_id', legacy.id).maybeSingle();
	if (existing) return null;

	const { data: items } = await db.from('shop_items').select('kind,id');
	const valid = (kind: string) => new Set((items ?? []).filter((item) => item.kind === kind).map((item) => item.id));
	const sanitize = (kind: string, fallback: string, source: any) => {
		const known = valid(kind);
		const owned = [...new Set([fallback, ...(Array.isArray(source?.owned) ? source.owned : []).filter((id: unknown) => typeof id === 'string' && known.has(id))])];
		return { owned, active: owned.includes(source?.active) ? source.active : fallback };
	};
	const bgs: Record<string, unknown> = sanitize('background', 'default', legacy.bgs);
	if (typeof legacy.bgs?.lastSpin === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(legacy.bgs.lastSpin)) bgs.lastSpin = legacy.bgs.lastSpin;
	const coins = Number.isSafeInteger(legacy.coins) ? Math.min(Math.max(legacy.coins, 0), MAX_COINS) : 0;

	// The old password was stored in plaintext, so the player must choose a new one right away.
	const temporary = randomPassword(24);
	const { user, profile } = await createPlayer(db, legacy.username.slice(0, 24), temporary, {
		coins, bgs, nameplates: sanitize('nameplate', 'classic', legacy.nameplates),
		legacy_id: legacy.id, must_change_password: true, last_ip: ip
	});
	const session = await signInWith(user.email!, temporary);
	if (!session) throw new ApiError('Could not finish moving your account. Try again.', 500);
	await logEvent(db, 'legacy_account_claimed', legacy.username, ip);
	return { session, profile };
}

async function login(request: Request, body: Record<string, any>) {
	const db = admin();
	const ip = clientIp(request);
	const username = typeof body.username === 'string' ? body.username.trim() : '';
	const password = typeof body.password === 'string' ? body.password : '';
	if (!username || username.length > 24 || !password || password.length > 256) throw loginFailure();

	if (ip && await isIpBanned(db, ip)) throw new ApiError('This network is banned.', 403);
	if (ip && await takeLimit(db, 'login-ip', ip, 30, 600)) {
		await logEvent(db, 'login_rate_limited_ip', username, ip);
		throw new ApiError('Too many attempts. Try again in 10 minutes.', 429);
	}
	const lockSubject = username.toLowerCase();
	if (await limitStatus(db, 'login-fail-user', lockSubject, 5, 900)) {
		await logEvent(db, 'login_locked', username, ip);
		throw new ApiError('Too many wrong passwords for this account. Try again in 15 minutes.', 429);
	}

	const fail = async (reason: string) => {
		await takeLimit(db, 'login-fail-user', lockSubject, 5, 900);
		await logEvent(db, 'login_failed', username, ip, { reason });
		return loginFailure();
	};

	const { data: profile } = await db.from('profiles').select('*').eq('username_key', lockSubject).maybeSingle();
	if (!profile) {
		const claimed = await claimLegacyAccount(db, username, password, ip);
		if (claimed) {
			await clearLimit(db, 'login-fail-user', lockSubject);
			return respond(request, { session: sessionPayload(claimed.session), profile: publicProfile(claimed.profile) });
		}
		// Spend similar time as a real attempt so usernames cannot be probed by timing.
		await signInWith(`${crypto.randomUUID()}@${EMAIL_DOMAIN}`, password);
		throw await fail('unknown');
	}
	const email = await emailFor(db, profile.id);
	const session = email ? await signInWith(email, password) : null;
	if (!session) throw await fail('password');
	if (profile.banned) throw new ApiError('This account is banned.', 403);

	await clearLimit(db, 'login-fail-user', lockSubject);
	if (ip) await db.from('profiles').update({ last_ip: ip }).eq('id', profile.id);
	return respond(request, { session: sessionPayload(session), profile: publicProfile(profile) });
}

async function changePassword(request: Request, body: Record<string, any>) {
	const db = admin();
	const caller = await requireCaller(db, request);
	const ip = clientIp(request);
	if (await takeLimit(db, 'change-password', caller.user.id, 10, 3600)) throw new ApiError('Too many attempts. Try again later.', 429);
	const newPassword = validateNewPassword(body.new_password);
	const current = typeof body.current_password === 'string' ? body.current_password : '';
	if (current === newPassword) throw new ApiError('Choose a password that is different from the current one.', 400);
	if ((await loadBlocked(db)).passwords.includes(newPassword)) throw new ApiError('Choose a less common password.', 400);

	// After an admin reset or legacy import every older session was revoked, so a live session on a
	// flagged account was created with the temporary credentials and may set a new password directly.
	if (caller.profile.must_change_password !== true) {
		if (!current || !(await signInWith(caller.user.email!, current))) {
			await logEvent(db, 'password_change_wrong_current', caller.profile.username, ip);
			throw new ApiError('Your current password is wrong.', 401);
		}
	}
	const { error } = await db.auth.admin.updateUserById(caller.user.id, { password: newPassword });
	if (error) throw new ApiError('Could not change the password.', 400);
	await db.from('profiles').update({ must_change_password: false }).eq('id', caller.user.id);
	await db.rpc('rocky_revoke_sessions', { p_user: caller.user.id });
	const session = await signInWith(caller.user.email!, newPassword);
	if (!session) throw new ApiError('Password changed. Sign in again.', 200);
	await logEvent(db, 'password_changed', caller.profile.username, ip);
	return respond(request, { session: sessionPayload(session), profile: publicProfile({ ...caller.profile, must_change_password: false }) });
}

async function changeUsername(request: Request, body: Record<string, any>) {
	const db = admin();
	const caller = await requireCaller(db, request);
	const ip = clientIp(request);
	if (caller.profile.must_change_password) throw new ApiError('Change your password first.', 403);
	if (await takeLimit(db, 'rename', caller.user.id, 5, DAY)) throw new ApiError('You changed your username too many times today.', 429);
	const username = validateUsername(body.username);
	if (!(await signInWith(caller.user.email!, typeof body.password === 'string' ? body.password : ''))) {
		await logEvent(db, 'rename_wrong_password', caller.profile.username, ip);
		throw new ApiError('Wrong password.', 401);
	}
	if (hasBlockedWord(username, (await loadBlocked(db)).words)) {
		await logEvent(db, 'rename_blocked_name', caller.profile.username, ip, { attempted: username });
		throw new ApiError('This username is not allowed.', 400);
	}
	const { data, error } = await db.from('profiles').update({ username }).eq('id', caller.user.id).select('*').single();
	if (error?.code === '23505') throw new ApiError('That username is already taken.', 409);
	if (error || !data) throw new ApiError('Could not change the username.', 500);
	return respond(request, { profile: publicProfile(data) });
}

serve(async (request, body) => {
	switch (String(body.action || '')) {
		case 'signup': return await signup(request, body);
		case 'login': return await login(request, body);
		case 'change-password': return await changePassword(request, body);
		case 'change-username': return await changeUsername(request, body);
		case 'ip-check': {
			const db = admin();
			return respond(request, { banned: await isIpBanned(db, clientIp(request)) });
		}
		default: throw new ApiError('Unknown action.', 404);
	}
});
