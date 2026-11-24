-- ─────────────────────────────────────────────────────────────────────────────
-- Baltic Nuoma · 07 · Rate limit for public forms (booking requests)
--
-- Serverless functions have no shared memory, so the limit lives in Postgres.
-- The server calls `consume_rate_limit(key, max, window)` with the service role
-- before inserting a booking; the key is a salted hash of the visitor's IP —
-- never the raw address. Hits older than one day are purged on every call.
-- Safe to run twice (owners apply it by hand in the SQL Editor).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists private.rate_limit_hits (
  id      bigint generated always as identity primary key,
  key     text not null check (length(key) between 1 and 200),
  hit_at  timestamptz not null default now()
);
comment on table private.rate_limit_hits is 'Rate-limit counters (hashed keys only). Written by public.consume_rate_limit().';
create index if not exists rate_limit_hits_key_idx on private.rate_limit_hits (key, hit_at);
create index if not exists rate_limit_hits_hit_at_idx on private.rate_limit_hits (hit_at);

-- Not exposed through the API (private schema); RLS on with no policies as a second lock.
alter table private.rate_limit_hits enable row level security;

/**
 * Records one hit for `p_key` and returns true while the key has made fewer than
 * `p_max` hits in the last `p_window_seconds`; returns false (and records nothing)
 * once the limit is reached. Concurrent calls for the same key are serialized.
 */
create or replace function public.consume_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  if p_key is null or length(p_key) not between 1 and 200
     or p_max is null or p_max not between 1 and 10000
     or p_window_seconds is null or p_window_seconds not between 1 and 86400 then
    raise exception 'consume_rate_limit: invalid arguments' using errcode = 'invalid_parameter_value';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('rate_limit:' || p_key, 0));

  delete from private.rate_limit_hits where hit_at < now() - interval '1 day';

  select count(*) into v_hits
  from private.rate_limit_hits
  where key = p_key and hit_at > now() - make_interval(secs => p_window_seconds);

  if v_hits >= p_max then
    return false;
  end if;

  insert into private.rate_limit_hits (key) values (p_key);
  return true;
end;
$$;
comment on function public.consume_rate_limit(text, integer, integer) is 'Server-only (service role) rate limiter for public forms.';

revoke execute on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

select 'Rate limit ready' as status;
