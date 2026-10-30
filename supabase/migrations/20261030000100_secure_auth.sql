-- Rocky Games secure accounts.
-- Additive migration: it does not alter, drop or truncate public.account or public.account_v2.
-- Passwords live only in Supabase Auth (auth.users). Players never touch these tables directly:
-- reads happen through RLS (own row only) or SECURITY DEFINER functions, writes only through
-- validated functions or Edge Functions that use the service role.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	username text not null,
	username_key text generated always as (lower(username)) stored,
	coins bigint not null default 0 check (coins >= 0 and coins <= 2000000000),
	bgs jsonb not null default '{"owned":["default"],"active":"default"}'::jsonb,
	nameplates jsonb not null default '{"owned":["classic"],"active":"classic"}'::jsonb,
	is_admin boolean not null default false,
	banned boolean not null default false,
	ban_reason text,
	must_change_password boolean not null default false,
	last_ip text,
	legacy_id bigint unique,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint profiles_username_shape check (
		char_length(username) between 1 and 24
		and username !~ '[[:cntrl:]]'
		and username !~* '^(ip|config):'
	)
);

create unique index if not exists profiles_username_key_idx on public.profiles (username_key);
create index if not exists profiles_coins_idx on public.profiles (coins desc) where not banned;

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant all on public.profiles to service_role;

-- A signed-in player may read only their own row, and only these columns. No write grants exist.
grant select (id, username, coins, bgs, nameplates, is_admin, must_change_password, banned, created_at)
	on public.profiles to authenticated;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());

-- Defense in depth: even if a write grant were added by mistake, browser roles cannot change
-- or delete profiles. SECURITY DEFINER functions and the service role run as other roles.
create or replace function public.rocky_profiles_guard()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
	if current_user in ('anon', 'authenticated') then
		raise exception 'profiles cannot be modified directly' using errcode = '42501';
	end if;
	if tg_op = 'DELETE' then return old; end if;
	new.updated_at := now();
	return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update or delete on public.profiles
	for each row execute function public.rocky_profiles_guard();

-- ---------------------------------------------------------------- catalog
create table if not exists public.shop_items (
	kind text not null check (kind in ('background', 'nameplate')),
	id text not null,
	price integer not null check (price >= 0),
	primary key (kind, id)
);
alter table public.shop_items enable row level security;
revoke all on public.shop_items from public, anon, authenticated;
grant all on public.shop_items to service_role;

insert into public.shop_items (kind, id, price) values
	('nameplate', 'classic', 0), ('nameplate', 'pixel-gold', 100), ('nameplate', 'bubblegum', 150),
	('nameplate', 'arcade-neon', 200), ('nameplate', 'royal', 250), ('nameplate', 'pixel-arcade', 300),
	('nameplate', 'frost', 350), ('nameplate', 'comic-pop', 400), ('nameplate', 'mint-leaf', 450),
	('nameplate', 'cosmic-orbit', 500), ('nameplate', 'ruby-crown', 600), ('nameplate', 'electric-lime', 700),
	('nameplate', 'ocean-wave', 800), ('nameplate', 'royal-scroll', 900), ('nameplate', 'prism', 1000),
	('background', 'default', 0), ('background', 'sunset', 50), ('background', 'ocean', 75),
	('background', 'meadow', 100), ('background', 'lavender', 125), ('background', 'midnight', 150),
	('background', 'berry', 175), ('background', 'citrus', 200), ('background', 'forest', 225),
	('background', 'starlight', 250), ('background', 'aurora', 275), ('background', 'ember', 300),
	('background', 'desert', 325), ('background', 'coral', 350), ('background', 'blossom', 375),
	('background', 'vaporwave', 400), ('background', 'alpine', 425), ('background', 'deep-space', 450),
	('background', 'monochrome', 475), ('background', 'golden-hour', 500), ('background', 'rainbow-cascade', 525),
	('background', 'mossy-grove', 550), ('background', 'glacier', 575), ('background', 'lavender-fields', 600),
	('background', 'volcanic', 625), ('background', 'candy-clouds', 650), ('background', 'bamboo', 675),
	('background', 'starry-night', 700), ('background', 'tropical', 725), ('background', 'blueprint', 750)
