-- Short-lived recovery grants are issued only by the connected management tools.
-- No anonymous database access and no plaintext device key are stored.
create table if not exists public.cgu_access_recovery(
 token_hash text primary key check(length(token_hash)=64),
 expected_access_hash text not null,
 expires_at timestamptz not null,
 consumed_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.cgu_access_recovery enable row level security;
revoke all on public.cgu_access_recovery from public,anon,authenticated;
grant all on public.cgu_access_recovery to service_role;
create or replace function public.cgu_redeem_access(p_token_hash text,p_new_hash text) returns boolean
language plpgsql security invoker set search_path=public as $$
declare old_hash text; grant_row public.cgu_access_recovery;
begin
 if p_token_hash is null or p_new_hash is null or p_new_hash !~ '^[a-f0-9]{64}$' then return false;end if;
 -- Reject unknown/expired grants before locking the shared credential.
 select * into grant_row from public.cgu_access_recovery where token_hash=p_token_hash;
 if grant_row.token_hash is null or grant_row.consumed_at is not null or grant_row.expires_at<=now() then return false;end if;
 -- Serialize valid changes, then verify again under row locks.
 select access_key_hash into old_hash from public.app_config where id=1 for update;
 select * into grant_row from public.cgu_access_recovery where token_hash=p_token_hash for update;
 if grant_row.token_hash is null or grant_row.consumed_at is not null or grant_row.expires_at<=now() or grant_row.expected_access_hash<>old_hash then return false;end if;
 if p_new_hash=old_hash then return false;end if;
 update public.app_config set access_key_hash=p_new_hash where id=1;
 update public.cgu_access_recovery set consumed_at=now() where consumed_at is null;
 return true;
end;$$;
revoke all on function public.cgu_redeem_access(text,text) from public,anon,authenticated;
grant execute on function public.cgu_redeem_access(text,text) to service_role;
