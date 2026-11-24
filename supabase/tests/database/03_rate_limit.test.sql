-- Rate limit for public forms: counting, windows, keys and who may call it.
-- Run: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- ── Counting (as postgres) ──────────────────────────────────────────────────
select ok(public.consume_rate_limit('booking:ip-a', 3, 3600), '1st hit is allowed');
select ok(public.consume_rate_limit('booking:ip-a', 3, 3600), '2nd hit is allowed');
select ok(public.consume_rate_limit('booking:ip-a', 3, 3600), '3rd hit is allowed');
select ok(not public.consume_rate_limit('booking:ip-a', 3, 3600), '4th hit within the window is refused');
select is((select count(*)::int from private.rate_limit_hits where key = 'booking:ip-a'), 3,
  'refused hits are not recorded');
select ok(public.consume_rate_limit('booking:ip-b', 3, 3600), 'another key has its own budget');

-- Hits outside the window no longer count.
update private.rate_limit_hits set hit_at = now() - interval '2 hours' where key = 'booking:ip-a';
select ok(public.consume_rate_limit('booking:ip-a', 3, 3600), 'old hits fall out of the window');

select throws_ok($$ select public.consume_rate_limit('', 3, 3600) $$, '22023', null, 'empty key is rejected');

-- ── Privileges ──────────────────────────────────────────────────────────────
set local role anon;
select throws_ok($$ select public.consume_rate_limit('booking:ip-c', 3, 3600) $$, '42501', null,
  'visitors cannot call the rate limiter');
reset role;

set local role authenticated;
select throws_ok($$ select count(*) from private.rate_limit_hits $$, '42501', null,
  'signed-in users cannot read the counters');
reset role;

select * from finish();
rollback;