on conflict (kind, id) do update set price = excluded.price;

-- ---------------------------------------------------------------- admin config, bans, logs
create table if not exists public.rocky_config (
	key text primary key,
	value jsonb not null default '{}'::jsonb,
	updated_at timestamptz not null default now()
);
alter table public.rocky_config enable row level security;
revoke all on public.rocky_config from public, anon, authenticated;
grant all on public.rocky_config to service_role;

create table if not exists public.ip_bans (
	ip text primary key check (ip ~ '^[0-9a-fA-F:.]{3,45}$'),
	reason text,
	created_by uuid references auth.users (id) on delete set null,
	created_at timestamptz not null default now()
);
alter table public.ip_bans enable row level security;
revoke all on public.ip_bans from public, anon, authenticated;
grant all on public.ip_bans to service_role;

create table if not exists public.security_events (
	id bigint generated always as identity primary key,
	created_at timestamptz not null default now(),
	event text not null,
	username text,
	ip text,
	detail jsonb not null default '{}'::jsonb
);
create index if not exists security_events_created_idx on public.security_events (created_at desc);
create index if not exists security_events_event_idx on public.security_events (event, created_at desc);
alter table public.security_events enable row level security;
revoke all on public.security_events from public, anon, authenticated;
grant all on public.security_events to service_role;
grant usage, select on sequence public.security_events_id_seq to service_role;

create table if not exists public.admin_audit_log (
	id bigint generated always as identity primary key,
	created_at timestamptz not null default now(),
	actor_id uuid,
	actor_name text,
	action text not null,
	target_id uuid,
	target_name text,
	detail jsonb not null default '{}'::jsonb
);
create index if not exists admin_audit_created_idx on public.admin_audit_log (created_at desc);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from public, anon, authenticated;
grant select, insert on public.admin_audit_log to service_role;
grant usage, select on sequence public.admin_audit_log_id_seq to service_role;

create or replace function public.rocky_audit_immutable()
returns trigger
language plpgsql
as $$
begin
	raise exception 'the audit log is append-only' using errcode = '42501';
end;
$$;
drop trigger if exists admin_audit_immutable on public.admin_audit_log;
create trigger admin_audit_immutable before update or delete on public.admin_audit_log
	for each row execute function public.rocky_audit_immutable();

-- ---------------------------------------------------------------- rate limits
create table if not exists public.rocky_rate_limits (
	key text primary key,
	window_started_at timestamptz not null default now(),
	request_count integer not null default 0
);
alter table public.rocky_rate_limits enable row level security;
revoke all on public.rocky_rate_limits from public, anon, authenticated;
grant all on public.rocky_rate_limits to service_role;

