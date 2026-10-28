-- Rocky Games: secure accounts with Row Level Security.
-- Paste this whole file into the Supabase SQL Editor and run it once.
--
-- STEP 1: replace PUT-YOUR-ADMIN-PASSWORD-HERE (keep the quotes) with a long admin password.
-- This is the password you will type on admin.html. Do not reuse your access code.
-- To change it later, run only the statement below with a new password.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.rocky_settings (key text primary key, value jsonb not null);

insert into public.rocky_settings (key, value)
values ('admin_hash', to_jsonb(extensions.crypt('ROCKYLITC1378', extensions.gen_salt('bf'))))
on conflict (key) do update set value = excluded.value;

do $$
begin
  if extensions.crypt('PUT-YOUR-ADMIN-PASSWORD-HERE', (select value #>> '{}' from public.rocky_settings where key = 'admin_hash'))
     = (select value #>> '{}' from public.rocky_settings where key = 'admin_hash') then
    raise exception 'Edit the first statement and replace PUT-YOUR-ADMIN-PASSWORD-HERE with your own admin password, then run again.';
  end if;
end $$;

-- STEP 2: everything below can run unchanged.

create table if not exists public.rocky_prices (kind text not null, item_id text not null, price int not null, primary key (kind, item_id));
delete from public.rocky_prices;
insert into public.rocky_prices (kind, item_id, price) values
('background','default',0),
('background','sunset',50),
('background','ocean',75),
('background','meadow',100),
('background','lavender',125),
('background','midnight',150),
('background','berry',175),
('background','citrus',200),
('background','forest',225),
('background','starlight',250),
('background','aurora',275),
('background','ember',300),
('background','desert',325),
('background','coral',350),
('background','blossom',375),
('background','vaporwave',400),
('background','alpine',425),
('background','deep-space',450),
('background','monochrome',475),
('background','golden-hour',500),
('background','rainbow-cascade',525),
('background','mossy-grove',550),
('background','glacier',575),
('background','lavender-fields',600),
('background','volcanic',625),
('background','candy-clouds',650),
('background','bamboo',675),
('background','starry-night',700),
('background','tropical',725),
('background','blueprint',750),
('nameplate','classic',0),
('nameplate','pixel-gold',100),
('nameplate','bubblegum',150),
('nameplate','arcade-neon',200),
('nameplate','royal',250),
('nameplate','pixel-arcade',300),
('nameplate','frost',350),
('nameplate','comic-pop',400),
('nameplate','mint-leaf',450),
('nameplate','cosmic-orbit',500),
('nameplate','ruby-crown',600),
('nameplate','electric-lime',700),
('nameplate','ocean-wave',800),
('nameplate','royal-scroll',900),
('nameplate','prism',1000);

alter table public.account alter column bgs type jsonb using bgs::jsonb;
alter table public.account alter column nameplates type jsonb using nameplates::jsonb;
alter table public.account add column if not exists token text;
alter table public.account add column if not exists fails int not null default 0;
alter table public.account add column if not exists locked_until timestamptz;
alter table public.account add column if not exists gain_budget numeric not null default 300;
alter table public.account add column if not exists last_save timestamptz not null default now();

insert into public.rocky_settings (key, value)
select 'blocked_words', coalesce(bgs -> 'words', '[]'::jsonb) from public.account where username = 'config:blocked-words'
on conflict (key) do nothing;
insert into public.rocky_settings (key, value) values ('blocked_words', '[]'::jsonb), ('blocked_passwords', '[]'::jsonb), ('blocked_coins', '[]'::jsonb) on conflict (key) do nothing;
delete from public.account where username = 'config:blocked-words';

update public.account set password = extensions.crypt(password, extensions.gen_salt('bf')) where password !~ '^\$2[aby]\$';
create unique index if not exists account_username_key on public.account (username);

create schema if not exists rocky_private;
revoke all on schema rocky_private from public, anon, authenticated;

create or replace function rocky_private.norm(t text) returns text language sql immutable as $$
  select regexp_replace(translate(lower(coalesce(t, '')), '013457@$!', 'oieastasi'), '[^a-z]', '', 'g')
$$;

create or replace function rocky_private.has_blocked(name text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from rocky_settings s, jsonb_array_elements_text(s.value) w
    where s.key = 'blocked_words' and length(rocky_private.norm(w)) >= 2
      and position(rocky_private.norm(w) in rocky_private.norm(name)) > 0
  )
$$;

create or replace function rocky_private.pw_blocked(p text) returns boolean language sql stable security definer set search_path = public as $$
  select p is not null and exists (
    select 1 from rocky_settings s, jsonb_array_elements_text(s.value) w
    where s.key = 'blocked_passwords' and lower(w) = lower(p)
  )
$$;

create or replace function rocky_private.coins_blocked(c bigint) returns boolean language sql stable security definer set search_path = public as $$
  select c is not null and exists (
    select 1 from rocky_settings s, jsonb_array_elements_text(s.value) w
    where s.key = 'blocked_coins' and w ~ '^[0-9]{1,10}$' and w::bigint = c
  )
$$;

create or replace function rocky_private.client_ip() returns text language plpgsql stable as $$
declare h json; v text;
begin
  begin h := current_setting('request.headers', true)::json; exception when others then return null; end;
  if h is null then return null; end if;
  v := nullif(trim(coalesce(h ->> 'cf-connecting-ip', split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1))), '');
  return left(v, 45);
end $$;

create or replace function rocky_private.ip_banned(p_ip text) returns boolean language sql stable security definer set search_path = public as $$
  select p_ip is not null and exists (select 1 from account where username = 'ip:' || p_ip)
$$;

create or replace function rocky_private.is_banned(a public.account) returns boolean language sql immutable as $$
  select coalesce(a.bgs ->> 'banned', '') = 'true'
$$;

create or replace function rocky_private.row_json(a public.account) returns json language sql immutable as $$
  select json_build_object('id', a.id, 'username', a.username, 'coins', a.coins, 'bgs', a.bgs, 'nameplates', a.nameplates)
$$;

create or replace function rocky_private.ban(p_id bigint, p_reason text) returns void language sql security definer set search_path = public, extensions as $$
  update account set coins = 0, password = crypt(encode(gen_random_bytes(18), 'hex'), gen_salt('bf')),
    bgs = coalesce(bgs, '{}'::jsonb) || jsonb_build_object('banned', true, 'reason', p_reason)
  where id = p_id
$$;

create or replace function rocky_private.valid_name(p_name text) returns text language sql immutable as $$
  select case
    when p_name is null or length(p_name) < 1 or length(p_name) > 24 then 'Username must be 1-24 characters.'
    when lower(p_name) like 'ip:%' or lower(p_name) like 'config:%' then 'That username is not allowed.'
    else null end
$$;

create or replace function rocky_private.owned_list(k text, arr jsonb, base text) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(item_id order by item_id), '[]'::jsonb) from rocky_prices
  where kind = k and (item_id = base or item_id in (select jsonb_array_elements_text(case when jsonb_typeof(arr) = 'array' then arr else '[]'::jsonb end)))
$$;

create or replace function rocky_private.admin_ok(p_pass text) returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare f jsonb; hash text; n int;
begin
  select value into f from rocky_settings where key = 'admin_fail';
  if f is not null and (f ->> 'until')::numeric > extract(epoch from now()) then return false; end if;
  select value #>> '{}' into hash from rocky_settings where key = 'admin_hash';
  if hash is not null and p_pass is not null and crypt(p_pass, hash) = hash then
    delete from rocky_settings where key = 'admin_fail';
    return true;
  end if;
  n := coalesce((f ->> 'n')::int, 0) + 1;
  insert into rocky_settings (key, value) values ('admin_fail', jsonb_build_object('n', case when n >= 10 then 0 else n end, 'until', case when n >= 10 then extract(epoch from now()) + 300 else 0 end))
  on conflict (key) do update set value = excluded.value;
  return false;
end $$;

-- Public functions (callable by the website) ---------------------------------

create or replace function public.rocky_ip_banned() returns boolean language sql stable security definer set search_path = public as $$
  select rocky_private.ip_banned(rocky_private.client_ip())
$$;

create or replace function public.rocky_leaderboard() returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(t), '[]'::json) from (
    select username, coins, nameplates ->> 'active' as plate from account
    where username not like 'ip:%' and coalesce(bgs ->> 'banned', '') <> 'true'
    order by coins desc, id limit 100
  ) t
