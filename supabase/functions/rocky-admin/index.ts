import {
	admin, ApiError, audit, clientIp, hasBlockedWord, loadBlocked, MAX_COINS, normalizeName, randomPassword, requireCaller,
	respond, serve, takeLimit, validateUsername, type Caller
} from '../_shared/common.ts';

type Db = ReturnType<typeof admin>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACCOUNT_COLUMNS = 'id,username,coins,banned,ban_reason,is_admin,must_change_password,last_ip,created_at';
const BATCH_LIMIT = 500;

function requireId(value: unknown) {
	if (typeof value !== 'string' || !uuid.test(value)) throw new ApiError('Invalid account.', 400);
	return value;
}

async function target(db: Db, id: unknown) {
	const { data } = await db.from('profiles').select('*').eq('id', requireId(id)).maybeSingle();
	if (!data) throw new ApiError('That account does not exist.', 404);
	return data;
}

function actor(caller: Caller) {
	return { id: caller.user.id, username: caller.profile.username };
}

async function removeAccounts(db: Db, caller: Caller, rows: Record<string, any>[], mode: 'delete' | 'ban', action: string, detail: Record<string, unknown>) {
	const eligible = rows.filter((row) => !row.is_admin && row.id !== caller.user.id).slice(0, BATCH_LIMIT);
	await audit(db, actor(caller), action, null, { ...detail, mode, count: eligible.length, usernames: eligible.slice(0, 50).map((row) => row.username) });
	for (const row of eligible) {
		if (mode === 'delete') await db.auth.admin.deleteUser(row.id);
		else {
			await db.from('profiles').update({ banned: true, coins: 0, ban_reason: 'banned by admin' }).eq('id', row.id);
			await db.rpc('rocky_revoke_sessions', { p_user: row.id });
		}
	}
	return eligible.length;
}