create or replace function public.rocky_take_rate_limit(p_key text, p_max_requests integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
	is_limited boolean;
begin
	insert into public.rocky_rate_limits (key, window_started_at, request_count)
	values (p_key, now(), 1)
	on conflict (key) do update set
		window_started_at = case
			when rocky_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
			else rocky_rate_limits.window_started_at
		end,
		request_count = case
			when rocky_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
			else rocky_rate_limits.request_count + 1
		end;

	select request_count > p_max_requests into is_limited from public.rocky_rate_limits where key = p_key;
	return is_limited;
end;
$$;

-- Read-only check, used for login lockouts that only count failures.
create or replace function public.rocky_rate_limit_status(p_key text, p_max_requests integer, p_window_seconds integer)
returns boolean
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
	select coalesce((
		select request_count >= p_max_requests
			and window_started_at > now() - make_interval(secs => p_window_seconds)
		from public.rocky_rate_limits where key = p_key
	), false);
$$;

create or replace function public.rocky_clear_rate_limit(p_key text)
returns void
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
	delete from public.rocky_rate_limits where key = p_key;
$$;

-- Deletes every session of a user so a reset or ban takes effect immediately.
create or replace function public.rocky_revoke_sessions(p_user uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
	delete from auth.sessions where user_id = p_user;
$$;

-- Housekeeping for old limiter rows and events.
create or replace function public.rocky_prune()
returns void
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
	delete from public.rocky_rate_limits where window_started_at < now() - interval '2 days';
	delete from public.security_events where created_at < now() - interval '90 days';
$$;

revoke all on function public.rocky_take_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.rocky_rate_limit_status(text, integer, integer) from public, anon, authenticated;
revoke all on function public.rocky_clear_rate_limit(text) from public, anon, authenticated;
revoke all on function public.rocky_revoke_sessions(uuid) from public, anon, authenticated;
revoke all on function public.rocky_prune() from public, anon, authenticated;
grant execute on function public.rocky_take_rate_limit(text, integer, integer) to service_role;
grant execute on function public.rocky_rate_limit_status(text, integer, integer) to service_role;
grant execute on function public.rocky_clear_rate_limit(text) to service_role;
grant execute on function public.rocky_revoke_sessions(uuid) to service_role;
grant execute on function public.rocky_prune() to service_role;

-- ---------------------------------------------------------------- player-facing functions
create or replace function public.get_leaderboard()
returns table (username text, coins bigint, nameplates jsonb)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
	select p.username, p.coins, jsonb_build_object('active', p.nameplates->>'active')
	from public.profiles p
	where not p.banned
	order by p.coins desc, p.created_at asc
	limit 100;
$$;
revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to anon, authenticated, service_role;

create or replace function public.rocky_me()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
	select jsonb_build_object(
		'id', p.id, 'username', p.username, 'coins', p.coins, 'bgs', p.bgs, 'nameplates', p.nameplates,
		'is_admin', p.is_admin, 'banned', p.banned, 'must_change_password', p.must_change_password
	)
	from public.profiles p where p.id = auth.uid();
$$;
revoke all on function public.rocky_me() from public, anon;
grant execute on function public.rocky_me() to authenticated;

-- Saves the caller's own wallet. The server, not the browser, decides what is acceptable:
--  * only catalog items can be owned, and the active item must be owned
--  * owned items are never removed
--  * coins cannot grow faster than game rewards and wagers (at most 7x) allow
--  * every newly owned item must be paid for out of the balance
--  * banned accounts and accounts that must change their password are rejected
create or replace function public.rocky_sync_state(p_coins bigint, p_bgs jsonb, p_nameplates jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
	uid uuid := auth.uid();
	me public.profiles%rowtype;
	new_bgs text[];
	new_plates text[];
	added_cost bigint;
	allowed_gain bigint;
	next_spin text;
	bg_active text;
	plate_active text;
begin
	if uid is null then
		raise exception 'sign in required' using errcode = '28000';
	end if;
	if public.rocky_take_rate_limit('sync:' || uid::text, 900, 3600) then
		raise exception 'too many saves, slow down' using errcode = '54000';
	end if;

	select * into me from public.profiles where id = uid for update;
	if not found then raise exception 'account not found' using errcode = '28000'; end if;
	if me.banned then raise exception 'account banned' using errcode = '42501'; end if;
	if me.must_change_password then raise exception 'password change required' using errcode = '42501'; end if;

	if p_coins is null or p_coins < 0 or p_coins > 2000000000 then
		raise exception 'invalid coin balance' using errcode = '22023';
	end if;
	if jsonb_typeof(p_bgs->'owned') is distinct from 'array' or jsonb_typeof(p_nameplates->'owned') is distinct from 'array' then
		raise exception 'invalid inventory' using errcode = '22023';
	end if;
	if jsonb_array_length(p_bgs->'owned') > 100 or jsonb_array_length(p_nameplates->'owned') > 100 then
		raise exception 'invalid inventory' using errcode = '22023';
	end if;

	select coalesce(array_agg(distinct v), '{}') into new_bgs
		from jsonb_array_elements_text(p_bgs->'owned') v;
	select coalesce(array_agg(distinct v), '{}') into new_plates
		from jsonb_array_elements_text(p_nameplates->'owned') v;
	new_bgs := array(select distinct x from unnest(new_bgs || array['default']) x);
	new_plates := array(select distinct x from unnest(new_plates || array['classic']) x);

	if exists (select 1 from unnest(new_bgs) x where not exists (select 1 from public.shop_items s where s.kind = 'background' and s.id = x))
		or exists (select 1 from unnest(new_plates) x where not exists (select 1 from public.shop_items s where s.kind = 'nameplate' and s.id = x)) then
		raise exception 'unknown shop item' using errcode = '22023';
	end if;

	-- keep everything already owned
	new_bgs := array(select distinct x from unnest(new_bgs || array(select jsonb_array_elements_text(me.bgs->'owned'))) x);
	new_plates := array(select distinct x from unnest(new_plates || array(select jsonb_array_elements_text(me.nameplates->'owned'))) x);

	select coalesce(sum(s.price), 0) into added_cost from public.shop_items s
		where (s.kind = 'background' and s.id = any (new_bgs) and not (s.id in (select jsonb_array_elements_text(me.bgs->'owned'))))
		or (s.kind = 'nameplate' and s.id = any (new_plates) and not (s.id in (select jsonb_array_elements_text(me.nameplates->'owned'))));

	allowed_gain := me.coins * 7 + 100;
	if p_coins > me.coins + allowed_gain - added_cost then
		insert into public.security_events (event, username, detail)
			values ('coin_sync_rejected', me.username, jsonb_build_object('old', me.coins, 'requested', p_coins, 'cost', added_cost));
		raise exception 'coin balance rejected' using errcode = '22023';
	end if;

	bg_active := coalesce(p_bgs->>'active', 'default');
	plate_active := coalesce(p_nameplates->>'active', 'classic');
	if not (bg_active = any (new_bgs)) or not (plate_active = any (new_plates)) then
		raise exception 'active item is not owned' using errcode = '22023';
	end if;

	next_spin := p_bgs->>'lastSpin';
	if next_spin is not null and next_spin !~ '^\d{4}-\d{2}-\d{2}$' then
		next_spin := null;
	end if;
	-- an earlier spin date cannot be restored to spin again the same day
	if next_spin is not null and me.bgs->>'lastSpin' is not null and next_spin < me.bgs->>'lastSpin' then
		next_spin := me.bgs->>'lastSpin';
	end if;

	update public.profiles set
		coins = p_coins,
		bgs = jsonb_build_object('owned', to_jsonb(new_bgs), 'active', bg_active, 'lastSpin', next_spin),
		nameplates = jsonb_build_object('owned', to_jsonb(new_plates), 'active', plate_active)
	where id = uid;

	return public.rocky_me();
end;
$$;
revoke all on function public.rocky_sync_state(bigint, jsonb, jsonb) from public, anon;
grant execute on function public.rocky_sync_state(bigint, jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------- legacy import (read-only)
-- Copies settings from the old table without modifying it. Safe to re-run.
do $$
begin
	if to_regclass('public.account') is not null then
		insert into public.ip_bans (ip, reason)
			select substr(username, 4), 'imported from legacy account table'
			from public.account
			where username like 'ip:%' and substr(username, 4) ~ '^[0-9a-fA-F:.]{3,45}$'
			on conflict do nothing;

		insert into public.rocky_config (key, value)
			select 'blocked', jsonb_build_object(
				'words', coalesce(bgs->'words', '[]'::jsonb),
				'passwords', coalesce(bgs->'passwords', '[]'::jsonb),
				'coins', coalesce(bgs->'coins', '[]'::jsonb))
			from public.account where username = 'config:blocked-words'
			on conflict do nothing;
	end if;
end $$;

grant select on public.account to service_role;