$$;

create or replace function public.rocky_create(p_username text, p_password text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare a account; nm text := trim(p_username); ip text := rocky_private.client_ip(); err text := rocky_private.valid_name(trim(p_username)); tok text;
begin
  if err is not null then return json_build_object('error', err); end if;
  if p_password is null or length(p_password) < 4 or length(p_password) > 100 then return json_build_object('error', 'Password must be 4-100 characters.'); end if;
  if rocky_private.ip_banned(ip) then return json_build_object('banned', true, 'error', 'This network has been blocked.'); end if;
  if rocky_private.pw_blocked(p_password) then return json_build_object('error', 'That password is not allowed. Choose a different one.'); end if;
  if exists (select 1 from account where username = nm) then return json_build_object('error', 'That username is already taken.'); end if;
  tok := encode(gen_random_bytes(24), 'hex');
  begin
    insert into account (username, password, coins, bgs, nameplates, token)
    values (nm, crypt(p_password, gen_salt('bf')), 0,
      jsonb_build_object('owned', jsonb_build_array('default'), 'active', 'default', 'lastSpin', null, 'ip', ip),
      jsonb_build_object('owned', jsonb_build_array('classic'), 'active', 'classic'), tok)
    returning * into a;
  exception when unique_violation then
    return json_build_object('error', 'That username is already taken.');
  end;
  if rocky_private.has_blocked(nm) then
    perform rocky_private.ban(a.id, 'blocked username');
    return json_build_object('banned', true, 'error', 'This account is banned.');
  end if;
  return json_build_object('ok', true, 'token', tok, 'row', rocky_private.row_json(a));
end $$;

create or replace function public.rocky_login(p_username text, p_password text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare a account; ip text := rocky_private.client_ip();
begin
  if rocky_private.ip_banned(ip) then return json_build_object('banned', true, 'error', 'This network has been blocked.'); end if;
  select * into a from account where username = trim(p_username) and username not like 'ip:%';
  if a.id is null then return json_build_object('error', 'Wrong username or password.'); end if;
  if a.locked_until is not null and a.locked_until > now() then return json_build_object('error', 'Too many wrong tries. Wait a few minutes.'); end if;
  if p_password is null or a.password <> crypt(p_password, a.password) then
    update account set fails = case when fails >= 7 then 0 else fails + 1 end,
      locked_until = case when fails >= 7 then now() + interval '5 minutes' else locked_until end where id = a.id;
    return json_build_object('error', 'Wrong username or password.');
  end if;
  if rocky_private.is_banned(a) then return json_build_object('banned', true, 'error', 'This account is banned.'); end if;
  if rocky_private.has_blocked(a.username) or rocky_private.pw_blocked(p_password) or rocky_private.coins_blocked(a.coins) then
    perform rocky_private.ban(a.id, 'blocked by admin rules');
    return json_build_object('banned', true, 'error', 'This account is banned.');
  end if;
  update account set fails = 0, locked_until = null, token = coalesce(token, encode(gen_random_bytes(24), 'hex')),
    bgs = coalesce(bgs, '{}'::jsonb) || case when ip is null then '{}'::jsonb else jsonb_build_object('ip', ip) end
  where id = a.id returning * into a;
  return json_build_object('ok', true, 'token', a.token, 'row', rocky_private.row_json(a));
end $$;

create or replace function public.rocky_status(p_id bigint, p_token text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare a account; ip text := rocky_private.client_ip();
begin
  select * into a from account where id = p_id and token is not null and token = p_token;
  if a.id is null then return json_build_object('state', 'gone'); end if;
  if rocky_private.is_banned(a) then return json_build_object('state', 'banned'); end if;
  if rocky_private.ip_banned(ip) then return json_build_object('state', 'ip_banned'); end if;
  if rocky_private.has_blocked(a.username) or rocky_private.coins_blocked(a.coins) then
    perform rocky_private.ban(a.id, 'blocked by admin rules');
    return json_build_object('state', 'banned');
  end if;
  if ip is not null and coalesce(a.bgs ->> 'ip', '') <> ip then
    update account set bgs = coalesce(bgs, '{}'::jsonb) || jsonb_build_object('ip', ip) where id = a.id returning * into a;
  end if;
  return json_build_object('state', 'ok', 'row', rocky_private.row_json(a));
end $$;

create or replace function public.rocky_save(p_id bigint, p_token text, p_coins bigint, p_bgs jsonb, p_nameplates jsonb) returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  a account; ip text := rocky_private.client_ip(); old jsonb;
  max_coins constant bigint := 2000000000;
  budget numeric; spin_bonus int := 0; ls text; old_ls text; gain bigint; new_coins bigint;
  bg_owned jsonb; bg_active text; np_owned jsonb; np_active text; cost bigint;
  old_bg jsonb; old_np jsonb;
begin
  select * into a from account where id = p_id and token is not null and token = p_token for update;
  if a.id is null then return json_build_object('state', 'gone'); end if;
  if rocky_private.is_banned(a) then return json_build_object('state', 'banned'); end if;
  if jsonb_typeof(p_bgs) is distinct from 'object' then p_bgs := '{}'::jsonb; end if;
  if jsonb_typeof(p_nameplates) is distinct from 'object' then p_nameplates := '{}'::jsonb; end if;
  old := coalesce(a.bgs, '{}'::jsonb);
  old_ls := coalesce(old ->> 'lastSpin', '');
  ls := p_bgs ->> 'lastSpin';
  if ls ~ '^\d{4}-\d{2}-\d{2}$' and ls between (current_date - 1)::text and (current_date + 1)::text and ls > old_ls then
    spin_bonus := 100;
  else
    ls := nullif(old_ls, '');
  end if;
  budget := least(300, a.gain_budget + extract(epoch from now() - a.last_save));
  gain := least(greatest(coalesce(p_coins, 0) - a.coins, 0), floor(budget)::bigint + spin_bonus);
  new_coins := case when coalesce(p_coins, 0) <= a.coins then greatest(coalesce(p_coins, 0), 0) else a.coins + gain end;
  new_coins := least(new_coins, max_coins);

  bg_owned := rocky_private.owned_list('background', p_bgs -> 'owned', 'default');
  np_owned := rocky_private.owned_list('nameplate', p_nameplates -> 'owned', 'classic');
  old_bg := rocky_private.owned_list('background', old -> 'owned', 'default');
  old_np := rocky_private.owned_list('nameplate', a.nameplates -> 'owned', 'classic');
  select coalesce(sum(price), 0) into cost from rocky_prices
  where (kind = 'background' and bg_owned ? item_id and not old_bg ? item_id)
     or (kind = 'nameplate' and np_owned ? item_id and not old_np ? item_id);
  if cost > 0 and new_coins > a.coins - cost + gain then
    bg_owned := old_bg;
    np_owned := old_np;
  end if;
  bg_active := case when bg_owned ? coalesce(p_bgs ->> 'active', '') then p_bgs ->> 'active' else 'default' end;
  np_active := case when np_owned ? coalesce(p_nameplates ->> 'active', '') then p_nameplates ->> 'active' else 'classic' end;

  update account set coins = new_coins,
    bgs = old || jsonb_build_object('owned', bg_owned, 'active', bg_active, 'lastSpin', ls) || case when ip is null then '{}'::jsonb else jsonb_build_object('ip', ip) end,
    nameplates = jsonb_build_object('owned', np_owned, 'active', np_active),
    gain_budget = budget - greatest(gain - spin_bonus, 0), last_save = now()
  where id = a.id returning * into a;
  if rocky_private.coins_blocked(a.coins) then
    perform rocky_private.ban(a.id, 'blocked coin amount');
    return json_build_object('state', 'banned');
  end if;
  return json_build_object('state', 'ok', 'row', rocky_private.row_json(a));
end $$;

create or replace function public.rocky_play(p_id bigint, p_token text, p_game text, p_amount bigint, p_choice text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  a account; won boolean; outcome text; mult int; net bigint; roll int;
  max_coins constant bigint := 2000000000;
begin
  select * into a from account where id = p_id and token is not null and token = p_token for update;
  if a.id is null then return json_build_object('state', 'gone'); end if;
  if rocky_private.is_banned(a) then return json_build_object('state', 'banned'); end if;
  if p_amount is null or p_amount < 1 then return json_build_object('error', 'Enter a whole-number wager greater than zero.'); end if;
  if p_amount > a.coins then return json_build_object('error', 'You do not have enough coins for that wager.'); end if;
  if p_game = 'coin' then
    if p_choice not in ('heads', 'tails') then return json_build_object('error', 'Choose heads or tails before playing.'); end if;
    outcome := case when random() < 0.5 then 'heads' else 'tails' end; won := outcome = p_choice; mult := 1;
  elsif p_game = 'wager' then
    won := random() < 0.5; outcome := null; mult := 1;
  elsif p_game = 'seven' then
    roll := floor(random() * 6)::int + floor(random() * 6)::int + 2; outcome := roll::text; won := roll = 7; mult := 5;
  elsif p_game = 'wheel' then
    roll := floor(random() * 8)::int; outcome := roll::text; won := roll = 0; mult := 7;
  else
    return json_build_object('error', 'Choose a valid game.');
  end if;
  net := case when won then p_amount * mult else -p_amount end;
  if a.coins + net > max_coins then return json_build_object('error', 'That win would exceed your wallet limit. Try a smaller wager.'); end if;
  update account set coins = coins + net where id = a.id returning * into a;
  if rocky_private.coins_blocked(a.coins) then
    perform rocky_private.ban(a.id, 'blocked coin amount');
    return json_build_object('state', 'banned');
  end if;
  return json_build_object('state', 'ok', 'outcome', outcome, 'won', won, 'net', net, 'balance', a.coins);
end $$;

create or replace function public.rocky_rename(p_id bigint, p_token text, p_password text, p_new text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare a account; nm text := trim(p_new); err text := rocky_private.valid_name(trim(p_new));
begin
  select * into a from account where id = p_id and token is not null and token = p_token for update;
  if a.id is null then return json_build_object('state', 'gone'); end if;
  if rocky_private.is_banned(a) then return json_build_object('state', 'banned'); end if;
  if a.locked_until is not null and a.locked_until > now() then return json_build_object('error', 'Too many wrong tries. Wait a few minutes.'); end if;
  if p_password is null or a.password <> crypt(p_password, a.password) then
    update account set fails = case when fails >= 7 then 0 else fails + 1 end,
      locked_until = case when fails >= 7 then now() + interval '5 minutes' else locked_until end where id = a.id;
    return json_build_object('error', 'Wrong password.');
  end if;
  if err is not null then return json_build_object('error', err); end if;
  if nm = a.username then return json_build_object('error', 'That is already your username.'); end if;
  if exists (select 1 from account where username = nm) then return json_build_object('error', 'That username is already taken.'); end if;
  if rocky_private.has_blocked(nm) then
    perform rocky_private.ban(a.id, 'blocked username');
    return json_build_object('state', 'banned');
  end if;
  begin
    update account set username = nm, fails = 0 where id = a.id returning * into a;
  exception when unique_violation then
    return json_build_object('error', 'That username is already taken.');
  end;
  return json_build_object('state', 'ok', 'username', a.username);
end $$;

-- Admin functions (every call needs the admin password) -----------------------

create or replace function public.rocky_admin_list(p_admin text) returns json language plpgsql security definer set search_path = public as $$
begin
  if not rocky_private.admin_ok(p_admin) then return json_build_object('error', 'Wrong admin password.'); end if;
  return json_build_object('ok', true, 'accounts', (
    select coalesce(json_agg(json_build_object('id', id, 'username', username, 'coins', coins, 'bgs', bgs) order by coins desc, id), '[]'::json) from account));
end $$;

create or replace function public.rocky_admin_set(p_admin text, p_id bigint, p_username text, p_coins bigint) returns json language plpgsql security definer set search_path = public as $$
declare nm text := trim(p_username); err text;
begin
  if not rocky_private.admin_ok(p_admin) then return json_build_object('error', 'Wrong admin password.'); end if;
  if p_username is not null then
    err := rocky_private.valid_name(nm);
    if err is not null then return json_build_object('error', err); end if;
    if exists (select 1 from account where username = nm and id <> p_id) then return json_build_object('error', 'That username is already taken.'); end if;
    update account set username = nm where id = p_id;
  end if;
  if p_coins is not null then
    if p_coins < 0 or p_coins > 2000000000 then return json_build_object('error', 'Coins must be 0 to 2,000,000,000.'); end if;
    update account set coins = p_coins where id = p_id;
  end if;
  return json_build_object('ok', true);
end $$;

create or replace function public.rocky_admin_ban(p_admin text, p_id bigint) returns json language plpgsql security definer set search_path = public as $$
begin
  if not rocky_private.admin_ok(p_admin) then return json_build_object('error', 'Wrong admin password.'); end if;
  perform rocky_private.ban(p_id, 'admin');
  return json_build_object('ok', true);
end $$;

create or replace function public.rocky_admin_delete(p_admin text, p_id bigint) returns json language plpgsql security definer set search_path = public as $$
begin
  if not rocky_private.admin_ok(p_admin) then return json_build_object('error', 'Wrong admin password.'); end if;
  delete from account where id = p_id;
  return json_build_object('ok', true);
end $$;

create or replace function public.rocky_admin_ban_ip(p_admin text, p_ip text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare ip text := trim(p_ip);
begin
  if not rocky_private.admin_ok(p_admin) then return json_build_object('error', 'Wrong admin password.'); end if;
  if ip is null or ip !~ '^[0-9a-fA-F:.]{3,45}$' then return json_build_object('error', 'That does not look like an IP address.'); end if;
  if exists (select 1 from account where username = 'ip:' || ip) then return json_build_object('error', 'That IP is already banned.'); end if;
  insert into account (username, password, coins, bgs, nameplates)
  values ('ip:' || ip, crypt(encode(gen_random_bytes(18), 'hex'), gen_salt('bf')), 0, jsonb_build_object('banned', true, 'ipBan', true), '{}'::jsonb);
  return json_build_object('ok', true);
end $$;

create or replace function public.rocky_admin_words_get(p_admin text) returns json language plpgsql security definer set search_path = public as $$
begin
  if not rocky_private.admin_ok(p_admin) then return json_build_object('error', 'Wrong admin password.'); end if;
  return json_build_object('ok', true, 'words', coalesce((select value from rocky_settings where key = 'blocked_words'), '[]'::jsonb));
end $$;

create or replace function public.rocky_admin_words_set(p_admin text, p_words jsonb) returns json language plpgsql security definer set search_path = public as $$
begin
  if not rocky_private.admin_ok(p_admin) then return json_build_object('error', 'Wrong admin password.'); end if;
  if jsonb_typeof(p_words) is distinct from 'array' or jsonb_array_length(p_words) > 500 then return json_build_object('error', 'Send a list of up to 500 words.'); end if;
  insert into rocky_settings (key, value) values ('blocked_words', p_words) on conflict (key) do update set value = excluded.value;
  return json_build_object('ok', true);
end $$;

create or replace function public.rocky_admin_list_get(p_admin text, p_key text) returns json language plpgsql security definer set search_path = public as $$
begin
  if not rocky_private.admin_ok(p_admin) then return json_build_object('error', 'Wrong admin password.'); end if;
  if p_key not in ('blocked_words', 'blocked_passwords', 'blocked_coins') then return json_build_object('error', 'Unknown list.'); end if;
  return json_build_object('ok', true, 'values', coalesce((select value from rocky_settings where key = p_key), '[]'::jsonb));
end $$;

create or replace function public.rocky_admin_list_set(p_admin text, p_key text, p_values jsonb) returns json language plpgsql security definer set search_path = public as $$
begin
  if not rocky_private.admin_ok(p_admin) then return json_build_object('error', 'Wrong admin password.'); end if;
  if p_key not in ('blocked_words', 'blocked_passwords', 'blocked_coins') then return json_build_object('error', 'Unknown list.'); end if;
  if jsonb_typeof(p_values) is distinct from 'array' or jsonb_array_length(p_values) > 500 then return json_build_object('error', 'Send a list of up to 500 items.'); end if;
  if p_key = 'blocked_coins' and exists (select 1 from jsonb_array_elements_text(p_values) w where w !~ '^[0-9]{1,10}$') then
    return json_build_object('error', 'Coin amounts must be whole numbers.');
  end if;
  insert into rocky_settings (key, value) values (p_key, p_values) on conflict (key) do update set value = excluded.value;
  return json_build_object('ok', true);
end $$;

create or replace function public.rocky_admin_scan(p_admin text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare r record; n int := 0;
begin
  if not rocky_private.admin_ok(p_admin) then return json_build_object('error', 'Wrong admin password.'); end if;
  for r in select id from account a
    where username not like 'ip:%' and coalesce(bgs ->> 'banned', '') <> 'true'
      and (rocky_private.has_blocked(username) or rocky_private.coins_blocked(coins)
        or exists (select 1 from rocky_settings s, jsonb_array_elements_text(s.value) w
                   where s.key = 'blocked_passwords' and a.password = crypt(w, a.password))
        or exists (select 1 from rocky_settings s, jsonb_array_elements_text(s.value) w
                   where s.key = 'blocked_passwords' and a.password = crypt(lower(w), a.password)))
  loop
    perform rocky_private.ban(r.id, 'blocked by admin rules');
    n := n + 1;
  end loop;
  return json_build_object('ok', true, 'banned', n);
end $$;

-- STEP 3: lock the tables and open only the functions above ------------------

alter table public.account enable row level security;
alter table public.rocky_settings enable row level security;
alter table public.rocky_prices enable row level security;
revoke all on table public.account from anon, authenticated;
revoke all on table public.rocky_settings from anon, authenticated;
revoke all on table public.rocky_prices from anon, authenticated;

do $$
declare r record;
begin
  for r in select oid::regprocedure as sig from pg_proc where pronamespace = 'public'::regnamespace and proname like 'rocky\_%' loop
    execute format('revoke all on function %s from public', r.sig);
    execute format('grant execute on function %s to anon, authenticated', r.sig);
  end loop;
end $$;
