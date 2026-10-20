-- Idempotent, non-destructive schema; run as project owner. No existing codes are reset.
begin;
create table if not exists public.access_codes (
 id uuid primary key default gen_random_uuid(), code_hash text unique not null,
 code_suffix text not null, status text not null default 'unused' check(status in ('unused','activated','disabled')),
 created_at timestamptz not null default now(), activated_at timestamptz, session_id uuid unique, report jsonb
);
alter table public.access_codes add column if not exists recovery_hash text;
alter table public.access_codes add column if not exists recovery_expires timestamptz;
alter table public.access_codes add column if not exists recovery_used boolean not null default false;
create unique index if not exists access_codes_recovery_idx on public.access_codes(recovery_hash) where recovery_hash is not null;
create index if not exists access_codes_session_idx on public.access_codes(session_id);
alter table public.access_codes enable row level security;
revoke all on public.access_codes from public,anon,authenticated;
grant select,insert,update,delete on public.access_codes to service_role;
create or replace function public.activate_quiz_code(p_hash text,p_session uuid)
returns table(result text) language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
 if p_session is null or p_hash is null then return query select 'invalid'::text;return;end if;
 update public.access_codes set status='activated',activated_at=now(),session_id=p_session
 where code_hash=p_hash and status='unused' returning id into v_id;
 if v_id is not null then return query select 'ok'::text;
 elsif exists(select 1 from public.access_codes where code_hash=p_hash and status='activated' and session_id=p_session)
 then return query select 'ok'::text;
 else return query select 'invalid'::text;end if;
end $$;
create table if not exists public.quiz_request_limits (key text primary key, hits integer not null, expires_at timestamptz not null);
create index if not exists quiz_request_limits_expiry_idx on public.quiz_request_limits(expires_at);
alter table public.quiz_request_limits enable row level security;
revoke all on public.quiz_request_limits from public,anon,authenticated;
grant select,insert,update,delete on public.quiz_request_limits to service_role;
create or replace function public.quiz_rate_limit(p_key text,p_limit integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_hits integer;
begin
 if p_limit<1 or p_seconds<1 or length(p_key)>160 then return false;end if;
 delete from public.quiz_request_limits where expires_at<now()-interval '1 day';
 insert into public.quiz_request_limits as t(key,hits,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set hits=case when t.expires_at<=now() then 1 else least(t.hits+1,p_limit+1) end,
 expires_at=case when t.expires_at<=now() then now()+make_interval(secs=>p_seconds) else t.expires_at end
 returning hits into v_hits;
 return v_hits<=p_limit;
end $$;
create or replace function public.recover_quiz_access(p_hash text,p_session uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
 if p_session is null then return false;end if;
 update public.access_codes set session_id=p_session,recovery_used=true
 where recovery_hash=p_hash and recovery_expires>now() and status='activated'
 and (recovery_used=false or session_id=p_session) returning id into v_id;
 return v_id is not null;
end $$;
revoke all on function public.activate_quiz_code(text,uuid) from public,anon,authenticated;
revoke all on function public.quiz_rate_limit(text,integer,integer) from public,anon,authenticated;
revoke all on function public.recover_quiz_access(text,uuid) from public,anon,authenticated;
grant execute on function public.activate_quiz_code(text,uuid) to service_role;
grant execute on function public.quiz_rate_limit(text,integer,integer) to service_role;
grant execute on function public.recover_quiz_access(text,uuid) to service_role;
commit;