const handlers: Record<string, (db: Db, caller: Caller, body: Record<string, any>, request: Request) => Promise<unknown>> = {
	async list(db, _caller, body) {
		const offset = Math.max(0, Math.floor(Number(body.offset) || 0));
		const limit = Math.min(1000, Math.max(1, Math.floor(Number(body.limit) || 1000)));
		const { data, error } = await db.from('profiles').select(ACCOUNT_COLUMNS).order('coins', { ascending: false }).order('created_at').range(offset, offset + limit - 1);
		if (error) throw error;
		return { accounts: data };
	},

	async 'set-coins'(db, caller, body) {
		const row = await target(db, body.id);
		const coins = Number(body.coins);
		if (!Number.isSafeInteger(coins) || coins < 0 || coins > MAX_COINS) throw new ApiError('Coins must be a whole number from 0 to 2,000,000,000.');
		await audit(db, actor(caller), 'set-coins', row, { from: row.coins, to: coins });
		await db.from('profiles').update({ coins }).eq('id', row.id);
		return { ok: true };
	},

	async rename(db, caller, body) {
		const row = await target(db, body.id);
		const username = validateUsername(body.username);
		await audit(db, actor(caller), 'rename', row, { from: row.username, to: username });
		const { error } = await db.from('profiles').update({ username }).eq('id', row.id);
		if (error?.code === '23505') throw new ApiError('That username is already taken.', 409);
		if (error) throw error;
		return { ok: true };
	},

	async delete(db, caller, body) {
		const row = await target(db, body.id);
		if (row.is_admin) throw new ApiError('Administrator accounts cannot be deleted here.', 403);
		if (row.id === caller.user.id) throw new ApiError('You cannot delete your own account here.', 403);
		await audit(db, actor(caller), 'delete-account', row, { coins: row.coins });
		const { error } = await db.auth.admin.deleteUser(row.id);
		if (error) throw new ApiError('Could not delete the account.', 500);
		return { ok: true };
	},

	async ban(db, caller, body) {
		const row = await target(db, body.id);
		if (row.is_admin) throw new ApiError('Administrator accounts cannot be banned here.', 403);
		await audit(db, actor(caller), 'ban', row, { reason: String(body.reason || '').slice(0, 100) });
		await db.from('profiles').update({ banned: true, coins: 0, ban_reason: String(body.reason || 'banned by admin').slice(0, 100) }).eq('id', row.id);
		await db.rpc('rocky_revoke_sessions', { p_user: row.id });
		return { ok: true };
	},

	async unban(db, caller, body) {
		const row = await target(db, body.id);
		await audit(db, actor(caller), 'unban', row);
		await db.from('profiles').update({ banned: false, ban_reason: null }).eq('id', row.id);
		return { ok: true };
	},

	async 'reset-password'(db, caller, body, request) {
		const row = await target(db, body.id);
		if (row.is_admin) throw new ApiError('Administrator passwords cannot be reset by another admin.', 403);
		if (row.banned) throw new ApiError('This account is banned.', 403);
		if (await takeLimit(db, 'admin-reset', caller.user.id, 10, 3600)) throw new ApiError('Too many password resets this hour.', 429);
		if (await takeLimit(db, 'admin-reset-target', row.id, 3, 86400)) throw new ApiError('This account was reset too many times today.', 429);
		const temporary = randomPassword(14);
		// Record first: the reset is refused if the audit entry cannot be written.
		await audit(db, actor(caller), 'reset-password', row, { ip: clientIp(request) });
		const { error } = await db.auth.admin.updateUserById(row.id, { password: temporary });
		if (error) throw new ApiError('Could not reset the password.', 500);
		await db.from('profiles').update({ must_change_password: true }).eq('id', row.id);
		await db.rpc('rocky_revoke_sessions', { p_user: row.id });
		return { temporary_password: temporary, username: row.username };
	},

	async 'bulk-by-name'(db, caller, body) {
		const text = String(body.contains || '').trim().toLowerCase();
		if (text.length < 2 || text.length > 24) throw new ApiError('Enter 2-24 characters.');
		const mode = body.mode === 'ban' ? 'ban' : 'delete';
		const { data } = await db.from('profiles').select(ACCOUNT_COLUMNS).ilike('username', `%${text.replace(/[\\%_]/g, '\\$&')}%`).limit(BATCH_LIMIT);
		const rows = (data ?? []).filter((row) => !row.is_admin && row.id !== caller.user.id);
		if (body.dry_run !== false) return { matches: rows.map((row) => ({ id: row.id, username: row.username })) };
		return { affected: await removeAccounts(db, caller, rows, mode, 'bulk-by-name', { contains: text }) };
	},

	async 'bot-cleanup'(db, caller, body) {
		const hours = Math.max(0, Math.min(8760, Number(body.hours) || 0));
		let query = db.from('profiles').select(ACCOUNT_COLUMNS).is('last_ip', null).eq('coins', 0).eq('banned', false).eq('is_admin', false).limit(BATCH_LIMIT);
		if (hours > 0) query = query.gte('created_at', new Date(Date.now() - hours * 3600000).toISOString());
		const { data } = await query;
		const rows = data ?? [];
		if (body.dry_run !== false) return { matches: rows.map((row) => ({ id: row.id, username: row.username })) };
		return { affected: await removeAccounts(db, caller, rows, 'delete', 'bot-cleanup', { hours }) };
	},

	async 'get-config'(db) {
		return { config: await loadBlocked(db) };
	},

	async 'save-config'(db, caller, body) {
		const words = [...new Set((Array.isArray(body.words) ? body.words : []).map((word: unknown) => String(word).trim().slice(0, 40)).filter((word: string) => normalizeName(word).length >= 2))].slice(0, 500);
		const passwords = [...new Set((Array.isArray(body.passwords) ? body.passwords : []).map((word: unknown) => String(word).slice(0, 72)).filter((word: string) => word.trim()))].slice(0, 500);
		const coins = [...new Set((Array.isArray(body.coins) ? body.coins : []).map(Number).filter((value: number) => Number.isSafeInteger(value) && value >= 0))].slice(0, 500);
		await audit(db, actor(caller), 'save-config', null, { words: words.length, passwords: passwords.length, coins: coins.length });
		const { error } = await db.from('rocky_config').upsert({ key: 'blocked', value: { words, passwords, coins }, updated_at: new Date().toISOString() });
		if (error) throw error;
		return { words: words.length, passwords: passwords.length, coins: coins.length };
	},

	async 'scan-config'(db, caller, body) {
		const blocked = await loadBlocked(db);
		const { data } = await db.from('profiles').select(ACCOUNT_COLUMNS).eq('banned', false).eq('is_admin', false).limit(10000);
		const rows = (data ?? []).filter((row) => hasBlockedWord(row.username, blocked.words) || blocked.coins.includes(Number(row.coins)));
		if (body.dry_run !== false) return { matches: rows.map((row) => ({ id: row.id, username: row.username })) };
		return { affected: await removeAccounts(db, caller, rows, 'ban', 'scan-config', {}) };
	},

	async 'ban-ip'(db, caller, body, request) {
		const ip = String(body.ip || '').trim();
		if (!/^[0-9a-fA-F:.]{3,45}$/.test(ip)) throw new ApiError('That does not look like an IP address.');
		if (ip === clientIp(request)) throw new ApiError('You cannot ban your own network address.');
		await audit(db, actor(caller), 'ban-ip', null, { ip });
		const { error } = await db.from('ip_bans').upsert({ ip, reason: String(body.reason || '').slice(0, 100) || null, created_by: caller.user.id });
		if (error) throw error;
		return { ok: true };
	},

	async 'unban-ip'(db, caller, body) {
		const ip = String(body.ip || '').trim();
		await audit(db, actor(caller), 'unban-ip', null, { ip });
		await db.from('ip_bans').delete().eq('ip', ip);
		return { ok: true };
	},

	async 'list-ip-bans'(db) {
		const { data } = await db.from('ip_bans').select('ip,reason,created_at').order('created_at', { ascending: false }).limit(1000);
		return { bans: data ?? [] };
	},

	// Abuse monitoring: recent events plus counts for the last hour and day.
	async events(db) {
		const { data } = await db.from('security_events').select('id,created_at,event,username,ip,detail').order('id', { ascending: false }).limit(200);
		const since = (ms: number) => new Date(Date.now() - ms).toISOString();
		const counts: Record<string, { hour: number; day: number }> = {};
		const { data: recent } = await db.from('security_events').select('event,created_at').gte('created_at', since(86400000)).limit(10000);
		for (const row of recent ?? []) {
			const entry = counts[row.event] ??= { hour: 0, day: 0 };
			entry.day++;
			if (row.created_at >= since(3600000)) entry.hour++;
		}
		return { events: data ?? [], counts };
	},

	async audit(db) {
		const { data } = await db.from('admin_audit_log').select('id,created_at,actor_name,action,target_name,detail').order('id', { ascending: false }).limit(200);
		return { entries: data ?? [] };
	}
};

serve(async (request, body) => {
	const db = admin();
	const caller = await requireCaller(db, request);
	if (caller.profile.is_admin !== true) {
		console.warn('non-admin attempted an admin action:', caller.profile.username);
		throw new ApiError('Administrator access required.', 403);
	}
	if (caller.profile.must_change_password) throw new ApiError('Change your password first.', 403);
	if (await takeLimit(db, 'admin-request', caller.user.id, 240, 60)) throw new ApiError('Slow down.', 429);
	const handler = Object.hasOwn(handlers, String(body.action)) ? handlers[String(body.action)] : null;
	if (!handler) throw new ApiError('Unknown action.', 404);
	return respond(request, await handler(db, caller, body, request));
});
