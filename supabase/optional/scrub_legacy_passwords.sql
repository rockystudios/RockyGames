-- OPTIONAL and DESTRUCTIVE: not part of the migrations and never run automatically.
-- Run it only after (1) taking a backup and (2) players have had time to sign in once so
-- their old accounts were claimed into Supabase Auth (they log in with the old password).
-- It permanently erases the plaintext passwords still stored in the legacy public.account table.
-- Unclaimed legacy accounts can no longer be claimed afterwards.

-- Preview: how many legacy accounts have not been claimed yet.
select count(*) as unclaimed
from public.account a
where a.username not like 'ip:%' and a.username <> 'config:blocked-words'
  and not exists (select 1 from public.profiles p where p.legacy_id = a.id);

-- Destructive step (uncomment to run):
-- update public.account set password = '';
-- revoke all on public.account from service_role;
