-- Rocky Games update: blocked passwords and blocked coin amounts.
-- Run this once in the Supabase SQL Editor. It does not touch your admin password.

insert into public.rocky_settings (key, value) values ('blocked_passwords', '[]'::jsonb), ('blocked_coins', '[]'::jsonb) on conflict (key) do nothing;

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

drop function if exists public.rocky_admin_scan(text);
create or replace function public.rocky_admin_scan(p_admin text, p_kind text default 'all') returns json language plpgsql security definer set search_path = public, extensions as $$
declare r record; n int := 0;
begin
  if not rocky_private.admin_ok(p_admin) then return json_build_object('error', 'Wrong admin password.'); end if;
  for r in select id from account a
    where username not like 'ip:%' and coalesce(bgs ->> 'banned', '') <> 'true'
      and ((p_kind in ('all', 'words') and rocky_private.has_blocked(username))
        or (p_kind in ('all', 'coins') and rocky_private.coins_blocked(coins))
        or (p_kind in ('all', 'passwords') and (
          exists (select 1 from rocky_settings s, jsonb_array_elements_text(s.value) w
                  where s.key = 'blocked_passwords' and a.password = crypt(w, a.password))
          or exists (select 1 from rocky_settings s, jsonb_array_elements_text(s.value) w
                  where s.key = 'blocked_passwords' and a.password = crypt(lower(w), a.password)))))
  loop
    perform rocky_private.ban(r.id, 'blocked by admin rules');
    n := n + 1;
  end loop;
  return json_build_object('ok', true, 'banned', n);
end $$;

do $$
declare r record;
begin
  for r in select oid::regprocedure as sig from pg_proc where pronamespace = 'public'::regnamespace and proname like 'rocky\_%' loop
    execute format('revoke all on function %s from public', r.sig);
    execute format('grant execute on function %s to anon, authenticated', r.sig);
  end loop;
end $$;
